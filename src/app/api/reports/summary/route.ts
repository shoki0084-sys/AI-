import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { getAuthContext } from '@/lib/api/auth';
import { getJstDayBounds } from '@/lib/datetime';

export const runtime = 'nodejs';

const SYSTEM_PROMPT = `あなたはボディメイクに精通したパーソナルトレーナー兼管理栄養士です。
ユーザーの直近7日間の記録（体重・PFC摂取・トレーニング）を分析し、日本語で簡潔に「週間総評」を書いてください。
良かった点・課題・来週の具体的アクション(2〜3個)を、Markdown見出し(## 良かった点 / ## 課題 / ## 来週の提案)で構造化してください。`;

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
      .select('id', { count: 'exact' })
      .eq('user_id', user!.id)
      .gte('performed_at', start)
      .lte('performed_at', end),
  ]);

  const weights = weightsRes.data ?? [];
  const meals = mealsRes.data ?? [];
  const profile = profileRes.data;
  const r1 = (n: number) => Math.round(n * 10) / 10;

  const avgWeight =
    weights.length > 0
      ? r1(weights.reduce((s, w) => s + Number(w.weight_kg ?? 0), 0) / weights.length)
      : null;
  const weightChange =
    weights.length >= 2
      ? r1(Number(weights[weights.length - 1].weight_kg) - Number(weights[0].weight_kg))
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
  const avgDaily = {
    calories: r1(totals.calories / 7),
    protein: r1(totals.protein / 7),
    fat: r1(totals.fat / 7),
    carbs: r1(totals.carbs / 7),
  };

  const userPrompt = `【直近7日間サマリー】
7日平均体重: ${avgWeight ?? '記録なし'} kg
体重増減: ${weightChange != null ? `${weightChange > 0 ? '+' : ''}${weightChange} kg` : 'データ不足'}
目標体重: ${profile?.target_weight ?? '未設定'} kg
1日平均PFC: ${avgDaily.calories}kcal / P${avgDaily.protein}g F${avgDaily.fat}g C${avgDaily.carbs}g
目標(1日): ${profile?.target_calories ?? '未設定'}kcal / P${profile?.target_protein ?? '未設定'}g F${profile?.target_fat ?? '未設定'}g C${profile?.target_carbs ?? '未設定'}g
トレーニング回数: ${workoutsRes.count ?? 0} 回 / 7日

上記をもとに週間総評をお願いします。`;

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
    const summary = completion.choices[0]?.message?.content?.trim() ?? '';
    return NextResponse.json({ summary });
  } catch (e) {
    return NextResponse.json(
      { error: `OpenAI error: ${(e as Error).message}` },
      { status: 502 }
    );
  }
}
