import type { Session } from "@supabase/supabase-js";
import { supabase } from "~/api/supabase.server";
import { 
  getSession, 
  commitSession, 
  destroySession,
  isSessionValid,
  shouldRefreshSession,
  type SessionData 
} from "./sessions.server";

export class SessionService {
  /**
   * セッションからユーザーIDを取得
   */
  static async getUserId(request: Request): Promise<string | null> {
    try {
      const session = await getSession(request.headers.get("Cookie"));
      const sessionData = session.data as SessionData;
      
      if (!sessionData.userId || !isSessionValid(sessionData)) {
        return null;
      }
      
      return sessionData.userId;
    } catch (error) {
      console.error("Error getting user ID from session:", error);
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
    const session = await getSession(request.headers.get("Cookie"));
    
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
    session.set("userId", sessionData.userId);
    session.set("roles", sessionData.roles);
    session.set("supabaseSession", sessionData.supabaseSession);
    
    const headers = new Headers();
    headers.set("Set-Cookie", await commitSession(session));
    
    return headers;
  }

  /**
   * セッションを破棄
   */
  static async destroySession(request: Request): Promise<Headers> {
    const session = await getSession(request.headers.get("Cookie"));
    
    const headers = new Headers();
    headers.set("Set-Cookie", await destroySession(session));
    
    return headers;
  }

  /**
   * セッションを更新（リフレッシュトークンを使用）
   */
  static async refreshSession(request: Request): Promise<{
    headers: Headers;
    success: boolean;
    error?: string;
  }> {
    try {
      const session = await getSession(request.headers.get("Cookie"));
      const sessionData = session.data as SessionData;
      
      if (!sessionData.supabaseSession?.refresh_token) {
        return {
          headers: await this.destroySession(request),
          success: false,
          error: "No refresh token available",
        };
      }
      
      // Supabaseでセッションを更新
      const { data, error } = await supabase.auth.refreshSession({
        refresh_token: sessionData.supabaseSession.refresh_token,
      });
      
      if (error || !data.session) {
        return {
          headers: await this.destroySession(request),
          success: false,
          error: error?.message || "Failed to refresh session",
        };
      }
      
      // 新しいセッションで更新
      const headers = await this.createSession(request, data.session);
      
      return {
        headers,
        success: true,
      };
    } catch (error) {
      console.error("Error refreshing session:", error);
      return {
        headers: await this.destroySession(request),
        success: false,
        error: "Session refresh failed",
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
  }> {
    try {
      const session = await getSession(request.headers.get("Cookie"));
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
            shouldRedirect: true 
          };
        }
        
        return { 
          userId: sessionData.userId, 
          headers: refreshResult.headers 
        };
      }
      
      // セッションの更新が必要な場合
      if (shouldRefreshSession(sessionData)) {
        const refreshResult = await this.refreshSession(request);
        
        if (refreshResult.success) {
          return { 
            userId: sessionData.userId, 
            headers: refreshResult.headers 
          };
        }
      }
      
      return { userId: sessionData.userId };
    } catch (error) {
      console.error("Error validating session:", error);
      return { userId: null, shouldRedirect: true };
    }
  }

  /**
   * 認証されたSupabaseクライアントを取得
   */
  static async getAuthenticatedClient(request: Request) {
    const session = await getSession(request.headers.get("Cookie"));
    const sessionData = session.data as SessionData;
    
    if (!sessionData.supabaseSession?.access_token || !isSessionValid(sessionData)) {
      return null;
    }
    
    return supabase.auth.setSession({
      access_token: sessionData.supabaseSession.access_token,
      refresh_token: sessionData.supabaseSession.refresh_token,
    });
  }
}