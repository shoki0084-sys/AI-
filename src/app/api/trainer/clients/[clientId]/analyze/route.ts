import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { requireTrainer } from '@/lib/auth/admin';
import { getJstDayBounds, toJstDateString } from '@/lib/datetime';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const SYSTEM_PROMPT = `あなたはボディメイクに精通したパーソナルトレーナー兼管理栄養士です。
担当顧客の直近7日間の記録（7日平均体重・PFC・筋トレ頻度）を分析し、日本語で簡潔にコーチングしてください。
Markdown見出し(## 体重 / ## PFC分析 / ## 筋トレ頻度 / ## 改善提案)で構造化し、改善提案は具体的な行動で示してください。`;

const r1 = (n: number) => Math.round(n * 10) / 10;

async function loadClient(clientId: string, trainerId: string, admin: NonNullable<Awaited<ReturnType<typeof requireTrainer>>['admin']>) {
  const { data } = await admin
    .from('clients')
    .select('id, user_id')
    .eq('id', clientId)
    .eq('trainer_id', trainerId)
    .maybeSingle();
  return data;
}

/** 保存済みの分析結果（新しい順）を返す */
export async function GET(
  _req: Request,
  { params }: { params: { clientId: string } }
) {
  const { error, admin, user } = await requireTrainer();
  if (error) return error;

  const client = await loadClient(params.clientId, user!.id, admin!);
  if (!client) return NextResponse.json({ error: '顧客が見つかりません。' }, { status: 404 });

  const { data } = await admin!
    .from('coach_analyses')
    .select('*')
    .eq('client_id', params.clientId)
    .eq('trainer_id', user!.id)
    .order('created_at', { ascending: false })
    .limit(10);

  return NextResponse.json({ analyses: data ?? [] });
}

/** AIコーチ分析を生成して保存する */
export async function POST(
  _req: Request,
  { params }: { params: { clientId: string } }
) {
  const { error, admin, user } = await requireTrainer();
  if (error) return error;

  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({ error: 'OPENAI_API_KEY が未設定です。' }, { status: 503 });
  }

  const client = await loadClient(params.clientId, user!.id, admin!);
  if (!client) return NextResponse.json({ error: '顧客が見つかりません。' }, { status: 404 });

  const { end } = getJstDayBounds();
  const { start } = getJstDayBounds(new Date(Date.now() - 6 * 86_400_000));

  const [profileRes, weightsRes, mealsRes, workoutsRes] = await Promise.all([
    admin!
      .from('users')
      .select('target_weight, target_calories, target_protein, target_fat, target_carbs')
      .eq('id', client.user_id)
      .single(),
    admin!
      .from('weight_logs')
      .select('weight_kg, measured_at')
      .eq('user_id', client.user_id)
      .gte('measured_at', start)
      .lte('measured_at', end)
      .order('measured_at', { ascending: true }),
    admin!
      .from('meals')
      .select('calories, protein, fat, carbs')
      .eq('user_id', client.user_id)
      .gte('eaten_at', start)
      .lte('eaten_at', end),
    admin!
      .from('workouts')
      .select('exercise_name, performed_at')
      .eq('user_id', client.user_id)
      .gte('performed_at', start)
      .lte('performed_at', end),
  ]);

  const profile = profileRes.data;
  const weights = weightsRes.data ?? [];
  const meals = mealsRes.data ?? [];
  const workouts = workoutsRes.data ?? [];

  if (weights.length === 0 && meals.length === 0 && workouts.length === 0) {
    return NextResponse.json({ error: 'この顧客の直近7日間の記録がありません。' }, { status: 400 });
  }

  // 7日平均体重
  const avgWeight = weights.length
    ? r1(weights.reduce((s, w) => s + Number(w.weight_kg), 0) / weights.length)
    : null;

  // PFC（1日平均）
  const totals = meals.reduce(
    (acc, m) => ({
      calories: acc.calories + Number(m.calories ?? 0),
      protein: acc.protein + Number(m.protein ?? 0),
      fat: acc.fat + Number(m.fat ?? 0),
      carbs: acc.carbs + Number(m.carbs ?? 0),
    }),
    { calories: 0, protein: 0, fat: 0, carbs: 0 }
  );
  const avgCalories = r1(totals.calories / 7);
  const avgProtein = r1(totals.protein / 7);
  const avgFat = r1(totals.fat / 7);
  const avgCarbs = r1(totals.carbs / 7);

  // 筋トレ頻度（実施日数）
  const workoutDays = new Set(workouts.map((w) => toJstDateString(w.performed_at))).size;

  const userPrompt = `【直近7日間】
7日平均体重: ${avgWeight != null ? `${avgWeight}kg` : '記録なし'} / 目標 ${profile?.target_weight ?? '未設定'}kg
PFC(1日平均): ${avgCalories}kcal / P${avgProtein}g F${avgFat}g C${avgCarbs}g
目標(1日): ${profile?.target_calories ?? '未設定'}kcal / P${profile?.target_protein ?? '未設定'}g F${profile?.target_fat ?? '未設定'}g C${profile?.target_carbs ?? '未設定'}g
筋トレ頻度: 週${workoutDays}日（${workouts.length}件）

上記を分析し、コーチングと改善提案をお願いします。`;

  let analysis: string;
  try {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      temperature: 0.6,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userPrompt },
      ],
    });
    analysis = completion.choices[0]?.message?.content?.trim() ?? '';
  } catch (e) {
    return NextResponse.json({ error: `OpenAI error: ${(e as Error).message}` }, { status: 502 });
  }

  const { data: saved, error: saveError } = await admin!
    .from('coach_analyses')
    .insert({
      trainer_id: user!.id,
      client_id: client.id,
      user_id: client.user_id,
      avg_weight: avgWeight,
      avg_calories: avgCalories,
      avg_protein: avgProtein,
      avg_fat: avgFat,
      avg_carbs: avgCarbs,
      workout_days: workoutDays,
      analysis,
    })
    .select('*')
    .single();
  if (saveError) return NextResponse.json({ error: saveError.message }, { status: 500 });

  return NextResponse.json({ analysis: saved });
}
