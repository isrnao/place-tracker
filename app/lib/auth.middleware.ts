import { SessionService } from "./session.service";
import { 
  AuthErrorCode, 
  createAuthError, 
  handleAuthError, 
  isTimeoutError,
  isNetworkError,
  type AuthError 
} from "./auth.errors";

/**
 * 認証結果の型定義
 */
export interface AuthResult {
  userId: string | null;
  headers?: Headers;
  error?: AuthError;
  shouldRedirect?: boolean;
  isExpired?: boolean;
}

/**
 * 統一された認証チェック機能
 * 既存のgetUser関数を改善し、エラーハンドリングとタイムアウト処理を強化
 */
export async function getUser(request: Request): Promise<string | null> {
  try {
    // タイムアウト付きで認証チェックを実行
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10秒タイムアウト
    
    try {
      const authResult = await Promise.race([
        SessionService.validateAndRefreshSession(request),
        new Promise<never>((_, reject) => {
          controller.signal.addEventListener('abort', () => {
            reject(new Error('Authentication timeout'));
          });
        })
      ]);
      
      clearTimeout(timeoutId);
      return authResult.userId;
    } catch (error) {
      clearTimeout(timeoutId);
      
      if (isTimeoutError(error)) {
        console.warn('Authentication timeout:', error);
        return null;
      }
      
      if (isNetworkError(error)) {
        console.warn('Network error during authentication:', error);
        return null;
      }
      
      console.error('Authentication error:', error);
      return null;
    }
  } catch (error) {
    console.error('Failed to get user:', error);
    return null;
  }
}

/**
 * 強化された認証チェック（詳細な結果を返す）
 */
export async function authenticateUser(request: Request): Promise<AuthResult> {
  try {
    // タイムアウト付きで認証チェックを実行
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10秒タイムアウト
    
    try {
      const result = await Promise.race([
        SessionService.validateAndRefreshSession(request),
        new Promise<never>((_, reject) => {
          controller.signal.addEventListener('abort', () => {
            reject(createAuthError(AuthErrorCode.TIMEOUT_ERROR));
          });
        })
      ]);
      
      clearTimeout(timeoutId);
      
      return {
        userId: result.userId,
        headers: result.headers,
        shouldRedirect: result.shouldRedirect,
        isExpired: result.shouldRedirect && !result.userId
      };
    } catch (error) {
      clearTimeout(timeoutId);
      
      const authError = handleAuthError(error);
      return {
        userId: null,
        error: authError,
        shouldRedirect: true,
        isExpired: authError.code === AuthErrorCode.SESSION_EXPIRED
      };
    }
  } catch (error) {
    const authError = handleAuthError(error);
    return {
      userId: null,
      error: authError,
      shouldRedirect: true
    };
  }
}

/**
 * 認証が必要なルートで使用するミドルウェア
 * サーバーサイドでの認証状態確認とエラーハンドリングを強化
 */
export async function requireAuth(request: Request): Promise<{
  userId: string;
  headers?: Headers;
}> {
  const authResult = await authenticateUser(request);
  
  if (!authResult.userId || authResult.shouldRedirect) {
    // ログインページにリダイレクト（現在のURLを保存）
    const url = new URL(request.url);
    const redirectTo = url.pathname + url.search;
    const loginUrl = `/login?redirectTo=${encodeURIComponent(redirectTo)}`;
    
    // エラー情報をセッションに保存
    if (authResult.error) {
      try {
        const { getSession, commitSession } = await import("./sessions.server");
        const session = await getSession(request.headers.get("Cookie"));
        session.flash("error", authResult.error.message);
        
        const headers = new Headers(authResult.headers);
        headers.set("Set-Cookie", await commitSession(session));
        
        const { redirect } = await import("react-router");
        throw redirect(loginUrl, { headers });
      } catch (sessionError) {
        console.error("Failed to save error to session:", sessionError);
      }
    }
    
    // Dynamic import to avoid SSR issues
    const { redirect } = await import("react-router");
    throw redirect(loginUrl, authResult.headers ? { headers: authResult.headers } : undefined);
  }
  
  return { userId: authResult.userId, headers: authResult.headers };
}

/**
 * 未認証ユーザーのみアクセス可能なルートで使用するミドルウェア
 */
export async function requireGuest(request: Request): Promise<{
  headers?: Headers;
}> {
  const authResult = await authenticateUser(request);
  
  if (authResult.userId) {
    // メインページにリダイレクト
    const { redirect } = await import("react-router");
    throw redirect("/", authResult.headers ? { headers: authResult.headers } : undefined);
  }
  
  return { headers: authResult.headers };
}

