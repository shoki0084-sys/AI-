import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { getAuthContext } from '@/lib/api/auth';
import {
  formatDateJa,
  getJstDayBoundsFromString,
  getJstTodayString,
  toJstDateString,
} from '@/lib/datetime';

export const runtime = 'nodejs';

const SYSTEM_PROMPT = `あなたはボディメイクに精通した管理栄養士兼パーソナルトレーナーです。
ユーザーの1日の食事・体重・筋トレ記録と、その日の主観コメント（体調・睡眠・空腹感・自由コメント）を分析し、以下の4観点で日本語で簡潔にアドバイスしてください。

1. 食事評価（栄養素の偏り、PFCバランス、目標との差）
2. 体重評価（その日の体重・推移・目標体重との関係）
3. トレーニング評価（実施内容・ボリューム・継続性）
4. 明日の改善提案（具体的なアクションを2〜3個）

記録がない項目は「記録なし」と明記し、他の項目は可能な範囲で評価してください。
主観コメントがある場合は、外食・飲み会・睡眠不足などの文脈も踏まえて提案に反映してください。

【体重評価の厳守ルール】
- 目標体重が現在体重より高い → 増量が目的。体重減少は目標から遠ざかっていると評価する。
- 目標体重が現在体重より低い → 減量が目的。体重増加は目標から遠ざかっていると評価する。
- 「目標に近づいている」は、実際に目標との差が縮んでいる場合のみ使う。
- 増量・減量の用語を取り違えない。

出力は Markdown 見出し (## 食事評価 / ## 体重評価 / ## トレーニング評価 / ## 明日の改善提案) で構造化してください。`;

function resolveAdviceDate(body?: { date?: string }) {
  const raw = body?.date?.trim();
  if (!raw) return getJstTodayString();
  getJstDayBoundsFromString(raw);
  return raw;
}

