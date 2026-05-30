import { NextResponse } from 'next/server';
import { getAuthContext } from '@/lib/api/auth';
import type { WeightInput } from '@/types/weight';

export async function GET() {
  const { error, user, supabase } = await getAuthContext();
  if (error) return error;

  const { data, error: dbError } = await supabase!
    .from('weight_logs')
    .select('*')
    .eq('user_id', user!.id)
    .order('measured_at', { ascending: true });

  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 });
  return NextResponse.json({ logs: data });
}

export async function POST(req: Request) {
  const { error, user, supabase } = await getAuthContext();
  if (error) return error;

  const body = (await req.json()) as WeightInput;

  if (!body.weight_kg || body.weight_kg <= 0) {
    return NextResponse.json({ error: 'invalid weight_kg' }, { status: 400 });
  }
  if (!body.measured_at) {
    return NextResponse.json({ error: 'measured_at is required' }, { status: 400 });
  }

  const { data, error: dbError } = await supabase!
    .from('weight_logs')
    .upsert(
      {
        user_id: user!.id,
        weight_kg: body.weight_kg,
        body_fat: body.body_fat ?? null,
        measured_at: body.measured_at,
      },
      { onConflict: 'user_id,measured_at' }
    )
    .select()
    .single();

  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 });
  return NextResponse.json({ log: data }, { status: 201 });
}
