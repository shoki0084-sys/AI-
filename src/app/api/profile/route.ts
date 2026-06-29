import { NextResponse } from 'next/server';
import { getAuthContext } from '@/lib/api/auth';

export const runtime = 'nodejs';

export async function GET() {
  const { error, user, supabase } = await getAuthContext();
  if (error) return error;

  const { data, error: dbError } = await supabase!
    .from('users')
    .select('target_weight')
    .eq('id', user!.id)
    .single();

  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 });
  return NextResponse.json({ profile: data });
}

export async function PUT(req: Request) {
  const { error, user, supabase } = await getAuthContext();
  if (error) return error;

  const body = (await req.json().catch(() => ({}))) as { target_weight?: unknown };

  let targetWeight: number | null = null;
  if (body.target_weight !== null && body.target_weight !== undefined && body.target_weight !== '') {
    const n = Number(body.target_weight);
    if (!Number.isFinite(n) || n <= 0) {
      return NextResponse.json({ error: 'invalid target_weight' }, { status: 400 });
    }
    targetWeight = n;
  }

  const { data, error: dbError } = await supabase!
    .from('users')
    .update({ target_weight: targetWeight })
    .eq('id', user!.id)
    .select('target_weight')
    .single();

  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 });
  return NextResponse.json({ profile: data });
}
