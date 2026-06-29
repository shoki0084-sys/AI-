import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const { error, admin } = await requireAdmin();
  if (error) return error;

  const userId = new URL(req.url).searchParams.get('userId');
  if (!userId) {
    return NextResponse.json({ error: 'userId is required' }, { status: 400 });
  }

  const [weights, meals, workouts] = await Promise.all([
    admin!
      .from('weight_logs')
      .select('weight_kg, body_fat, measured_at')
      .eq('user_id', userId)
      .order('measured_at', { ascending: false })
      .limit(10),
    admin!
      .from('meals')
      .select('meal_type, food_name, calories, protein, fat, carbs, eaten_at')
      .eq('user_id', userId)
      .order('eaten_at', { ascending: false })
      .limit(10),
    admin!
      .from('workouts')
      .select('exercise_name, weight_kg, reps, sets, performed_at')
      .eq('user_id', userId)
      .order('performed_at', { ascending: false })
      .limit(10),
  ]);

  return NextResponse.json({
    weights: weights.data ?? [],
    meals: meals.data ?? [],
    workouts: workouts.data ?? [],
  });
}
