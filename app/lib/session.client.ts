import { supabase } from '~/api/supabaseClient';

/**
 * クライアントサイドでのセッション管理ユーティリティ
 */
export class ClientSessionService {
  private static refreshPromise: Promise<boolean> | null = null;

  /**
   * セッションの有効性をチェック
   */
  static async isSessionValid(): Promise<boolean> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) return false;
      
      const now = Math.floor(Date.now() / 1000);
      return session.expires_at ? session.expires_at > now : false;
    } catch (error) {
      console.error('Error checking session validity:', error);
      return false;
    }
  }

  /**
   * セッションの更新が必要かチェック
   */
  static async shouldRefreshSession(): Promise<boolean> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session || !session.expires_at) return false;
      
      const now = Math.floor(Date.now() / 1000);
      const refreshThreshold = 5 * 60; // 5分前
      
      return (session.expires_at - now) < refreshThreshold;
    } catch (error) {
      console.error('Error checking if session should refresh:', error);
      return false;
    }
  }

  /**
   * セッションを更新（重複実行を防ぐ）
   */
  static async refreshSession(): Promise<boolean> {
    // 既に更新処理が実行中の場合は、その結果を待つ
    if (this.refreshPromise) {
      return this.refreshPromise;
    }

    this.refreshPromise = this._performRefresh();
    
    try {
      const result = await this.refreshPromise;
      return result;
    } finally {
      this.refreshPromise = null;
    }
  }

  private static async _performRefresh(): Promise<boolean> {
    try {
      const { data, error } = await supabase.auth.refreshSession();
      
      if (error || !data.session) {
        console.error('Session refresh failed:', error);
        return false;
      }

      // サーバーとセッションを同期
      await this.syncWithServer(data.session);
      
      return true;
    } catch (error) {
      console.error('Error refreshing session:', error);
      return false;
    }
  }

  /**
   * サーバーとセッションを同期
   */
  static async syncWithServer(session: any): Promise<boolean> {
    try {
      const response = await fetch('/api/auth/session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ session }),
      });

      return response.ok;
    } catch (error) {
      console.error('Error syncing session with server:', error);
      return false;
    }
  }

  /**
   * セッションの自動管理を開始
   */
  static startSessionManagement(): () => void {
    const checkInterval = setInterval(async () => {
      if (await this.shouldRefreshSession()) {
        await this.refreshSession();
      }
    }, 60 * 1000); // 1分ごとにチェック

    // クリーンアップ関数を返す
    return () => {
      clearInterval(checkInterval);
    };
  }

  /**
   * セッションタイムアウトの監視
   */
  static watchSessionTimeout(onTimeout: () => void): () => void {
    const checkTimeout = setInterval(async () => {
      const isValid = await this.isSessionValid();
      
      if (!isValid) {
        onTimeout();
      }
    }, 30 * 1000); // 30秒ごとにチェック

    return () => {
      clearInterval(checkTimeout);
    };
  }
}