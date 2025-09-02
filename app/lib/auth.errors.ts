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
  [AuthErrorCode.INVALID_CREDENTIALS]: 'メールアドレスまたはパスワードが正しくありません',
  [AuthErrorCode.SESSION_EXPIRED]: 'セッションの有効期限が切れました。再度ログインしてください',
  [AuthErrorCode.NETWORK_ERROR]: 'ネットワークエラーが発生しました。接続を確認してください',
  [AuthErrorCode.VALIDATION_ERROR]: '入力内容に誤りがあります',
  [AuthErrorCode.OAUTH_ERROR]: 'ソーシャルログインでエラーが発生しました',
  [AuthErrorCode.TOKEN_REFRESH_FAILED]: 'セッションの更新に失敗しました。再度ログインしてください',
  [AuthErrorCode.SESSION_SYNC_FAILED]: 'セッションの同期に失敗しました',
  [AuthErrorCode.TIMEOUT_ERROR]: 'リクエストがタイムアウトしました。再度お試しください',
  
  // Supabaseエラーメッセージの翻訳
  'Invalid login credentials': 'メールアドレスまたはパスワードが正しくありません',
  'Email not confirmed': 'メールアドレスが確認されていません。確認メールをご確認ください',
  'Too many requests': 'リクエストが多すぎます。しばらく待ってから再度お試しください',
  'User not found': 'ユーザーが見つかりません',
  'Invalid email': 'メールアドレスの形式が正しくありません',
  'Password should be at least 6 characters': 'パスワードは6文字以上で入力してください',
  'Unable to validate email address: invalid format': 'メールアドレスの形式が正しくありません',
  'signup_disabled': '新規登録は現在無効になっています',
  'email_address_invalid': 'メールアドレスが無効です',
  'password_too_short': 'パスワードが短すぎます',
  'weak_password': 'パスワードが弱すぎます。より強力なパスワードを設定してください',
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
  if (error.includes('fetch') || error.includes('network') || error.includes('timeout')) {
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
  return error?.name === 'AbortError' || 
         error?.code === 'TIMEOUT' ||
         error?.message?.includes('timeout');
}

/**
 * エラーがネットワークエラーかどうかを判定
 */
export function isNetworkError(error: any): boolean {
  return error?.name === 'TypeError' ||
         error?.message?.includes('fetch') ||
         error?.message?.includes('network') ||
         !navigator.onLine;
}

/**
 * 統一されたエラーハンドリング
 */
export function handleAuthError(error: any): AuthError {
  if (isTimeoutError(error)) {
    return createAuthError(AuthErrorCode.TIMEOUT_ERROR);
  }
  
  if (isNetworkError(error)) {
    return createAuthError(AuthErrorCode.NETWORK_ERROR);
  }
  
  if (error?.message) {
    const translatedMessage = translateSupabaseError(error.message);
    return {
      code: error.code || 'unknown_error',
      message: translatedMessage,
      details: error,
    };
  }
  
  return createAuthError(AuthErrorCode.VALIDATION_ERROR, '不明なエラーが発生しました');
}