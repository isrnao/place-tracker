import { SessionService } from "./session.service";
import { requireAuth, requireGuest, checkAuth } from "./auth.middleware";

/**
 * ローダーで認証が必要な場合に使用するヘルパー
 */
export async function withAuth<T>(
  request: Request,
  callback: (userId: string) => Promise<T>
): Promise<T> {
  const { userId, headers } = await requireAuth(request);
  
  const result = await callback(userId);
  
  // ヘッダーがある場合は、dataレスポンスに含める
  if (headers && typeof result === 'object' && result !== null) {
    const { data } = await import("react-router");
    return data(result, { headers }) as T;
  }
  
  return result;
}

/**
 * ローダーでゲストのみアクセス可能な場合に使用するヘルパー
 */
export async function withGuest<T>(
  request: Request,
  callback: () => Promise<T>
): Promise<T> {
  const { headers } = await requireGuest(request);
  
  const result = await callback();
  
  // ヘッダーがある場合は、dataレスポンスに含める
  if (headers && typeof result === 'object' && result !== null) {
    const { data } = await import("react-router");
    return data(result, { headers }) as T;
  }
  
  return result;
}

/**
 * ローダーで認証状態をチェックするが必須ではない場合に使用するヘルパー
 */
export async function withOptionalAuth<T>(
  request: Request,
  callback: (userId: string | null) => Promise<T>
): Promise<T> {
  const { userId, headers } = await checkAuth(request);
  
  const result = await callback(userId);
  
  // ヘッダーがある場合は、dataレスポンスに含める
  if (headers && typeof result === 'object' && result !== null) {
    const { data } = await import("react-router");
    return data(result, { headers }) as T;
  }
  
  return result;
}

/**
 * アクションで認証が必要な場合に使用するヘルパー
 */
export async function withAuthAction<T>(
  request: Request,
  callback: (userId: string) => Promise<T>
): Promise<T> {
  const { userId, headers } = await requireAuth(request);
  
  const result = await callback(userId);
  
  // ヘッダーがある場合は、dataレスポンスに含める
  if (headers && typeof result === 'object' && result !== null) {
    const { data } = await import("react-router");
    return data(result, { headers }) as T;
  }
  
  return result;
}

/**
 * セッション情報を含むレスポンスを作成するヘルパー
 */
export async function createSessionResponse<T>(
  request: Request,
  responseData: T,
  options?: { status?: number }
) {
  const { headers } = await checkAuth(request);
  const { data } = await import("react-router");
  
  return data(responseData, {
    status: options?.status || 200,
    headers: headers || undefined,
  });
}

/**
 * セッションエラーレスポンスを作成するヘルパー
 */
export async function createSessionErrorResponse(
  error: string,
  status: number = 401
) {
  const { data } = await import("react-router");
  return data(
    { error, code: 'SESSION_ERROR' },
    { status }
  );
}