export async function POST(req: Request) {
  const { error, user, supabase } = await getAuthContext();
  if (error) return error;

  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json(
      { error: 'OPENAI_API_KEY が未設定です。.env.local を確認してください。' },
      { status: 503 }
    );
  }

  let adviceDate: string;
  try {
    const body = (await req.json().catch(() => ({}))) as { date?: string };
    adviceDate = resolveAdviceDate(body);
  } catch {
    return NextResponse.json({ error: 'invalid date' }, { status: 400 });
  }

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const { start, end } = getJstDayBoundsFromString(adviceDate);
  const padMs = 12 * 60 * 60 * 1000;
  const startPad = new Date(new Date(start).getTime() - padMs).toISOString();
  const endPad = new Date(new Date(end).getTime() + padMs).toISOString();

  const { data: profile } = await supabase!
    .from('users')
    .select('target_weight, target_calories, target_protein, target_fat, target_carbs')
    .eq('id', user!.id)
    .single();

  const [mealsRes, weightsRes, workoutsRes, commentRes] = await Promise.all([
    supabase!
      .from('meals')
      .select('meal_type, food_name, calories, protein, fat, carbs, eaten_at')
      .eq('user_id', user!.id)
      .gte('eaten_at', startPad)
      .lte('eaten_at', endPad)
      .order('eaten_at', { ascending: true }),
    supabase!
      .from('weight_logs')
      .select('weight_kg, body_fat, measured_at')
      .eq('user_id', user!.id)
      .gte('measured_at', startPad)
      .lte('measured_at', endPad)
      .order('measured_at', { ascending: true }),
    supabase!
      .from('workouts')
      .select('exercise_name, weight_kg, reps, sets, performed_at')
      .eq('user_id', user!.id)
      .gte('performed_at', startPad)
      .lte('performed_at', endPad)
      .order('performed_at', { ascending: true }),
    supabase!
      .from('daily_comments')
      .select('condition, sleep_hours, hunger, free_comment, comment_date')
      .eq('user_id', user!.id)
      .eq('comment_date', adviceDate)
      .maybeSingle(),
  ]);

  const meals = (mealsRes.data ?? []).filter(
    (m) => toJstDateString(m.eaten_at) === adviceDate
  );
  const weights = (weightsRes.data ?? []).filter(
    (w) => toJstDateString(w.measured_at) === adviceDate
  );
  const workouts = (workoutsRes.data ?? []).filter(
    (w) => toJstDateString(w.performed_at) === adviceDate
  );
  const dailyComment = commentRes.data;

  if (mealsRes.error)
    return NextResponse.json({ error: mealsRes.error.message }, { status: 500 });
  if (weightsRes.error)
    return NextResponse.json({ error: weightsRes.error.message }, { status: 500 });
  if (workoutsRes.error)
    return NextResponse.json({ error: workoutsRes.error.message }, { status: 500 });
  if (commentRes.error)
    return NextResponse.json({ error: commentRes.error.message }, { status: 500 });

  if (
    meals.length === 0 &&
    weights.length === 0 &&
    workouts.length === 0 &&
    !dailyComment
  ) {
    return NextResponse.json(
      {
        error: `${formatDateJa(adviceDate)}の食事・体重・筋トレ・コメントの記録がありません。記録してからお試しください。`,
      },
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

  const dateLabel = formatDateJa(adviceDate);

  const mealSection =
    meals.length > 0
      ? `${meals
          .map(
            (m) =>
              `- [${m.meal_type}] ${m.food_name} (${m.calories}kcal / P${m.protein}g F${m.fat}g C${m.carbs}g)`
          )
          .join('\n')}\n合計: ${totals.calories} kcal / P: ${totals.protein}g / F: ${totals.fat}g / C: ${totals.carbs}g`
      : '記録なし';

  const weightSection =
    weights.length > 0
      ? weights
          .map((w) => {
            const bf = w.body_fat != null ? ` / 体脂肪${w.body_fat}%` : '';
            return `- ${w.weight_kg}kg${bf}（${w.measured_at}）`;
          })
          .join('\n')
      : '記録なし';

  const latestWeightKg =
    weights.length > 0 ? Number(weights[weights.length - 1].weight_kg) : null;
  const targetWeightKg =
    profile?.target_weight != null ? Number(profile.target_weight) : null;
  let goalDirection = '未設定';
  if (latestWeightKg != null && targetWeightKg != null) {
    const gap = targetWeightKg - latestWeightKg;
    if (Math.abs(gap) < 0.1) goalDirection = '維持';
    else if (gap > 0) goalDirection = '増量';
    else goalDirection = '減量';
  }

  const workoutSection =
    workouts.length > 0
      ? workouts
          .map(
            (w) =>
              `- ${w.exercise_name}: ${w.weight_kg}kg × ${w.reps}回 × ${w.sets}セット`
          )
          .join('\n')
      : '記録なし';

  const commentSection = dailyComment
    ? [
        `- 体調: ${dailyComment.condition ?? '未記入'}`,
        `- 睡眠時間: ${dailyComment.sleep_hours != null ? `${dailyComment.sleep_hours}時間` : '未記入'}`,
        `- 空腹感: ${dailyComment.hunger ?? '未記入'}`,
        `- 自由コメント: ${dailyComment.free_comment ?? '未記入'}`,
      ].join('\n')
    : '記録なし';

  const userPrompt = `【${dateLabel}の記録】

■食事
${mealSection}
目標(1日): ${profile?.target_calories ?? '未設定'}kcal / P${profile?.target_protein ?? '未設定'}g F${profile?.target_fat ?? '未設定'}g C${profile?.target_carbs ?? '未設定'}g

■体重
${weightSection}
目標体重: ${profile?.target_weight ?? '未設定'}kg
目的: ${goalDirection}

■筋トレ
${workoutSection}

■その日のコメント
${commentSection}

上記を分析し、4観点（食事評価・体重評価・トレーニング評価・明日の改善提案）でアドバイスをお願いします。目的（${goalDirection}）を取り違えないでください。`;

  let advice: string;
  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      temperature: 0.6,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userPrompt },
      ],
    });
    advice = completion.choices[0]?.message?.content?.trim() ?? '';
  } catch (e) {
    return NextResponse.json(
      { error: `OpenAI error: ${(e as Error).message}` },
      { status: 502 }
    );
  }

  const { data: saved, error: saveError } = await supabase!
    .from('advices')
    .upsert(
      {
        user_id: user!.id,
        prompt: userPrompt,
        response: advice,
        category: 'meal',
        advice_date: adviceDate,
      },
      { onConflict: 'user_id,advice_date' }
    )
    .select('id, response, advice_date, created_at')
    .single();

  if (saveError) {
    const { data: inserted, error: insertError } = await supabase!
      .from('advices')
      .insert({
        user_id: user!.id,
        prompt: userPrompt,
        response: advice,
        category: 'meal',
        advice_date: adviceDate,
      })
      .select('id, response, advice_date, created_at')
      .single();

    if (insertError)
      return NextResponse.json({ error: insertError.message }, { status: 500 });

    return NextResponse.json({
      advice,
      advice_date: adviceDate,
      saved: inserted,
      totals,
      target: profile ?? null,
    });
  }

  return NextResponse.json({
    advice,
    advice_date: adviceDate,
    saved,
    totals,
    target: profile ?? null,
  });
}

export async function GET(req: Request) {
  const { error, user, supabase } = await getAuthContext();
  if (error) return error;

  const dateParam = new URL(req.url).searchParams.get('date');

  if (dateParam) {
    try {
      getJstDayBoundsFromString(dateParam);
    } catch {
      return NextResponse.json({ error: 'invalid date' }, { status: 400 });
    }

    const { data, error: dbError } = await supabase!
      .from('advices')
      .select('id, response, advice_date, category, created_at')
      .eq('user_id', user!.id)
      .eq('advice_date', dateParam)
      .maybeSingle();

    if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 });
    return NextResponse.json({ advice: data });
  }

  const { data, error: dbError } = await supabase!
    .from('advices')
    .select('id, response, advice_date, category, created_at')
    .eq('user_id', user!.id)
    .order('advice_date', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false })
    .limit(30);

  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 });
  return NextResponse.json({ advices: data });
}
