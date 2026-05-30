import OpenAI from 'openai';

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

const SYSTEM_PROMPT = `あなたは管理栄養士です。日本の一般的な食品データに基づき、食材名と分量からカロリー(kcal)とPFC(タンパク質・脂質・炭水化物、g)を推定してください。
必ず次のJSON形式のみで返答し、説明文は含めないでください。
{"items":[{"name":"食材名","amount":"分量","calories":数値,"protein":数値,"fat":数値,"carbs":数値}]}
itemsの件数と順序は入力と同じにしてください。数値は小数第1位まで。`;

export async function estimateNutrition(
  openai: OpenAI,
  items: NutritionEstimateInput[]
): Promise<NutritionEstimateResult[]> {
  const userPrompt = items
    .map((item, i) => `${i + 1}. ${item.name.trim()} / ${item.amount.trim()}`)
    .join('\n');

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    temperature: 0.3,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: `以下の食材の栄養素を推定してください:\n${userPrompt}` },
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

  return parsed.items.map((row, i) => ({
    name: row.name?.trim() || items[i].name,
    amount: row.amount?.trim() || items[i].amount,
    calories: round1(Number(row.calories) || 0),
    protein: round1(Number(row.protein) || 0),
    fat: round1(Number(row.fat) || 0),
    carbs: round1(Number(row.carbs) || 0),
  }));
}

function round1(n: number) {
  return Math.round(n * 10) / 10;
}
