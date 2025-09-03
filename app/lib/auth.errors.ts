// 認証エラーの型定義
export interface AuthError {
  code: string;
  message: string;
  details?: Record<string, any>;
}

export enum AuthErrorCode {
  INVALID_CREDENTIALS = 'invalid_credentials',
  SESSION_EXPIRED = 'session_expired',
  NETWORK_ERROR = 'network_error',
  VALIDATION_ERROR = 'validation_error',
  OAUTH_ERROR = 'oauth_error',
  TOKEN_REFRESH_FAILED = 'token_refresh_failed',
  SESSION_SYNC_FAILED = 'session_sync_failed',
  TIMEOUT_ERROR = 'timeout_error',
}

// エラーメッセージの日本語翻訳
export const errorMessages: Record<string, string> = {
  [AuthErrorCode.INVALID_CREDENTIALS]:
    'メールアドレスまたはパスワードが正しくありません',
  [AuthErrorCode.SESSION_EXPIRED]:
    'セッションの有効期限が切れました。再度ログインしてください',
  [AuthErrorCode.NETWORK_ERROR]:
    'ネットワークエラーが発生しました。接続を確認してください',
  [AuthErrorCode.VALIDATION_ERROR]: '入力内容に誤りがあります',
  [AuthErrorCode.OAUTH_ERROR]: 'ソーシャルログインでエラーが発生しました',
  [AuthErrorCode.TOKEN_REFRESH_FAILED]:
    'セッションの更新に失敗しました。再度ログインしてください',
  [AuthErrorCode.SESSION_SYNC_FAILED]: 'セッションの同期に失敗しました',
  [AuthErrorCode.TIMEOUT_ERROR]:
    'リクエストがタイムアウトしました。再度お試しください',

  // Supabaseエラーメッセージの翻訳
  'Invalid login credentials':
    'メールアドレスまたはパスワードが正しくありません',
  'Email not confirmed':
    'メールアドレスが確認されていません。確認メールをご確認ください',
  'Too many requests':
    'リクエストが多すぎます。しばらく待ってから再度お試しください',
  'User not found': 'ユーザーが見つかりません',
  'Invalid email': 'メールアドレスの形式が正しくありません',
  'Password should be at least 6 characters':
    'パスワードは6文字以上で入力してください',
  'Unable to validate email address: invalid format':
    'メールアドレスの形式が正しくありません',
  signup_disabled: '新規登録は現在無効になっています',
  email_address_invalid: 'メールアドレスが無効です',
  password_too_short: 'パスワードが短すぎます',
  weak_password:
    'パスワードが弱すぎます。より強力なパスワードを設定してください',
  email_not_confirmed:
    'メールアドレスが確認されていません。確認メールをご確認ください',
  email_address_not_authorized:
    'このメールアドレスでの登録は許可されていません',
  email_rate_limit_exceeded:
    'メール送信の制限に達しました。しばらく待ってから再度お試しください',
};

/**
 * Supabaseエラーメッセージを日本語に翻訳
 */
export function translateSupabaseError(error?: string): string {
  if (!error) return '不明なエラーが発生しました';

  // 完全一致を最初にチェック
  if (errorMessages[error]) {
    return errorMessages[error];
  }

  // 部分一致をチェック
  for (const [key, value] of Object.entries(errorMessages)) {
    if (error.toLowerCase().includes(key.toLowerCase())) {
      return value;
    }
  }

  // ネットワークエラーの検出
  if (
    error.includes('fetch') ||
    error.includes('network') ||
    error.includes('timeout')
  ) {
    return errorMessages[AuthErrorCode.NETWORK_ERROR];
  }

  // デフォルトメッセージ
  return `エラーが発生しました: ${error}`;
}

/**
 * AuthErrorを作成するヘルパー関数
 */
export function createAuthError(
  code: AuthErrorCode,
  message?: string,
  details?: Record<string, any>
): AuthError {
  return {
    code,
    message: message || errorMessages[code] || '不明なエラーが発生しました',
    details,
  };
}

/**
 * エラーがタイムアウトエラーかどうかを判定
 */
export function isTimeoutError(error: any): boolean {
  return (
    error?.name === 'AbortError' ||
    error?.code === 'TIMEOUT' ||
    error?.message?.includes('timeout')
  );
}

/**
 * エラーがネットワークエラーかどうかを判定
 */
