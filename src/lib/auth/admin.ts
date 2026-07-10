import { NextResponse } from 'next/server';
import { getAuthContext } from '@/lib/api/auth';
import { createAdminClient } from '@/lib/supabase/admin';

export function getAdminEmails() {
  return (process.env.ADMIN_EMAILS ?? '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export function isAdminEmail(email?: string | null) {
  if (!email) return false;
  return getAdminEmails().includes(email.toLowerCase());
}

/** 管理者認証 + service_role クライアントを返す */
export async function requireAdmin() {
  const { error, user } = await getAuthContext();
  if (error) return { error, admin: null };

  if (!isAdminEmail(user!.email)) {
    return {
      error: NextResponse.json({ error: '管理者権限がありません。' }, { status: 403 }),
      admin: null,
    };
  }

  try {
    return { error: null, admin: createAdminClient(), user };
  } catch (e) {
    return {
      error: NextResponse.json({ error: (e as Error).message }, { status: 503 }),
      admin: null,
    };
  }
}

/** トレーナー認証 + service_role クライアントを返す（判定は管理者メールを流用） */
export async function requireTrainer() {
  const { error, user } = await getAuthContext();
  if (error) return { error, admin: null, user: null };

  if (!isAdminEmail(user!.email)) {
    return {
      error: NextResponse.json({ error: 'トレーナー権限がありません。' }, { status: 403 }),
      admin: null,
      user: null,
    };
  }

  try {
    return { error: null, admin: createAdminClient(), user: user! };
  } catch (e) {
    return {
      error: NextResponse.json({ error: (e as Error).message }, { status: 503 }),
      admin: null,
      user: null,
    };
  }
}
