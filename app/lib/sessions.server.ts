import { createCookieSessionStorage } from "react-router";

// セッションデータの型定義
export interface SessionData {
  userId: string;
  roles?: string[];
  supabaseSession?: {
    access_token: string;
    refresh_token: string;
    expires_at: number;
  };
}

// フラッシュデータの型定義
export interface FlashData {
  error?: string;
  success?: string;
}

// セッションストレージの作成
export const { getSession, commitSession, destroySession } =
  createCookieSessionStorage<SessionData, FlashData>({
    cookie: {
      name: "__session",
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24, // 1日
      secrets: [process.env.SESSION_SECRET || "fallback-secret-key"],
    },
  });

// セッション有効性チェック
export function isSessionValid(sessionData: SessionData): boolean {
  if (!sessionData.supabaseSession) return false;
  
  const now = Math.floor(Date.now() / 1000);
  return sessionData.supabaseSession.expires_at > now;
}

// セッションの更新が必要かチェック
export function shouldRefreshSession(sessionData: SessionData): boolean {
  if (!sessionData.supabaseSession) return false;
  
  const now = Math.floor(Date.now() / 1000);
  const expiresAt = sessionData.supabaseSession.expires_at;
  const refreshThreshold = 5 * 60; // 5分前
  
  return (expiresAt - now) < refreshThreshold;
}