export function isNetworkError(error: any): boolean {
  return (
    error?.name === 'TypeError' ||
    error?.message?.includes('fetch') ||
    error?.message?.includes('network') ||
    !navigator.onLine
  );
}

/**
 * リトライ可能なエラーかどうかを判定
 */
export function isRetryableError(error: any): boolean {
  return (
    isNetworkError(error) ||
    isTimeoutError(error) ||
    error?.status === 429 || // Too Many Requests
    error?.status >= 500
  ); // Server errors
}

/**
 * エラーの重要度を判定
 */
export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

export function getErrorSeverity(error: AuthError): ErrorSeverity {
  switch (error.code) {
    case AuthErrorCode.NETWORK_ERROR:
    case AuthErrorCode.TIMEOUT_ERROR:
      return ErrorSeverity.MEDIUM;
    case AuthErrorCode.SESSION_EXPIRED:
    case AuthErrorCode.TOKEN_REFRESH_FAILED:
      return ErrorSeverity.HIGH;
    case AuthErrorCode.INVALID_CREDENTIALS:
    case AuthErrorCode.VALIDATION_ERROR:
      return ErrorSeverity.LOW;
    case AuthErrorCode.SESSION_SYNC_FAILED:
      return ErrorSeverity.CRITICAL;
    default:
      return ErrorSeverity.MEDIUM;
  }
}

/**
 * エラーに基づく推奨アクションを取得
 */
export function getErrorAction(error: AuthError): string {
  switch (error.code) {
    case AuthErrorCode.NETWORK_ERROR:
      return 'ネットワーク接続を確認してから再度お試しください';
    case AuthErrorCode.TIMEOUT_ERROR:
      return 'しばらく待ってから再度お試しください';
    case AuthErrorCode.SESSION_EXPIRED:
    case AuthErrorCode.TOKEN_REFRESH_FAILED:
      return '再度ログインしてください';
    case AuthErrorCode.INVALID_CREDENTIALS:
      return 'メールアドレスとパスワードを確認してください';
    case AuthErrorCode.VALIDATION_ERROR:
      return '入力内容を確認してください';
    case AuthErrorCode.OAUTH_ERROR:
      return 'ソーシャルログインを再度お試しください';
    default:
      return 'しばらく待ってから再度お試しください';
  }
}

/**
 * 統一されたエラーハンドリング（強化版）
 */
export function handleAuthError(error: any, context?: string): AuthError {
  // タイムアウトエラーの処理
  if (isTimeoutError(error)) {
    return createAuthError(AuthErrorCode.TIMEOUT_ERROR, undefined, {
      context,
      originalError: error,
    });
  }

  // ネットワークエラーの処理
  if (isNetworkError(error)) {
    return createAuthError(AuthErrorCode.NETWORK_ERROR, undefined, {
      context,
      originalError: error,
      isRetryable: true,
    });
  }

  // Supabaseエラーの処理
  if (error?.message) {
    const translatedMessage = translateSupabaseError(error.message);
    const errorCode = mapSupabaseErrorToCode(error.message);

    return {
      code: errorCode,
      message: translatedMessage,
      details: {
        context,
        originalError: error,
        isRetryable: isRetryableError(error),
      },
    };
  }

  // HTTPエラーの処理
  if (error?.status) {
    const errorCode = mapHttpStatusToCode(error.status);
    return createAuthError(
      errorCode,
      `HTTPエラー (${error.status}): ${error.statusText || '不明なエラー'}`,
      { context, originalError: error, status: error.status }
    );
  }

  // デフォルトエラー
  return createAuthError(
    AuthErrorCode.VALIDATION_ERROR,
    '不明なエラーが発生しました',
    { context, originalError: error }
  );
}

/**
 * SupabaseエラーメッセージをAuthErrorCodeにマッピング
 */
function mapSupabaseErrorToCode(errorMessage: string): AuthErrorCode {
  const message = errorMessage.toLowerCase();

  if (
    message.includes('invalid login credentials') ||
    message.includes('invalid email') ||
    message.includes('user not found')
  ) {
    return AuthErrorCode.INVALID_CREDENTIALS;
  }

  if (message.includes('email not confirmed')) {
    return AuthErrorCode.VALIDATION_ERROR;
  }

  if (message.includes('too many requests')) {
    return AuthErrorCode.NETWORK_ERROR;
  }

  if (
    message.includes('password') &&
    (message.includes('short') || message.includes('weak'))
  ) {
    return AuthErrorCode.VALIDATION_ERROR;
  }

  if (message.includes('session') || message.includes('token')) {
    return AuthErrorCode.SESSION_EXPIRED;
  }

  return AuthErrorCode.VALIDATION_ERROR;
}

