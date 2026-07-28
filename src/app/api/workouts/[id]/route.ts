import { NextResponse } from 'next/server';
import { getAuthContext } from '@/lib/api/auth';

type Ctx = { params: { id: string } };

export async function PATCH(req: Request, ctx: Ctx) {
  const { error, user, supabase } = await getAuthContext();
  if (error) return error;

  const { id } = ctx.params;
  if (!id) {
    return NextResponse.json({ error: 'id is required' }, { status: 400 });
  }

  const body = (await req.json()) as {
    exercise_name?: string;
    weight_kg?: number;
    reps?: number;
    sets?: number;
    performed_at?: string;
    note?: string | null;
  };

  const updates: Record<string, string | number | null> = {};

  if (body.exercise_name != null) {
    const name = body.exercise_name.trim();
    if (!name) {
      return NextResponse.json({ error: 'exercise_name is required' }, { status: 400 });
    }
    updates.exercise_name = name;
  }
  if (body.performed_at != null) {
    if (!body.performed_at) {
      return NextResponse.json({ error: 'performed_at is required' }, { status: 400 });
    }
    updates.performed_at = body.performed_at;
  }
  if (body.note !== undefined) {
    updates.note = body.note?.trim() || null;
  }
  if (body.weight_kg != null) {
    if (Number(body.weight_kg) < 0) {
      return NextResponse.json({ error: 'invalid numeric value' }, { status: 400 });
    }
    updates.weight_kg = Number(body.weight_kg);
  }
  if (body.reps != null) {
    if (Number(body.reps) < 0) {
      return NextResponse.json({ error: 'invalid numeric value' }, { status: 400 });
    }
    updates.reps = Number(body.reps);
  }
  if (body.sets != null) {
    if (Number(body.sets) < 0) {
      return NextResponse.json({ error: 'invalid numeric value' }, { status: 400 });
    }
    updates.sets = Number(body.sets);
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'no fields to update' }, { status: 400 });
  }

  const { data, error: dbError } = await supabase!
    .from('workouts')
    .update(updates)
    .eq('id', id)
    .eq('user_id', user!.id)
    .select()
    .maybeSingle();

  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: 'not found' }, { status: 404 });
  return NextResponse.json({ workout: data });
}

export async function DELETE(_req: Request, ctx: Ctx) {
  const { error, user, supabase } = await getAuthContext();
  if (error) return error;

  const { id } = ctx.params;
  if (!id) {
    return NextResponse.json({ error: 'id is required' }, { status: 400 });
  }

  const { data, error: dbError } = await supabase!
    .from('workouts')
    .delete()
    .eq('id', id)
    .eq('user_id', user!.id)
    .select('id')
    .maybeSingle();

  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: 'not found' }, { status: 404 });
  return NextResponse.json({ ok: true });
}
