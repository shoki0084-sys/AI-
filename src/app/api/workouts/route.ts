import { NextResponse } from 'next/server';
import { getAuthContext } from '@/lib/api/auth';
import type { WorkoutBatchInput, WorkoutInput } from '@/types/workout';

export async function GET() {
  const { error, user, supabase } = await getAuthContext();
  if (error) return error;

  const { data, error: dbError } = await supabase!
    .from('workouts')
    .select('*')
    .eq('user_id', user!.id)
    .order('performed_at', { ascending: false });

  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 });
  return NextResponse.json({ workouts: data });
}

export async function POST(req: Request) {
  const { error, user, supabase } = await getAuthContext();
  if (error) return error;

  const body = (await req.json()) as WorkoutInput & Partial<WorkoutBatchInput>;

  if (!body.performed_at) {
    return NextResponse.json({ error: 'performed_at is required' }, { status: 400 });
  }

  const batchExercises =
    body.exercises?.filter((ex) => ex.exercise_name?.trim()) ?? [];

  if (batchExercises.length > 0) {
    for (const ex of batchExercises) {
      if (ex.weight_kg < 0 || ex.reps < 0 || ex.sets < 0) {
        return NextResponse.json({ error: 'invalid numeric value' }, { status: 400 });
      }
    }

    const note = body.note?.trim() || null;
    const rows = batchExercises.map((ex, index) => ({
      user_id: user!.id,
      exercise_name: ex.exercise_name.trim(),
      weight_kg: ex.weight_kg ?? 0,
      reps: ex.reps ?? 0,
      sets: ex.sets ?? 0,
      performed_at: body.performed_at,
      note: index === 0 ? note : null,
    }));

    const { data, error: dbError } = await supabase!.from('workouts').insert(rows).select();

    if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 });
    return NextResponse.json({ workouts: data }, { status: 201 });
  }

  if (!body.exercise_name?.trim()) {
    return NextResponse.json({ error: 'exercise_name is required' }, { status: 400 });
  }
  if (body.weight_kg < 0 || body.reps < 0 || body.sets < 0) {
    return NextResponse.json({ error: 'invalid numeric value' }, { status: 400 });
  }

  const { data, error: dbError } = await supabase!
    .from('workouts')
    .insert({
      user_id: user!.id,
      exercise_name: body.exercise_name.trim(),
      weight_kg: body.weight_kg ?? 0,
      reps: body.reps ?? 0,
      sets: body.sets ?? 0,
      performed_at: body.performed_at,
      note: body.note?.trim() || null,
    })
    .select()
    .single();

  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 });
  return NextResponse.json({ workout: data }, { status: 201 });
}
