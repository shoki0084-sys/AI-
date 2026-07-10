import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { requireTrainer } from '@/lib/auth/admin';
import { getJstDayBounds, toJstDateString } from '@/lib/datetime';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const SYSTEM_PROMPT = `あなたはボディメイクに精通したパーソナルトレーナーです。
担当顧客の1週間の実績（平均体重・体重変化・PFC達成率・筋トレ回数）を踏まえ、
週間レポートの総評を日本語で簡潔に（3〜5文程度）述べてください。良い点と次週への課題を含めてください。`;

const r1 = (n: number) => Math.round(n * 10) / 10;
const rate = (actual: number, target: number | null | undefined) =>
  target ? Math.round((actual / Number(target)) * 100) : null;

/** 顧客の週間レポートを生成する */
export async function POST(
  _req: Request,
  { params }: { params: { clientId: string } }
) {
  const { error, admin, user } = await requireTrainer();
  if (error) return error;

  const { data: client } = await admin!
    .from('clients')
    .select('id, user_id')
    .eq('id', params.clientId)
    .eq('trainer_id', user!.id)
    .maybeSingle();
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
      .select('performed_at')
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

  // 平均体重・体重変化
  const avgWeight = weights.length
    ? r1(weights.reduce((s, w) => s + Number(w.weight_kg), 0) / weights.length)
    : null;
  const weightChange =
    weights.length >= 2
      ? r1(Number(weights[weights.length - 1].weight_kg) - Number(weights[0].weight_kg))
      : null;

  // PFC（1日平均）と達成率
  const totals = meals.reduce(
    (acc, m) => ({
      calories: acc.calories + Number(m.calories ?? 0),
      protein: acc.protein + Number(m.protein ?? 0),
      fat: acc.fat + Number(m.fat ?? 0),
      carbs: acc.carbs + Number(m.carbs ?? 0),
    }),
    { calories: 0, protein: 0, fat: 0, carbs: 0 }
  );
  const avg = {
    calories: r1(totals.calories / 7),
    protein: r1(totals.protein / 7),
    fat: r1(totals.fat / 7),
    carbs: r1(totals.carbs / 7),
  };
  const achievement = {
    calories: rate(avg.calories, profile?.target_calories),
    protein: rate(avg.protein, profile?.target_protein),
    fat: rate(avg.fat, profile?.target_fat),
    carbs: rate(avg.carbs, profile?.target_carbs),
  };

  // 筋トレ回数（件数）と実施日数
  const workoutCount = workouts.length;
  const workoutDays = new Set(workouts.map((w) => toJstDateString(w.performed_at))).size;

  // AI総評
  let summary = '';
  if (process.env.OPENAI_API_KEY) {
    const userPrompt = `【今週の実績】
平均体重: ${avgWeight != null ? `${avgWeight}kg` : '記録なし'} / 目標 ${profile?.target_weight ?? '未設定'}kg
体重変化: ${weightChange != null ? `${weightChange > 0 ? '+' : ''}${weightChange}kg` : 'データ不足'}
PFC達成率: カロリー${achievement.calories ?? '—'}% / P${achievement.protein ?? '—'}% F${achievement.fat ?? '—'}% C${achievement.carbs ?? '—'}%
筋トレ回数: ${workoutCount}回（実施${workoutDays}日）

上記の週間実績に対する総評をお願いします。`;
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
      summary = completion.choices[0]?.message?.content?.trim() ?? '';
    } catch (e) {
      return NextResponse.json({ error: `OpenAI error: ${(e as Error).message}` }, { status: 502 });
    }
  } else {
    summary = 'OPENAI_API_KEY が未設定のため、AI総評は生成されませんでした。';
  }

  return NextResponse.json({
    report: {
      periodStart: start.slice(0, 10),
      periodEnd: end.slice(0, 10),
      avgWeight,
      weightChange,
      avgPfc: avg,
      achievement,
      workoutCount,
      workoutDays,
      summary,
      weights: weights.map((w) => ({
        weight_kg: Number(w.weight_kg),
        measured_at: w.measured_at,
      })),
    },
  });
}
