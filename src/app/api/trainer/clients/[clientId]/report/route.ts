import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { requireTrainer } from '@/lib/auth/admin';
import { getJstDayBounds, toJstDateString } from '@/lib/datetime';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const SYSTEM_PROMPT = `あなたはボディメイクに精通したパーソナルトレーナーです。
担当顧客の1週間の実績（体重変化・体脂肪変化・PFC達成率・食事記録率・筋トレ実施率）を踏まえ、
週間レポートの総評を日本語で簡潔に（3〜5文程度）述べてください。良い点と次週への課題を含めてください。
目標体重が現在より高い場合は増量目的、低い場合は減量目的として評価し、用語を取り違えないでください。`;

const WEEK_DAYS = 7;
const r1 = (n: number) => Math.round(n * 10) / 10;
const rate = (actual: number, target: number | null | undefined) =>
  target ? Math.round((actual / Number(target)) * 100) : null;

function pctOfWeek(days: number) {
  return Math.round((days / WEEK_DAYS) * 100);
}

function avgRate(rates: Array<number | null>) {
  const values = rates.filter((v): v is number => v != null);
  if (values.length === 0) return null;
  return Math.round(values.reduce((s, v) => s + v, 0) / values.length);
}

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

  const endBounds = getJstDayBounds();
  const startBounds = getJstDayBounds(new Date(Date.now() - 6 * 86_400_000));
  const { start } = startBounds;
  const { end } = endBounds;

  const [profileRes, weightsRes, mealsRes, workoutsRes] = await Promise.all([
    admin!
      .from('users')
      .select('target_weight, target_calories, target_protein, target_fat, target_carbs')
      .eq('id', client.user_id)
      .single(),
    admin!
      .from('weight_logs')
      .select('weight_kg, body_fat, measured_at')
      .eq('user_id', client.user_id)
      .gte('measured_at', start)
      .lte('measured_at', end)
      .order('measured_at', { ascending: true }),
    admin!
      .from('meals')
      .select('calories, protein, fat, carbs, eaten_at')
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

  const avgWeight = weights.length
    ? r1(weights.reduce((s, w) => s + Number(w.weight_kg), 0) / weights.length)
    : null;
  const weightChange =
    weights.length >= 2
      ? r1(Number(weights[weights.length - 1].weight_kg) - Number(weights[0].weight_kg))
      : null;

  const bodyFatLogs = weights.filter((w) => w.body_fat != null);
  const bodyFatChange =
    bodyFatLogs.length >= 2
      ? r1(Number(bodyFatLogs[bodyFatLogs.length - 1].body_fat) - Number(bodyFatLogs[0].body_fat))
      : null;

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
    calories: r1(totals.calories / WEEK_DAYS),
    protein: r1(totals.protein / WEEK_DAYS),
    fat: r1(totals.fat / WEEK_DAYS),
    carbs: r1(totals.carbs / WEEK_DAYS),
  };
  const achievement = {
    calories: rate(avg.calories, profile?.target_calories),
    protein: rate(avg.protein, profile?.target_protein),
    fat: rate(avg.fat, profile?.target_fat),
    carbs: rate(avg.carbs, profile?.target_carbs),
  };
  const pfcAchievementRate = avgRate([
    achievement.calories,
    achievement.protein,
    achievement.fat,
    achievement.carbs,
  ]);

  const mealDays = new Set(meals.map((m) => toJstDateString(m.eaten_at))).size;
  const mealRecordRate = pctOfWeek(mealDays);

  const workoutCount = workouts.length;
  const workoutDays = new Set(workouts.map((w) => toJstDateString(w.performed_at))).size;
  const workoutRate = pctOfWeek(workoutDays);

  const latestWeight =
    weights.length > 0 ? r1(Number(weights[weights.length - 1].weight_kg)) : null;
  const targetWeight =
    profile?.target_weight != null ? r1(Number(profile.target_weight)) : null;
  let goalDirection = '未設定';
  if (latestWeight != null && targetWeight != null) {
    const gap = targetWeight - latestWeight;
    if (Math.abs(gap) < 0.1) goalDirection = '維持';
    else if (gap > 0) goalDirection = '増量';
    else goalDirection = '減量';
  }

  let summary = '';
  if (process.env.OPENAI_API_KEY) {
    const userPrompt = `【今週の実績】
目的: ${goalDirection}
最新体重: ${latestWeight != null ? `${latestWeight}kg` : '記録なし'} / 目標 ${targetWeight ?? '未設定'}kg
体重変化: ${weightChange != null ? `${weightChange > 0 ? '+' : ''}${weightChange}kg` : 'データ不足'}
体脂肪変化: ${bodyFatChange != null ? `${bodyFatChange > 0 ? '+' : ''}${bodyFatChange}%` : 'データ不足'}
PFC達成率: ${pfcAchievementRate != null ? `${pfcAchievementRate}%` : '—'}（カロリー${achievement.calories ?? '—'}% / P${achievement.protein ?? '—'}% F${achievement.fat ?? '—'}% C${achievement.carbs ?? '—'}%）
食事記録率: ${mealRecordRate}%（${mealDays}/${WEEK_DAYS}日）
筋トレ実施率: ${workoutRate}%（${workoutDays}/${WEEK_DAYS}日・${workoutCount}回）

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
      periodStart: startBounds.label,
      periodEnd: endBounds.label,
      avgWeight,
      weightChange,
      bodyFatChange,
      avgPfc: avg,
      achievement,
      pfcAchievementRate,
      mealDays,
      mealRecordRate,
      workoutCount,
      workoutDays,
      workoutRate,
      summary,
      weights: weights.map((w) => ({
        weight_kg: Number(w.weight_kg),
        body_fat: w.body_fat != null ? Number(w.body_fat) : null,
        measured_at: w.measured_at,
      })),
    },
  });
}
