#!/usr/bin/env tsx

/**
 * メール送信機能のテストスクリプト
 * 
 * 使用方法:
 * npx tsx scripts/test-email.ts test@example.com
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || 'http://127.0.0.1:54321';
const supabaseKey = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testEmailSignup(email: string) {
  console.log('🧪 メール送信機能をテストしています...');
  console.log(`📧 テスト用メールアドレス: ${email}`);
  console.log(`🔗 Supabase URL: ${supabaseUrl}`);
  console.log(`📬 Inbucket URL: http://127.0.0.1:54324`);
  console.log('');

  try {
    // ユーザー登録を試行
    const { data, error } = await supabase.auth.signUp({
      email,
      password: 'test123456',
    });

    if (error) {
      console.error('❌ エラーが発生しました:', error.message);
      return;
    }

    console.log('✅ ユーザー登録リクエストが成功しました');
    console.log('📊 レスポンス:', {
      user: data.user ? {
        id: data.user.id,
        email: data.user.email,
        email_confirmed_at: data.user.email_confirmed_at,
        created_at: data.user.created_at,
      } : null,
      session: data.session ? 'セッションが作成されました' : 'セッションは作成されませんでした（メール確認待ち）',
    });

    console.log('');
    console.log('📬 メール確認手順:');
    console.log('1. ブラウザで http://127.0.0.1:54324 を開く');
    console.log('2. 送信されたメールを確認する');
    console.log('3. メール内の確認リンクをクリックする');
    console.log('');

    if (!data.session) {
      console.log('✅ メール確認が有効になっています（期待される動作）');
    } else {
      console.log('⚠️  メール確認なしでセッションが作成されました（設定を確認してください）');
    }

  } catch (error) {
    console.error('❌ 予期しないエラー:', error);
  }
}

async function main() {
  const email = process.argv[2];
  
  if (!email) {
    console.log('使用方法: npx tsx scripts/test-email.ts <email>');
    console.log('例: npx tsx scripts/test-email.ts test@example.com');
    process.exit(1);
  }

  await testEmailSignup(email);
}

main().catch(console.error);