import type { Session } from '@supabase/supabase-js';
import { supabase } from '~/api/supabase.server';
import {
  getSession,
  commitSession,
  destroySession,
  isSessionValid,
  shouldRefreshSession,
  type SessionData,
} from './sessions.server';
import {
  AuthErrorCode,
  createAuthError,
  handleAuthError,
  withTimeoutAndRetry,
  logAuthError,
  type AuthError,
} from './auth.errors';

export class SessionService {
  /**
   * セッションからユーザーIDを取得
   */
  static async getUserId(request: Request): Promise<string | null> {
    try {
      return await withTimeoutAndRetry(
        async () => {
          const session = await getSession(request.headers.get('Cookie'));
          const sessionData = session.data as SessionData;

          if (!sessionData.userId || !isSessionValid(sessionData)) {
            return null;
          }

          return sessionData.userId;
        },
        5000, // 5秒タイムアウト
        { maxRetries: 2 },
        'getUserId'
      );
    } catch (error) {
      const authError = handleAuthError(error, 'getUserId');
      logAuthError(authError, 'getUserId');
      return null;
    }
  }

  /**
   * セッションを作成/更新
   */
  static async createSession(
    request: Request,
    supabaseSession: Session
  ): Promise<Headers> {
    const session = await getSession(request.headers.get('Cookie'));

    const sessionData: SessionData = {
      userId: supabaseSession.user.id,
      roles: supabaseSession.user.user_metadata?.roles || [],
      supabaseSession: {
        access_token: supabaseSession.access_token,
        refresh_token: supabaseSession.refresh_token,
        expires_at: supabaseSession.expires_at || 0,
      },
    };

    // セッションデータを設定
    session.set('userId', sessionData.userId);
    session.set('roles', sessionData.roles);
    session.set('supabaseSession', sessionData.supabaseSession);

    const headers = new Headers();
    headers.set('Set-Cookie', await commitSession(session));

    return headers;
  }

  /**
   * セッションを破棄
   */
  static async destroySession(request: Request): Promise<Headers> {
    const session = await getSession(request.headers.get('Cookie'));

    const headers = new Headers();
    headers.set('Set-Cookie', await destroySession(session));

    return headers;
  }

  /**
   * セッションを更新（リフレッシュトークンを使用）
   */
  static async refreshSession(request: Request): Promise<{
    headers: Headers;
    success: boolean;
    error?: AuthError;
  }> {
    try {
      return await withTimeoutAndRetry(
        async () => {
          const session = await getSession(request.headers.get('Cookie'));
          const sessionData = session.data as SessionData;

          if (!sessionData.supabaseSession?.refresh_token) {
            const error = createAuthError(
              AuthErrorCode.TOKEN_REFRESH_FAILED,
              'リフレッシュトークンが見つかりません'
            );
            return {
              headers: await this.destroySession(request),
              success: false,
              error,
            };
          }

          // Supabaseでセッションを更新
          const { data, error: supabaseError } =
            await supabase.auth.refreshSession({
              refresh_token: sessionData.supabaseSession.refresh_token,
            });

          if (supabaseError || !data.session) {
            const error = handleAuthError(supabaseError, 'refreshSession');
            return {
              headers: await this.destroySession(request),
              success: false,
              error,
            };
          }

          // 新しいセッションで更新
          const headers = await this.createSession(request, data.session);

          return {
            headers,
            success: true,
          };
        },
        10000, // 10秒タイムアウト
        { maxRetries: 2 },
        'refreshSession'
      );
    } catch (error) {
      const authError = handleAuthError(error, 'refreshSession');
      logAuthError(authError, 'refreshSession');

      return {
        headers: await this.destroySession(request),
        success: false,
        error: authError,
      };
    }
  }

  /**
   * セッションの有効性をチェックし、必要に応じて更新
   */
  static async validateAndRefreshSession(request: Request): Promise<{
    userId: string | null;
    headers?: Headers;
    shouldRedirect?: boolean;
    error?: AuthError;
  }> {
    try {
      return await withTimeoutAndRetry(
        async () => {
          const session = await getSession(request.headers.get('Cookie'));
          const sessionData = session.data as SessionData;

          if (!sessionData.userId) {
            return { userId: null, shouldRedirect: true };
          }

          // セッションが無効な場合
          if (!isSessionValid(sessionData)) {
            const refreshResult = await this.refreshSession(request);

            if (!refreshResult.success) {
              return {
                userId: null,
                headers: refreshResult.headers,
                shouldRedirect: true,
                error: refreshResult.error,
              };
            }

            return {
              userId: sessionData.userId,
              headers: refreshResult.headers,
            };
          }

          // セッションの更新が必要な場合
          if (shouldRefreshSession(sessionData)) {
            const refreshResult = await this.refreshSession(request);

            if (refreshResult.success) {
              return {
                userId: sessionData.userId,
                headers: refreshResult.headers,
              };
            } else {
              // リフレッシュに失敗したが、現在のセッションはまだ有効
              logAuthError(
                refreshResult.error ||
                  createAuthError(AuthErrorCode.TOKEN_REFRESH_FAILED),
                'validateAndRefreshSession'
              );
            }
          }

          return { userId: sessionData.userId };
        },
        15000, // 15秒タイムアウト
        { maxRetries: 1 }, // セッション検証は1回のリトライのみ
        'validateAndRefreshSession'
      );
    } catch (error) {
      const authError = handleAuthError(error, 'validateAndRefreshSession');
      logAuthError(authError, 'validateAndRefreshSession');

      return {
        userId: null,
        shouldRedirect: true,
        error: authError,
      };
    }
  }

  /**
   * 認証されたSupabaseクライアントを取得
   */
  static async getAuthenticatedClient(request: Request) {
    try {
      return await withTimeoutAndRetry(
        async () => {
          const session = await getSession(request.headers.get('Cookie'));
          const sessionData = session.data as SessionData;

          if (
            !sessionData.supabaseSession?.access_token ||
            !isSessionValid(sessionData)
          ) {
            throw createAuthError(
              AuthErrorCode.SESSION_EXPIRED,
              '認証されたクライアントを取得できません'
            );
          }

          const { data, error } = await supabase.auth.setSession({
            access_token: sessionData.supabaseSession.access_token,
            refresh_token: sessionData.supabaseSession.refresh_token,
          });

          if (error) {
            throw handleAuthError(error, 'getAuthenticatedClient');
          }

          return data;
        },
        5000, // 5秒タイムアウト
        { maxRetries: 1 },
        'getAuthenticatedClient'
      );
    } catch (error) {
      const authError = handleAuthError(error, 'getAuthenticatedClient');
      logAuthError(authError, 'getAuthenticatedClient');
      return null;
    }
  }
}
