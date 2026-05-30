'use client';

import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { ensureUserProfile } from '@/lib/auth/ensure-profile';
import { hasSupabaseEnv, SUPABASE_ENV_ERROR } from '@/lib/env';

function formatAuthError(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err);
  if (msg.includes('Invalid login credentials')) {
    return 'メールアドレスまたはパスワードが正しくありません。本番では新規登録が必要な場合があります。';
  }
  if (msg.includes('Email not confirmed')) {
    return 'メールの確認が完了していません。登録時に届いた確認メールのリンクを開いてから、再度ログインしてください。';
  }
  return msg;
}

function LoginForm() {
  const searchParams = useSearchParams();
  const nextPath = searchParams.get('next') || '/';
  const authError = searchParams.get('error') === 'auth';

  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(() => {
    if (!hasSupabaseEnv()) return SUPABASE_ENV_ERROR;
    if (authError) return '認証に失敗しました。もう一度ログインしてください。';
    return null;
  });

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setMessage(null);

    try {
      const supabase = createClient();
      const redirectTo = `${window.location.origin}/auth/callback`;
      const authResult =
        mode === 'register'
          ? await supabase.auth.signUp({
              email,
              password,
              options: { emailRedirectTo: redirectTo },
            })
          : await supabase.auth.signInWithPassword({ email, password });

      if (authResult.error) throw authResult.error;

      const user = authResult.data.user;
      if (!user) {
        throw new Error(
          mode === 'register'
            ? '確認メールを送信しました。メール内のリンクから認証後、再度ログインしてください。'
            : 'ログインに失敗しました'
        );
      }

      if (mode === 'register' && !authResult.data.session) {
        setMessage('確認メールを送信しました。認証後にログインしてください。');
        setMode('login');
        return;
      }

      await ensureUserProfile(supabase, user.id);

      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        throw new Error('セッションを取得できませんでした。ページを再読み込みして再度お試しください。');
      }

      // クライアント遷移だと Middleware に Cookie が届かないことがあるためフルリロード
      window.location.assign(nextPath);
      return;
    } catch (err) {
      setMessage(`⚠️ ${formatAuthError(err)}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-sm space-y-4">
      <header className="space-y-1 text-center">
        <p className="text-3xl">🏋️</p>
        <h1 className="page-title">AIボディメイク</h1>
        <p className="text-sm text-gray-500">
          {mode === 'login' ? 'ログインして記録を始めましょう' : '新規アカウント作成'}
        </p>
      </header>

      <form onSubmit={onSubmit} className="card space-y-4">
        <div>
          <label className="label">メールアドレス</label>
          <input
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="field"
            placeholder="you@example.com"
          />
        </div>

        <div>
          <label className="label">パスワード</label>
          <input
            type="password"
            required
            minLength={6}
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="field"
            placeholder="6文字以上"
          />
        </div>

        <button type="submit" disabled={submitting} className="btn-primary">
          {submitting
            ? '処理中…'
            : mode === 'login'
              ? 'ログイン'
              : 'アカウント作成'}
        </button>

        {message && (
          <p className="whitespace-pre-wrap text-sm text-amber-700">{message}</p>
        )}
      </form>

      <p className="text-center text-sm text-gray-600">
        {mode === 'login' ? (
          <>
            はじめての方は{' '}
            <button
              type="button"
              className="font-semibold text-blue-600"
              onClick={() => setMode('register')}
            >
              新規登録
            </button>
          </>
        ) : (
          <>
            すでにアカウントがある方は{' '}
            <button
              type="button"
              className="font-semibold text-blue-600"
              onClick={() => setMode('login')}
            >
              ログイン
            </button>
          </>
        )}
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <main className="flex min-h-dvh items-center justify-center p-4">
      <Suspense fallback={<p className="text-sm text-gray-500">読み込み中…</p>}>
        <LoginForm />
      </Suspense>
    </main>
  );
}
