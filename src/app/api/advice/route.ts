import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { getAuthContext } from '@/lib/api/auth';
import {
  formatDateJa,
  getJstDayBoundsFromString,
  getJstTodayString,
} from '@/lib/datetime';

export const runtime = 'nodejs';

const SYSTEM_PROMPT = `あなたはボディメイクに精通した管理栄養士兼パーソナルトレーナーです。
ユーザーの食事記録を分析し、以下の3つの観点で日本語で簡潔にアドバイスしてください。

1. 食事内容の分析（栄養素の偏り、食材の質）
2. PFCバランスの評価（目標値との差分）
3. 具体的な改善提案（次の食事や明日への提案を2〜3個）

出力は Markdown 見出し (## 食事内容分析 / ## PFCバランス / ## 改善提案) で構造化してください。`;

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

  const { data: profile } = await supabase!
    .from('users')
    .select('target_calories, target_protein, target_fat, target_carbs')
    .eq('id', user!.id)
    .single();

  const { data: meals, error: mealsError } = await supabase!
    .from('meals')
    .select('meal_type, food_name, calories, protein, fat, carbs, eaten_at')
    .eq('user_id', user!.id)
    .gte('eaten_at', start)
    .lte('eaten_at', end)
    .order('eaten_at', { ascending: true });

  if (mealsError)
    return NextResponse.json({ error: mealsError.message }, { status: 500 });

  if (!meals || meals.length === 0) {
    return NextResponse.json(
      {
        error: `${formatDateJa(adviceDate)}の食事記録がありません。食事タブで記録してからお試しください。`,
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
  const userPrompt = `【${dateLabel}の食事記録】
${meals
  .map(
    (m) =>
      `- [${m.meal_type}] ${m.food_name} (${m.calories}kcal / P${m.protein}g F${m.fat}g C${m.carbs}g)`
  )
  .join('\n')}

【合計】
カロリー: ${totals.calories} kcal / P: ${totals.protein}g / F: ${totals.fat}g / C: ${totals.carbs}g

【目標値】
カロリー: ${profile?.target_calories ?? '未設定'} kcal / P: ${profile?.target_protein ?? '未設定'}g / F: ${profile?.target_fat ?? '未設定'}g / C: ${profile?.target_carbs ?? '未設定'}g

上記を分析し、アドバイスをお願いします。`;

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
