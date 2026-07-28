import OpenAI from 'openai';
import { lookupReferenceNutrition } from '@/lib/foods/reference-nutrition';
import { calcCaloriesFromPfc } from '@/lib/nutrition';

export type NutritionEstimateInput = {
  name: string;
  amount: string;
};

export type NutritionEstimateResult = {
  name: string;
  amount: string;
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
};

const SYSTEM_PROMPT = `あなたは日本の管理栄養士です。文部科学省「日本食品標準成分表」および市販の栄養管理アプリ（カロミル等）と同等の精度で、食材名と分量から栄養素を推定してください。

厳密なルール:
1. 調理済み・可食部の一般的な値を使う（例: 白米ごはんは炊飯後、鶏むねは皮なし）
2. 分量は必ず反映する（100g基準から比例計算）
3. 炭水化物(carbs)は食物繊維を含む総炭水化物
4. カロリーは原則として P×4 + F×9 + C×4 と大きく矛盾しないこと（差は±10%以内）
5. 不明な場合は類似食品の平均値を使い、過大評価しない
6. 必ず次のJSONのみ返答（説明文禁止）:
{"items":[{"name":"食材名","amount":"分量","calories":数値,"protein":数値,"fat":数値,"carbs":数値}]}
7. itemsの件数と順序は入力と同じ。数値は小数第1位まで`;

function round1(n: number) {
  return Math.round(n * 10) / 10;
}

function reconcileCalories(row: {
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
}) {
  const fromPfc = calcCaloriesFromPfc(row.protein, row.fat, row.carbs);
  if (fromPfc <= 0) return row;
  const diff = Math.abs(row.calories - fromPfc) / fromPfc;
  // PFC とカロリーが大きくずれる場合は PFC から再計算（成分表整合）
  if (diff > 0.12) {
    return { ...row, calories: fromPfc };
  }
  return row;
}

async function estimateWithAi(
  openai: OpenAI,
  items: NutritionEstimateInput[]
): Promise<NutritionEstimateResult[]> {
  const userPrompt = items
    .map((item, i) => `${i + 1}. ${item.name.trim()} / ${item.amount.trim()}`)
    .join('\n');

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    temperature: 0,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      {
        role: 'user',
        content: `日本食品標準成分表に近い値で、次の食材の栄養素を推定してください:\n${userPrompt}`,
      },
    ],
  });

  const raw = completion.choices[0]?.message?.content?.trim();
  if (!raw) throw new Error('AIからの応答がありません');

  let parsed: { items?: NutritionEstimateResult[] };
  try {
    parsed = JSON.parse(raw) as { items?: NutritionEstimateResult[] };
  } catch {
    throw new Error('AIの応答を解析できませんでした');
  }

  if (!parsed.items || parsed.items.length !== items.length) {
    throw new Error('AIの応答件数が一致しませんでした');
  }

  return parsed.items.map((row, i) => {
    const base = {
      name: row.name?.trim() || items[i].name,
      amount: row.amount?.trim() || items[i].amount,
      calories: round1(Number(row.calories) || 0),
      protein: round1(Number(row.protein) || 0),
      fat: round1(Number(row.fat) || 0),
      carbs: round1(Number(row.carbs) || 0),
    };
    const fixed = reconcileCalories(base);
    return { ...base, ...fixed, calories: round1(fixed.calories) };
  });
}

/**
 * 1) 定番食材は成分表ベース
 * 2) それ以外は AI 推定（温度0 + 成分表プロンプト）
 */
export async function estimateNutrition(
  openai: OpenAI,
  items: NutritionEstimateInput[]
): Promise<NutritionEstimateResult[]> {
  const results: (NutritionEstimateResult | null)[] = items.map((item) => {
    const hit = lookupReferenceNutrition(item.name, item.amount);
    if (!hit) return null;
    return {
      name: item.name.trim(),
      amount: item.amount.trim(),
      calories: hit.calories,
      protein: hit.protein,
      fat: hit.fat,
      carbs: hit.carbs,
    };
  });

  const missingIndexes = results
    .map((r, i) => (r == null ? i : -1))
    .filter((i) => i >= 0);

  if (missingIndexes.length > 0) {
    const missingItems = missingIndexes.map((i) => items[i]);
    const aiResults = await estimateWithAi(openai, missingItems);
    missingIndexes.forEach((itemIndex, aiIndex) => {
      results[itemIndex] = aiResults[aiIndex];
    });
  }

  return results.map((r, i) => {
    if (!r) {
      return {
        name: items[i].name,
        amount: items[i].amount,
        calories: 0,
        protein: 0,
        fat: 0,
        carbs: 0,
      };
    }
    return r;
  });
}
