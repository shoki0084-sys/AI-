import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { getAuthContext } from '@/lib/api/auth';
import { getJstDayBounds, toJstDateString } from '@/lib/datetime';

export const runtime = 'nodejs';

const SYSTEM_PROMPT = `あなたはボディメイクに精通したパーソナルトレーナー兼管理栄養士です。
ユーザーの直近7日間の記録を分析し、日本語で次の4観点について簡潔にアドバイスしてください。

1. 体重推移分析（増減傾向・目標との関係）
2. PFC分析（1日平均と目標の差、栄養バランス）
3. トレーニング頻度分析（頻度・継続性の評価）
4. 改善提案（来週への具体的アクションを3個）

出力は Markdown 見出し (## 体重推移 / ## PFC分析 / ## トレーニング頻度 / ## 改善提案) で構造化してください。`;

export async function POST() {
  const { error, user, supabase } = await getAuthContext();
  if (error) return error;

  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json(
      { error: 'OPENAI_API_KEY が未設定です。.env.local を確認してください。' },
      { status: 503 }
    );
  }

  const { end } = getJstDayBounds();
  const { start } = getJstDayBounds(new Date(Date.now() - 6 * 86_400_000));

  const [profileRes, weightsRes, mealsRes, workoutsRes] = await Promise.all([
    supabase!
      .from('users')
      .select('target_weight, target_calories, target_protein, target_fat, target_carbs')
      .eq('id', user!.id)
      .single(),
    supabase!
      .from('weight_logs')
      .select('weight_kg, measured_at')
      .eq('user_id', user!.id)
      .gte('measured_at', start)
      .lte('measured_at', end)
      .order('measured_at', { ascending: true }),
    supabase!
      .from('meals')
      .select('calories, protein, fat, carbs')
      .eq('user_id', user!.id)
      .gte('eaten_at', start)
      .lte('eaten_at', end),
    supabase!
      .from('workouts')
      .select('exercise_name, performed_at')
      .eq('user_id', user!.id)
      .gte('performed_at', start)
      .lte('performed_at', end)
      .order('performed_at', { ascending: true }),
  ]);

  const profile = profileRes.data;
  const weights = weightsRes.data ?? [];
  const meals = mealsRes.data ?? [];
  const workouts = workoutsRes.data ?? [];
  const r1 = (n: number) => Math.round(n * 10) / 10;

  if (weights.length === 0 && meals.length === 0 && workouts.length === 0) {
    return NextResponse.json(
      { error: '直近7日間の記録がありません。記録してからお試しください。' },
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
  const avgDaily = {
    calories: r1(totals.calories / 7),
    protein: r1(totals.protein / 7),
    fat: r1(totals.fat / 7),
    carbs: r1(totals.carbs / 7),
  };

  const workoutDays = new Set(workouts.map((w) => toJstDateString(w.performed_at))).size;

  const weightLine =
    weights.length > 0
      ? weights.map((w) => `${toJstDateString(w.measured_at)}: ${w.weight_kg}kg`).join(' / ')
      : '記録なし';
  const weightChange =
    weights.length >= 2
      ? r1(Number(weights[weights.length - 1].weight_kg) - Number(weights[0].weight_kg))
      : null;

  const userPrompt = `【直近7日間の記録】
■体重推移: ${weightLine}
体重増減: ${weightChange != null ? `${weightChange > 0 ? '+' : ''}${weightChange}kg` : 'データ不足'}
目標体重: ${profile?.target_weight ?? '未設定'}kg

■PFC（1日平均）: ${avgDaily.calories}kcal / P${avgDaily.protein}g F${avgDaily.fat}g C${avgDaily.carbs}g
目標(1日): ${profile?.target_calories ?? '未設定'}kcal / P${profile?.target_protein ?? '未設定'}g F${profile?.target_fat ?? '未設定'}g C${profile?.target_carbs ?? '未設定'}g

■トレーニング: 7日間で${workouts.length}件 / 実施${workoutDays}日
種目: ${workouts.length > 0 ? Array.from(new Set(workouts.map((w) => w.exercise_name))).join('、') : 'なし'}

上記を分析し、4観点でアドバイスをお願いします。`;

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
    const advice = completion.choices[0]?.message?.content?.trim() ?? '';
    return NextResponse.json({ advice });
  } catch (e) {
    return NextResponse.json(
      { error: `OpenAI error: ${(e as Error).message}` },
      { status: 502 }
    );
  }
}
