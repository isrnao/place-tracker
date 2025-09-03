import { useState, useCallback } from 'react';
import {
  AuthErrorCode,
  handleAuthError,
  formatUserError,
  logAuthError,
  withTimeoutAndRetry,
  type AuthError,
  type RetryConfig,
} from './auth.errors';

/**
 * エラー状態の型定義
 */
export interface ErrorState {
  error: AuthError | null;
  isLoading: boolean;
  canRetry: boolean;
  retryCount: number;
}

/**
 * 認証エラーハンドリング用のReactフック
 */
export function useAuthError() {
  const [errorState, setErrorState] = useState<ErrorState>({
    error: null,
    isLoading: false,
    canRetry: false,
    retryCount: 0,
  });

  /**
   * エラーを設定
   */
  const setError = useCallback((error: any, context?: string) => {
    const authError = handleAuthError(error, context);
    const userError = formatUserError(authError);

    logAuthError(authError, context);

    setErrorState(prev => ({
      ...prev,
      error: authError,
      canRetry: userError.canRetry,
      isLoading: false,
    }));
  }, []);

  /**
   * エラーをクリア
   */
  const clearError = useCallback(() => {
    setErrorState({
      error: null,
      isLoading: false,
      canRetry: false,
      retryCount: 0,
    });
  }, []);

  /**
   * ローディング状態を設定
   */
  const setLoading = useCallback((loading: boolean) => {
    setErrorState(prev => ({
      ...prev,
      isLoading: loading,
    }));
  }, []);

  /**
   * 非同期操作を実行（エラーハンドリング付き）
   */
  const executeWithErrorHandling = useCallback(
    async <T>(
      operation: () => Promise<T>,
      context?: string,
      options?: {
        timeout?: number;
        retryConfig?: Partial<RetryConfig>;
        clearErrorOnStart?: boolean;
      }
    ): Promise<T | null> => {
      const {
        timeout = 10000,
        retryConfig = {},
        clearErrorOnStart = true,
      } = options || {};

      if (clearErrorOnStart) {
        clearError();
      }

      setLoading(true);

      try {
        const result = await withTimeoutAndRetry(
          operation,
          timeout,
          retryConfig,
          context
        );

        setLoading(false);
        return result;
      } catch (error) {
        setError(error, context);
        return null;
      }
    },
    [setError, clearError, setLoading]
  );

  /**
   * リトライ実行
   */
  const retry = useCallback(
    async <T>(
      operation: () => Promise<T>,
      context?: string
    ): Promise<T | null> => {
      if (!errorState.canRetry) {
        return null;
      }

      setErrorState(prev => ({
        ...prev,
        retryCount: prev.retryCount + 1,
        isLoading: true,
        error: null,
      }));

      try {
        const result = await operation();
        setErrorState(prev => ({
          ...prev,
          isLoading: false,
        }));
        return result;
      } catch (error) {
        setError(error, context);
        return null;
      }
    },
    [errorState.canRetry, setError]
  );

  /**
   * フォーマット済みのユーザーエラー情報を取得
   */
  const getUserError = useCallback(() => {
    if (!errorState.error) return null;
    return formatUserError(errorState.error);
  }, [errorState.error]);

  /**
   * 特定のエラーコードかどうかをチェック
   */
  const isErrorCode = useCallback(
    (code: AuthErrorCode) => {
      return errorState.error?.code === code;
    },
    [errorState.error]
  );

  return {
    // 状態
    error: errorState.error,
    isLoading: errorState.isLoading,
    canRetry: errorState.canRetry,
    retryCount: errorState.retryCount,

    // アクション
    setError,
    clearError,
    setLoading,
    executeWithErrorHandling,
    retry,

    // ヘルパー
    getUserError,
    isErrorCode,
  };
}

/**
 * エラー表示用のコンポーネントプロパティを生成
 */
export function useErrorDisplay() {
  const { error, getUserError, clearError, canRetry } = useAuthError();

  const errorDisplay = getUserError();

  return {
    hasError: !!error,
    errorTitle: errorDisplay?.title,
    errorMessage: errorDisplay?.message,
    errorAction: errorDisplay?.action,
    canRetry: errorDisplay?.canRetry || false,
    onDismiss: clearError,
  };
}

/**
 * フォーム用のエラーハンドリングフック
 */
export function useFormError() {
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const authError = useAuthError();

  /**
   * フィールドエラーを設定
   */
  const setFieldError = useCallback((field: string, message: string) => {
    setFieldErrors(prev => ({
      ...prev,
      [field]: message,
    }));
  }, []);

  /**
   * フィールドエラーをクリア
   */
  const clearFieldError = useCallback((field: string) => {
    setFieldErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[field];
      return newErrors;
    });
  }, []);

  /**
   * 全てのフィールドエラーをクリア
   */
  const clearAllFieldErrors = useCallback(() => {
    setFieldErrors({});
  }, []);

  /**
   * バリデーションエラーを処理
   */
  const handleValidationError = useCallback(
    (error: any) => {
      if (error?.details?.validationErrors) {
        const errors = error.details.validationErrors;
        Object.entries(errors).forEach(([field, message]) => {
          setFieldError(field, String(message));
        });
      } else {
        authError.setError(error, 'form_validation');
      }
    },
    [authError, setFieldError]
  );

  return {
    ...authError,
    fieldErrors,
    setFieldError,
    clearFieldError,
    clearAllFieldErrors,
    handleValidationError,
  };
}
