import { NextResponse } from 'next/server';
import { requireTrainer } from '@/lib/auth/admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** 指定顧客の記録（体重・食事・筋トレ）を返す */
export async function GET(
  _req: Request,
  { params }: { params: { clientId: string } }
) {
  const { error, admin, user } = await requireTrainer();
  if (error) return error;

  // この顧客がこのトレーナーのものか検証
  const { data: client, error: clientError } = await admin!
    .from('clients')
    .select('id, user_id, display_name')
    .eq('id', params.clientId)
    .eq('trainer_id', user!.id)
    .maybeSingle();
  if (clientError) return NextResponse.json({ error: clientError.message }, { status: 500 });
  if (!client) return NextResponse.json({ error: '顧客が見つかりません。' }, { status: 404 });

  const { data: authUser } = await admin!.auth.admin.getUserById(client.user_id);

  const [weights, meals, workouts] = await Promise.all([
    admin!
      .from('weight_logs')
      .select('weight_kg, body_fat, measured_at')
      .eq('user_id', client.user_id)
      .order('measured_at', { ascending: true }),
    admin!
      .from('meals')
      .select('meal_type, food_name, calories, protein, fat, carbs, eaten_at')
      .eq('user_id', client.user_id)
      .order('eaten_at', { ascending: false })
      .limit(20),
    admin!
      .from('workouts')
      .select('exercise_name, weight_kg, reps, sets, performed_at')
      .eq('user_id', client.user_id)
      .order('performed_at', { ascending: false })
      .limit(20),
  ]);

  return NextResponse.json({
    client: {
      id: client.id,
      user_id: client.user_id,
      display_name: client.display_name ?? null,
      email: authUser?.user?.email ?? null,
    },
    weights: weights.data ?? [],
    meals: meals.data ?? [],
    workouts: workouts.data ?? [],
  });
}

/** 顧客の紐付けを解除する */
export async function DELETE(
  _req: Request,
  { params }: { params: { clientId: string } }
) {
  const { error, admin, user } = await requireTrainer();
  if (error) return error;

  const { error: dbError } = await admin!
    .from('clients')
    .delete()
    .eq('id', params.clientId)
    .eq('trainer_id', user!.id);
  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
