import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/** 指定ユーザーのメールのみ取得（全件 listUsers を避ける） */
export async function getEmailsByUserIds(admin: SupabaseClient, userIds: string[]) {
  const emailById = new Map<string, string | null>();
  if (!userIds.length) return emailById;
  await Promise.all(
    userIds.map(async (id) => {
      const { data } = await admin.auth.admin.getUserById(id);
      emailById.set(id, data.user?.email ?? null);
    })
  );
  return emailById;
}

/** メールアドレスから user id を検索（全件一括取得を避けてページング） */
export async function findUserIdByEmail(admin: SupabaseClient, email: string) {
  const target = email.trim().toLowerCase();
  let page = 1;
  while (true) {
    const { data } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    const users = data?.users ?? [];
    const match = users.find((u) => (u.email ?? '').toLowerCase() === target);
    if (match) return match.id;
    if (users.length < 200) break;
    page++;
  }
  return null;
}

export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error(
      'SUPABASE_SERVICE_ROLE_KEY または NEXT_PUBLIC_SUPABASE_URL が未設定です。.env.local を確認し、npm run dev を再起動してください。'
    );
  }

  return createClient(url, serviceKey, { auth: { persistSession: false } });
}
