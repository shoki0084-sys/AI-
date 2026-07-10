import { NextResponse } from 'next/server';
import { getAuthContext } from '@/lib/api/auth';

export const runtime = 'nodejs';

const PROFILE_FIELDS = [
  'target_weight',
  'target_calories',
  'target_protein',
  'target_fat',
  'target_carbs',
] as const;

type ProfileField = (typeof PROFILE_FIELDS)[number];

function parseOptionalTarget(value: unknown, label: string) {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) {
    throw new Error(`invalid ${label}`);
  }
  return n;
}

export async function GET() {
  const { error, user, supabase } = await getAuthContext();
  if (error) return error;

  const { data, error: dbError } = await supabase!
    .from('users')
    .select(PROFILE_FIELDS.join(', '))
    .eq('id', user!.id)
    .single();

  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 });
  return NextResponse.json({ profile: data });
}

export async function PUT(req: Request) {
  const { error, user, supabase } = await getAuthContext();
  if (error) return error;

  const body = (await req.json().catch(() => ({}))) as Partial<
    Record<ProfileField, unknown>
  >;

  const updates: Partial<Record<ProfileField, number | null>> = {};

  try {
    for (const key of PROFILE_FIELDS) {
      if (key in body) {
        updates[key] = parseOptionalTarget(body[key], key);
      }
    }
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'no fields to update' }, { status: 400 });
  }

  const { data, error: dbError } = await supabase!
    .from('users')
    .update(updates)
    .eq('id', user!.id)
    .select(PROFILE_FIELDS.join(', '))
    .single();

  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 });
  return NextResponse.json({ profile: data });
}
