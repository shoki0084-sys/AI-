import { NextResponse } from 'next/server';
import { requireTrainer } from '@/lib/auth/admin';
import { getEmailsByUserIds } from '@/lib/supabase/admin';
import { getJstDayBounds } from '@/lib/datetime';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** 担当顧客のうち、本日（JST）の各記録が未入力の顧客を返す */
export async function GET() {
  const { error, admin, user } = await requireTrainer();
  if (error) return error;

  const { data: rows, error: dbError } = await admin!
    .from('clients')
    .select('id, user_id, display_name')
    .eq('trainer_id', user!.id)
    .order('created_at', { ascending: true });
  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 });

  const userIds = (rows ?? []).map((c) => c.user_id);
  const { start, end } = getJstDayBounds();

  const hasToday = async (table: string, dateColumn: string) => {
    const set = new Set<string>();
    if (!userIds.length) return set;
    const { data } = await admin!
      .from(table)
      .select('user_id')
      .in('user_id', userIds)
      .gte(dateColumn, start)
      .lte(dateColumn, end);
    for (const r of (data ?? []) as { user_id: string }[]) set.add(r.user_id);
    return set;
  };

  const [weightDone, mealDone, workoutDone] = await Promise.all([
    hasToday('weight_logs', 'measured_at'),
    hasToday('meals', 'eaten_at'),
    hasToday('workouts', 'performed_at'),
  ]);

  const emailById = await getEmailsByUserIds(admin!, userIds);

  const clients = (rows ?? []).map((c) => ({
    id: c.id,
    name: c.display_name || emailById.get(c.user_id) || c.user_id.slice(0, 8),
    missingWeight: !weightDone.has(c.user_id),
    missingMeal: !mealDone.has(c.user_id),
    missingWorkout: !workoutDone.has(c.user_id),
  }));

  return NextResponse.json({
    date: getJstDayBounds().label,
    clients: clients.filter((c) => c.missingWeight || c.missingMeal || c.missingWorkout),
  });
}