/**
 * HTTPステータスコードをAuthErrorCodeにマッピング
 */
function mapHttpStatusToCode(status: number): AuthErrorCode {
  switch (status) {
    case 401:
      return AuthErrorCode.SESSION_EXPIRED;
    case 403:
      return AuthErrorCode.INVALID_CREDENTIALS;
    case 408:
    case 504:
      return AuthErrorCode.TIMEOUT_ERROR;
    case 429:
    case 500:
    case 502:
    case 503:
      return AuthErrorCode.NETWORK_ERROR;
    default:
      return AuthErrorCode.VALIDATION_ERROR;
  }
}
/**

 * リトライ設定
 */
export interface RetryConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  backoffFactor: number;
}

export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  baseDelay: 1000, // 1秒
  maxDelay: 10000, // 10秒
  backoffFactor: 2,
};

/**
 * 指数バックオフでリトライを実行
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  config: Partial<RetryConfig> = {},
  context?: string
): Promise<T> {
  const finalConfig = { ...DEFAULT_RETRY_CONFIG, ...config };
  let lastError: any;

  for (let attempt = 0; attempt <= finalConfig.maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;

      // 最後の試行の場合、またはリトライ不可能なエラーの場合は即座に失敗
      if (attempt === finalConfig.maxRetries || !isRetryableError(error)) {
        throw handleAuthError(error, context);
      }

      // 指数バックオフで待機
      const delay = Math.min(
        finalConfig.baseDelay * Math.pow(finalConfig.backoffFactor, attempt),
        finalConfig.maxDelay
      );

      console.warn(
        `Retry attempt ${attempt + 1}/${finalConfig.maxRetries} after ${delay}ms`,
        {
          context,
          error: error instanceof Error ? error.message : String(error),
        }
      );

      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw handleAuthError(lastError, context);
}

/**
 * タイムアウト付きでPromiseを実行
 */
export async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number = 10000,
  context?: string
): Promise<T> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const result = await Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        controller.signal.addEventListener('abort', () => {
          reject(
            createAuthError(
              AuthErrorCode.TIMEOUT_ERROR,
              `操作がタイムアウトしました (${timeoutMs}ms)`,
              { context, timeoutMs }
            )
          );
        });
      }),
    ]);

    clearTimeout(timeoutId);
    return result;
  } catch (error) {
    clearTimeout(timeoutId);
    throw handleAuthError(error, context);
  }
}

/**
 * タイムアウトとリトライを組み合わせた実行
 */
export async function withTimeoutAndRetry<T>(
  operation: () => Promise<T>,
  timeoutMs: number = 10000,
  retryConfig: Partial<RetryConfig> = {},
  context?: string
): Promise<T> {
  return withRetry(
    () => withTimeout(operation(), timeoutMs, context),
    retryConfig,
    context
  );
}

/**
 * エラーログ記録用のヘルパー
 */
export function logAuthError(error: AuthError, context?: string): void {
  const severity = getErrorSeverity(error);
  const logLevel =
    severity === ErrorSeverity.CRITICAL
      ? 'error'
      : severity === ErrorSeverity.HIGH
        ? 'warn'
        : 'info';

  console[logLevel]('Auth Error:', {
    code: error.code,
    message: error.message,
    context,
    severity,
    details: error.details,
    timestamp: new Date().toISOString(),
  });
}

/**
 * ユーザーフレンドリーなエラーメッセージを生成
 */
export function formatUserError(error: AuthError): {
  title: string;
  message: string;
  action: string;
  canRetry: boolean;
} {
  const severity = getErrorSeverity(error);
  const action = getErrorAction(error);
  const canRetry = error.details?.isRetryable === true;

  let title: string;
  switch (severity) {
    case ErrorSeverity.CRITICAL:
      title = 'システムエラー';
      break;
    case ErrorSeverity.HIGH:
      title = '認証エラー';
      break;
    case ErrorSeverity.MEDIUM:
      title = '接続エラー';
      break;
    default:
      title = 'エラー';
  }

  return {
    title,
    message: error.message,
    action,
    canRetry,
  };
}