/**
 * 認証状態をチェックするが、リダイレクトしないミドルウェア
 */
export async function checkAuth(request: Request): Promise<{
  userId: string | null;
  headers?: Headers;
  error?: AuthError;
}> {
  const authResult = await authenticateUser(request);
  
  return { 
    userId: authResult.userId, 
    headers: authResult.headers,
    error: authResult.error
  };
}

/**
 * セッションタイムアウトをチェックするミドルウェア
 * タイムアウト処理とセキュリティを向上
 */
export async function checkSessionTimeout(request: Request): Promise<{
  userId: string | null;
  headers?: Headers;
  isExpired?: boolean;
  error?: AuthError;
}> {
  const authResult = await authenticateUser(request);
  
  return { 
    userId: authResult.userId, 
    headers: authResult.headers, 
    isExpired: authResult.isExpired,
    error: authResult.error
  };
}

/**
 * 保護されたルートでの統一された認証チェックロジック
 * 複数のルートで共通して使用できる認証チェック
 */
export async function protectedRouteAuth(request: Request): Promise<{
  userId: string;
  headers?: Headers;
  authenticatedClient?: any;
}> {
  // 認証チェック
  const { userId, headers } = await requireAuth(request);
  
  // 認証されたSupabaseクライアントを取得
  try {
    const authenticatedClient = await SessionService.getAuthenticatedClient(request);
    
    return {
      userId,
      headers,
      authenticatedClient
    };
  } catch (error) {
    console.error("Failed to get authenticated client:", error);
    
    // クライアント取得に失敗した場合でも認証は成功しているので続行
    return {
      userId,
      headers
    };
  }
}

/**
 * ロールベースアクセス制御（RBAC）ミドルウェア
 */
export async function requireRole(request: Request, requiredRole: string): Promise<{
  userId: string;
  headers?: Headers;
}> {
  const { userId, headers } = await requireAuth(request);
  
  try {
    // セッションからロール情報を取得
    const { getSession } = await import("./sessions.server");
    const session = await getSession(request.headers.get("Cookie"));
    const roles = session.get("roles") as string[] || [];
    
    if (!roles.includes(requiredRole)) {
      const { redirect } = await import("react-router");
      throw redirect("/forbidden", headers ? { headers } : undefined);
    }
    
    return { userId, headers };
  } catch (error) {
    console.error("Role check failed:", error);
    const { redirect } = await import("react-router");
    throw redirect("/forbidden", headers ? { headers } : undefined);
  }
}

/**
 * API認証ミドルウェア（JSON レスポンス用）
 */
export async function requireAuthAPI(request: Request): Promise<{
  userId: string;
  headers?: Headers;
}> {
  const authResult = await authenticateUser(request);
  
  if (!authResult.userId || authResult.shouldRedirect) {
    const error = authResult.error || createAuthError(AuthErrorCode.SESSION_EXPIRED);
    
    throw new Response(JSON.stringify({
      error: error.code,
      message: error.message
    }), {
      status: 401,
      headers: {
        "Content-Type": "application/json",
        ...(authResult.headers && Object.fromEntries(authResult.headers.entries()))
      }
    });
  }
  
  return { userId: authResult.userId, headers: authResult.headers };
}

/**
 * ルートローダー用の統一認証ヘルパー
 * 認証チェック、エラーハンドリング、リダイレクト処理を統一
 */
export async function authenticateRoute(request: Request): Promise<{
  userId: string;
  headers?: Headers;
  authenticatedClient?: any;
}> {
  return await protectedRouteAuth(request);
}

/**
 * オプショナル認証ヘルパー（認証されていなくてもアクセス可能）
 */
export async function optionalAuth(request: Request): Promise<{
  userId: string | null;
  headers?: Headers;
  authenticatedClient?: any;
}> {
  const authResult = await authenticateUser(request);
  
  if (authResult.userId) {
    try {
      const authenticatedClient = await SessionService.getAuthenticatedClient(request);
      return {
        userId: authResult.userId,
        headers: authResult.headers,
        authenticatedClient
      };
    } catch (error) {
      console.error("Failed to get authenticated client:", error);
      return {
        userId: authResult.userId,
        headers: authResult.headers
      };
    }
  }
  
  return {
    userId: null,
    headers: authResult.headers
  };
}