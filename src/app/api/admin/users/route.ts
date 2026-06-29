import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const { error, admin } = await requireAdmin();
  if (error) return error;

  const { data: rows, error: dbError } = await admin!
    .from('users')
    .select('id, line_user_id, target_weight, target_calories, created_at')
    .order('created_at', { ascending: true });
  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 });

  const { data: authList } = await admin!.auth.admin.listUsers();
  const emailById = new Map(
    (authList?.users ?? []).map((u) => [u.id, u.email ?? null])
  );

  const users = (rows ?? []).map((u) => ({
    id: u.id,
    email: emailById.get(u.id) ?? null,
    line_user_id: u.line_user_id ?? null,
    target_weight: u.target_weight ?? null,
    created_at: u.created_at,
  }));

  return NextResponse.json({ users });
}
