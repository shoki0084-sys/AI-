import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { requireAdmin } from '@/lib/auth/admin';
import { getJstDayBounds, toJstDateString } from '@/lib/datetime';

export const runtime = 'nodejs';

const SYSTEM_PROMPT = `あなたはボディメイクに精通したパーソナルトレーナー兼管理栄養士です。
指定ユーザーの直近7日間の記録（体重・PFC・トレーニング）を分析し、日本語で簡潔にアドバイスしてください。
Markdown見出し(## 体重推移 / ## PFC分析 / ## トレーニング / ## 改善提案)で構造化してください。`;

export async function POST(req: Request) {
  const { error, admin } = await requireAdmin();
  if (error) return error;

  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json(
      { error: 'OPENAI_API_KEY が未設定です。' },
      { status: 503 }
    );
  }

  const body = (await req.json().catch(() => ({}))) as { userId?: string };
  if (!body.userId) {
    return NextResponse.json({ error: 'userId is required' }, { status: 400 });
  }

  const { end } = getJstDayBounds();
  const { start } = getJstDayBounds(new Date(Date.now() - 6 * 86_400_000));
  const r1 = (n: number) => Math.round(n * 10) / 10;

  const [profileRes, weightsRes, mealsRes, workoutsRes] = await Promise.all([
    admin!
      .from('users')
      .select('target_weight, target_calories, target_protein, target_fat, target_carbs')
      .eq('id', body.userId)
      .single(),
    admin!
      .from('weight_logs')
      .select('weight_kg, measured_at')
      .eq('user_id', body.userId)
      .gte('measured_at', start)
      .lte('measured_at', end)
      .order('measured_at', { ascending: true }),
    admin!
      .from('meals')
      .select('calories, protein, fat, carbs')
      .eq('user_id', body.userId)
      .gte('eaten_at', start)
      .lte('eaten_at', end),
    admin!
      .from('workouts')
      .select('exercise_name, performed_at')
      .eq('user_id', body.userId)
      .gte('performed_at', start)
      .lte('performed_at', end),
  ]);

  const profile = profileRes.data;
  const weights = weightsRes.data ?? [];
  const meals = mealsRes.data ?? [];
  const workouts = workoutsRes.data ?? [];

  if (weights.length === 0 && meals.length === 0 && workouts.length === 0) {
    return NextResponse.json(
      { error: 'このユーザーの直近7日間の記録がありません。' },
      { status: 400 }
    );
  }

  const totals = meals.reduce(
    (acc, m) => ({
      calories: acc.calories + Number(m.calories ?? 0),
      protein: acc.protein + Number(m.protein ?? 0),
      fat: acc.fat + Number(m.fat ?? 0),
      carbs: acc.carbs + Number(m.carbs ?? 0),
    }),
    { calories: 0, protein: 0, fat: 0, carbs: 0 }
  );

  const workoutDays = new Set(workouts.map((w) => toJstDateString(w.performed_at))).size;
  const weightChange =
    weights.length >= 2
      ? r1(Number(weights[weights.length - 1].weight_kg) - Number(weights[0].weight_kg))
      : null;

  const userPrompt = `【直近7日間】
体重: ${weights.length > 0 ? weights.map((w) => `${w.weight_kg}kg`).join(' → ') : '記録なし'}
増減: ${weightChange != null ? `${weightChange > 0 ? '+' : ''}${weightChange}kg` : 'データ不足'} / 目標 ${profile?.target_weight ?? '未設定'}kg
PFC(1日平均): ${r1(totals.calories / 7)}kcal / P${r1(totals.protein / 7)}g F${r1(totals.fat / 7)}g C${r1(totals.carbs / 7)}g
目標(1日): ${profile?.target_calories ?? '未設定'}kcal / P${profile?.target_protein ?? '未設定'}g F${profile?.target_fat ?? '未設定'}g C${profile?.target_carbs ?? '未設定'}g
トレーニング: ${workouts.length}件 / 実施${workoutDays}日

上記を分析しアドバイスをお願いします。`;

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
    return NextResponse.json({ advice: completion.choices[0]?.message?.content?.trim() ?? '' });
  } catch (e) {
    return NextResponse.json({ error: `OpenAI error: ${(e as Error).message}` }, { status: 502 });
  }
}
