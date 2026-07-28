import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { getAuthContext } from '@/lib/api/auth';
import {
  formatWeightChangeKg,
  isWeightPlateau,
  PLATEAU_THRESHOLD_KG,
} from '@/lib/advice/plateau';
import { getJstDayBounds, toJstDateString } from '@/lib/datetime';

export const runtime = 'nodejs';

const BASE_SYSTEM_PROMPT = `あなたはボディメイクに精通したパーソナルトレーナー兼管理栄養士です。
ユーザーの直近7日間の記録を分析し、日本語で次の4観点について簡潔にアドバイスしてください。

1. 体重推移分析（増減傾向・目標との関係）
2. PFC分析（1日平均と目標の差、栄養バランス）
3. トレーニング頻度分析（頻度・継続性の評価）
4. 改善提案（来週への具体的アクションを3個）

【体重評価の厳守ルール】
- 目的が「増量」のとき: 体重減少は目標から遠ざかっていると評価する。減量・ダイエット前提の表現は禁止。
- 目的が「減量」のとき: 体重増加は目標から遠ざかっていると評価する。増量前提の表現は禁止。
- 「目標に近づいている」は、実際に目標体重との差が縮んでいる場合のみ使う。
- 増量・減量・維持の用語を取り違えない。

出力は Markdown 見出し (## 体重推移 / ## PFC分析 / ## トレーニング頻度 / ## 改善提案) で構造化してください。`;

const PLATEAU_SYSTEM_PROMPT = `あなたはボディメイクに精通したパーソナルトレーナー兼管理栄養士です。
ユーザーの直近7日間の体重変化は ±${PLATEAU_THRESHOLD_KG}kg 以内で、システムが「停滞」と判定しています。
通常の4観点に加え、停滞突破のための提案を必ず含めてください。

1. 体重推移分析（停滞である旨を明記）
2. PFC分析（1日平均と目標の差、栄養バランス）
3. トレーニング頻度分析（頻度・継続性の評価）
4. 改善提案（来週への具体的アクション）
5. 停滞突破提案（必須・以下3項目をそれぞれ具体的に）
   - 摂取カロリー調整案（目的が増量なら増やす案、減量なら減らす/配分見直し案）
   - 有酸素提案（種目・時間・頻度）
   - トレーニング提案（種目・ボリューム・頻度の調整）

【体重評価の厳守ルール】
- 目的が「増量」のとき: 減量・ダイエット前提の表現は禁止。
- 目的が「減量」のとき: 増量前提の表現は禁止。
- 増量・減量・維持の用語を取り違えない。

出力は Markdown 見出し (
## 体重推移 / ## PFC分析 / ## トレーニング頻度 / ## 改善提案 / ## 停滞突破提案
) で構造化し、## 停滞突破提案 の中に ### 摂取カロリー調整案 / ### 有酸素提案 / ### トレーニング提案 を含めてください。`;

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
  const latestWeight =
    weights.length > 0 ? r1(Number(weights[weights.length - 1].weight_kg)) : null;
  const weightChange =
    weights.length >= 2
      ? r1(Number(weights[weights.length - 1].weight_kg) - Number(weights[0].weight_kg))
      : null;
  const plateau = isWeightPlateau(weightChange);

  const targetWeight =
    profile?.target_weight != null ? r1(Number(profile.target_weight)) : null;
  const weightGap =
    latestWeight != null && targetWeight != null
      ? r1(targetWeight - latestWeight)
      : null;
  let goalDirection = '未設定';
  let progressNote = '目標体重または最新体重が未設定のため判定不可';
  if (latestWeight != null && targetWeight != null && weightGap != null) {
    if (Math.abs(weightGap) < 0.1) {
      goalDirection = '維持';
      progressNote = '目標体重付近を維持中';
    } else if (weightGap > 0) {
      goalDirection = '増量';
      if (weightChange == null) {
        progressNote = `目標まであと${weightGap}kg（増やす必要あり）`;
      } else if (weightChange > 0) {
        progressNote = `目標まであと${weightGap}kg。期間中に+${weightChange}kgで目標に近づいている`;
      } else if (weightChange < 0) {
        progressNote = `目標まであと${weightGap}kg。期間中に${weightChange}kgで目標から遠ざかっている`;
      } else {
        progressNote = `目標まであと${weightGap}kg。期間中の体重変化なし`;
      }
    } else {
      goalDirection = '減量';
      const remain = r1(Math.abs(weightGap));
      if (weightChange == null) {
        progressNote = `目標まであと${remain}kg（減らす必要あり）`;
      } else if (weightChange < 0) {
        progressNote = `目標まであと${remain}kg。期間中に${weightChange}kgで目標に近づいている`;
      } else if (weightChange > 0) {
        progressNote = `目標まであと${remain}kg。期間中に+${weightChange}kgで目標から遠ざかっている`;
      } else {
        progressNote = `目標まであと${remain}kg。期間中の体重変化なし`;
      }
    }
  }

  const plateauLine = plateau
    ? `停滞判定: はい（7日間の体重変化 ${formatWeightChangeKg(weightChange)} が ±${PLATEAU_THRESHOLD_KG}kg 以内）`
    : `停滞判定: いいえ（7日間の体重変化 ${formatWeightChangeKg(weightChange)}）`;

  const userPrompt = `【直近7日間の記録】
■体重推移: ${weightLine}
最新体重: ${latestWeight != null ? `${latestWeight}kg` : '記録なし'}
目標体重: ${targetWeight != null ? `${targetWeight}kg` : '未設定'}
体重増減（期間）: ${formatWeightChangeKg(weightChange)}
${plateauLine}
目的: ${goalDirection}
進捗判定: ${progressNote}

■PFC（1日平均）: ${avgDaily.calories}kcal / P${avgDaily.protein}g F${avgDaily.fat}g C${avgDaily.carbs}g
目標(1日): ${profile?.target_calories ?? '未設定'}kcal / P${profile?.target_protein ?? '未設定'}g F${profile?.target_fat ?? '未設定'}g C${profile?.target_carbs ?? '未設定'}g

■トレーニング: 7日間で${workouts.length}件 / 実施${workoutDays}日
種目: ${workouts.length > 0 ? Array.from(new Set(workouts.map((w) => w.exercise_name))).join('、') : 'なし'}

上記を分析しアドバイスをお願いします。目的（${goalDirection}）と進捗判定を必ず守ってください。${
    plateau
      ? '停滞と判定されているため、停滞突破提案（摂取カロリー調整案・有酸素提案・トレーニング提案）を必ず含めてください。'
      : ''
  }`;

  try {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      temperature: 0.6,
      messages: [
        { role: 'system', content: plateau ? PLATEAU_SYSTEM_PROMPT : BASE_SYSTEM_PROMPT },
        { role: 'user', content: userPrompt },
      ],
    });
    const advice = completion.choices[0]?.message?.content?.trim() ?? '';
    return NextResponse.json({
      advice,
      isPlateau: plateau,
      weightChange,
      plateauThresholdKg: PLATEAU_THRESHOLD_KG,
    });
  } catch (e) {
    return NextResponse.json(
      { error: `OpenAI error: ${(e as Error).message}` },
      { status: 502 }
    );
  }
}
