/**
 * 日本食品標準成分表を参考にした定番食材の栄養（概算）。
 * per100: 100gあたり / perUnit: 1単位あたり（amount の単位と対応）
 */
export type FoodRef = {
  /** マッチ用の別名（小文字化して比較） */
  aliases: string[];
  /** 100g あたり。単位付き分量(g/ml)のときに使用 */
  per100?: { calories: number; protein: number; fat: number; carbs: number };
  /** 1単位あたり。個・本・杯・パック等 */
  perUnit?: {
    unit: RegExp;
    calories: number;
    protein: number;
    fat: number;
    carbs: number;
  };
};

export const FOOD_NUTRITION_REFS: FoodRef[] = [
  {
    aliases: ['白米', 'ごはん', 'ご飯', '白ごはん', '白ご飯', '米'],
    per100: { calories: 168, protein: 2.5, fat: 0.3, carbs: 37.1 },
  },
  {
    aliases: ['玄米', '玄米ごはん', '玄米ご飯'],
    per100: { calories: 165, protein: 2.8, fat: 1.0, carbs: 35.6 },
  },
  {
    aliases: ['オートミール'],
    per100: { calories: 380, protein: 13.7, fat: 5.7, carbs: 69.1 },
  },
  {
    aliases: ['食パン', 'トースト', 'パン'],
    per100: { calories: 264, protein: 9.3, fat: 4.4, carbs: 46.7 },
    perUnit: {
      unit: /(枚|切れ)/,
      calories: 158,
      protein: 5.6,
      fat: 2.6,
      carbs: 28.0,
    },
  },
  {
    aliases: ['鶏むね肉', '鶏胸肉', 'むね肉', '胸肉', '鶏むね'],
    per100: { calories: 108, protein: 22.3, fat: 1.5, carbs: 0 },
  },
  {
    aliases: ['鶏ささみ', 'ささみ'],
    per100: { calories: 105, protein: 23.0, fat: 0.8, carbs: 0 },
  },
  {
    aliases: ['鶏もも肉', 'もも肉'],
    per100: { calories: 200, protein: 16.2, fat: 14.0, carbs: 0 },
  },
  {
    aliases: ['卵', 'たまご', '玉子', '鶏卵'],
    per100: { calories: 151, protein: 12.3, fat: 10.3, carbs: 0.3 },
    perUnit: { unit: /(個|こ)/, calories: 76, protein: 6.2, fat: 5.2, carbs: 0.2 },
  },
  {
    aliases: ['納豆'],
    perUnit: {
      unit: /(パック|個|パック分)/,
      calories: 100,
      protein: 8.3,
      fat: 5.0,
      carbs: 6.1,
    },
    per100: { calories: 200, protein: 16.5, fat: 10.0, carbs: 12.1 },
  },
  {
    aliases: ['豆腐', '木綿豆腐', '豆腐（木綿）', '木綿'],
    per100: { calories: 72, protein: 6.6, fat: 4.2, carbs: 1.6 },
  },
  {
    aliases: ['絹ごし豆腐', '絹豆腐'],
    per100: { calories: 56, protein: 5.3, fat: 3.1, carbs: 2.0 },
  },
  {
    aliases: ['ヨーグルト', '無糖ヨーグルト', 'ヨーグルト（無糖）'],
    per100: { calories: 62, protein: 3.6, fat: 3.0, carbs: 4.8 },
  },
  {
    aliases: ['ギリシャヨーグルト', '脱脂ヨーグルト'],
    per100: { calories: 59, protein: 9.8, fat: 0.2, carbs: 3.7 },
  },
  {
    aliases: ['バナナ'],
    per100: { calories: 86, protein: 1.1, fat: 0.2, carbs: 22.5 },
    perUnit: { unit: /(本)/, calories: 86, protein: 1.1, fat: 0.2, carbs: 22.5 },
  },
  {
    aliases: ['りんご', 'リンゴ', '林檎'],
    per100: { calories: 54, protein: 0.2, fat: 0.1, carbs: 14.1 },
    perUnit: { unit: /(個)/, calories: 138, protein: 0.5, fat: 0.3, carbs: 36.0 },
  },
  {
    aliases: ['サラダチキン'],
    per100: { calories: 110, protein: 24.0, fat: 1.2, carbs: 0.5 },
    perUnit: { unit: /(袋|パック|本)/, calories: 110, protein: 24.0, fat: 1.2, carbs: 0.5 },
  },
  {
    aliases: ['プロテイン', 'ホエイ', 'プロテイン（ホエイ）', 'ホエイプロテイン'],
    // 1スクープ≈30g 換算（製品により差あり）
    per100: { calories: 400, protein: 80.0, fat: 5.0, carbs: 8.3 },
    perUnit: {
      unit: /(スクープ|杯|回分|杯分)/,
      calories: 120,
      protein: 24.0,
      fat: 1.5,
      carbs: 2.5,
    },
  },
  {
    aliases: ['牛乳', 'ミルク'],
    per100: { calories: 67, protein: 3.3, fat: 3.8, carbs: 4.8 },
  },
  {
    aliases: ['味噌汁', 'みそ汁'],
    perUnit: { unit: /(杯|碗)/, calories: 35, protein: 2.2, fat: 1.0, carbs: 4.0 },
  },
  {
    aliases: ['サバ缶', 'さば缶', '鯖缶'],
    perUnit: { unit: /(缶)/, calories: 190, protein: 20.0, fat: 12.0, carbs: 0.5 },
    per100: { calories: 190, protein: 20.0, fat: 12.0, carbs: 0.5 },
  },
  {
    aliases: ['ツナ', 'ツナ缶', 'ツナ（水煮）', 'ツナ水煮'],
    perUnit: { unit: /(缶)/, calories: 70, protein: 15.0, fat: 1.0, carbs: 0.2 },
    per100: { calories: 80, protein: 17.0, fat: 1.0, carbs: 0.2 },
  },
  {
    aliases: ['ブロッコリー'],
    per100: { calories: 33, protein: 4.3, fat: 0.5, carbs: 5.2 },
  },
  {
    aliases: ['さつまいも', 'サツマイモ', 'さつま芋'],
    per100: { calories: 132, protein: 1.2, fat: 0.2, carbs: 31.5 },
  },
  {
    aliases: ['うどん', 'かけうどん'],
    per100: { calories: 105, protein: 2.6, fat: 0.4, carbs: 21.6 },
  },
  {
    aliases: ['そば', '蕎麦'],
    per100: { calories: 114, protein: 4.8, fat: 0.7, carbs: 22.1 },
  },
  {
    aliases: ['鮭', 'さけ', 'サーモン', '焼き鮭'],
    per100: { calories: 133, protein: 22.3, fat: 4.1, carbs: 0.1 },
  },
  {
    aliases: ['アボカド'],
    per100: { calories: 187, protein: 2.5, fat: 18.7, carbs: 6.2 },
    perUnit: { unit: /(個|半分|1\/2)/, calories: 187, protein: 2.5, fat: 18.7, carbs: 6.2 },
  },
];

function normalizeName(name: string) {
  return name
    .trim()
    .toLowerCase()
    .replace(/（.*?）|\(.*?\)/g, '')
    .replace(/\s+/g, '');
}

function findRef(name: string): FoodRef | null {
  const n = normalizeName(name);
  let best: FoodRef | null = null;
  let bestLen = 0;
  for (const ref of FOOD_NUTRITION_REFS) {
    for (const alias of ref.aliases) {
      const a = normalizeName(alias);
      if (n.includes(a) || a.includes(n)) {
        if (a.length > bestLen) {
          best = ref;
          bestLen = a.length;
        }
      }
    }
  }
  return best;
}

function parseGrams(amount: string): number | null {
  const m = amount.replace(/,/g, '').match(/(\d+(?:\.\d+)?)\s*(g|グラム|ml|ミリリットル)/i);
  if (!m) return null;
  return Number(m[1]);
}

/** 「1/2」「半分」「0.5」など数量だけを解釈 */
function parseFractionOrNumber(amount: string): number | null {
  const normalized = amount.replace(/,/g, '').trim();
  if (/^(半分|ハーフ|half)$/i.test(normalized) || /半分|ハーフ/.test(normalized)) {
    // 「半分スクープ」「プロテイン半分」など
    if (!/\d/.test(normalized) || /半分|ハーフ/.test(normalized)) {
      const fracOnly = normalized.match(/(\d+)\s*\/\s*(\d+)/);
      if (fracOnly) return Number(fracOnly[1]) / Number(fracOnly[2]);
      if (/半分|ハーフ|half/i.test(normalized)) return 0.5;
    }
  }
  const frac = normalized.match(/(\d+)\s*\/\s*(\d+)/);
  if (frac) {
    const den = Number(frac[2]);
    if (den > 0) return Number(frac[1]) / den;
  }
  if (/^(1\/4|四分の一|1／4)$/.test(normalized)) return 0.25;
  const plain = normalized.match(/^(\d+(?:\.\d+)?)$/);
  if (plain) return Number(plain[1]);
  return null;
}

function parseUnitCount(amount: string, unitRe: RegExp): number | null {
  const text = amount.replace(/,/g, '').trim();

  // 1/2スクープ・1/4杯（先に判定。後段の「2スクープ」誤検出を防ぐ）
  const fracUnit = new RegExp(`(\\d+)\\s*/\\s*(\\d+)\\s*(?:${unitRe.source})`);
  const fracMatch = text.match(fracUnit);
  if (fracMatch) {
    const den = Number(fracMatch[2]);
    if (den > 0) return Number(fracMatch[1]) / den;
  }

  // 半分スクープ・ハーフ杯
  if (/(半分|ハーフ|half)/i.test(text) && unitRe.test(text)) {
    return 0.5;
  }

  // 1.5スクープ / 0.5杯（分数の分母と誤認しないよう lookbehind）
  const re = new RegExp(`(?<!\\d/)(\\d+(?:\\.\\d+)?)\\s*(?:${unitRe.source})`, 'g');
  const matches = [...text.matchAll(re)];
  if (matches.length > 0) {
    return Number(matches[matches.length - 1][1]);
  }

  // 単位のみ（「スクープ」「杯」）→ 1
  if (unitRe.test(text) && !/\d/.test(text) && !/(半分|ハーフ|half)/i.test(text)) {
    return 1;
  }

  // 「半分」「1/2」「0.5」のみ（単位なし）
  const bare = parseFractionOrNumber(text);
  if (bare != null && bare > 0) {
    if (
      unitRe.test(text) ||
      !/[a-zA-Zぁ-んァ-ン一-龥]/.test(
        text.replace(/半分|ハーフ|half|スクープ|杯|回分|杯分|個|本|枚|切れ|パック|缶|碗|袋/g, '')
      )
    ) {
      return bare;
    }
    if (/^(半分|ハーフ|half|1\s*\/\s*\d+|0\.\d+)$/i.test(text.trim())) {
      return bare;
    }
  }

  return null;
}

/**
 * 分量変更に合わせて栄養を再計算する。
 * 1) 成分表ヒット → そのまま採用
 * 2) 同じ単位系で数量比が取れる → 比例換算
 * 取れなければ null（AI再計算が必要）
 */
export function nutritionForAmountChange(params: {
  name: string;
  previousAmount: string;
  nextAmount: string;
  previous: { calories: number; protein: number; fat: number; carbs: number };
}): { calories: number; protein: number; fat: number; carbs: number } | null {
  const { name, previousAmount, nextAmount, previous } = params;
  const next = nextAmount.trim();
  if (!next) return null;

  const fromRef = lookupReferenceNutrition(name, next);
  if (fromRef) {
    return {
      calories: fromRef.calories,
      protein: fromRef.protein,
      fat: fromRef.fat,
      carbs: fromRef.carbs,
    };
  }

  const hasNutrition =
    previous.calories > 0 ||
    previous.protein > 0 ||
    previous.fat > 0 ||
    previous.carbs > 0;
  if (!hasNutrition) return null;

  const prevQ = parseComparableQuantity(previousAmount);
  const nextQ = parseComparableQuantity(next);
  if (!prevQ || !nextQ || prevQ.value <= 0 || nextQ.value <= 0) return null;
  if (prevQ.unitKey !== nextQ.unitKey) return null;

  const ratio = nextQ.value / prevQ.value;
  return {
    calories: round1(previous.calories * ratio),
    protein: round1(previous.protein * ratio),
    fat: round1(previous.fat * ratio),
    carbs: round1(previous.carbs * ratio),
  };
}

/** g/ml または 個数・分数を、単位キー付きで取り出す（比例換算用） */
function parseComparableQuantity(
  amount: string
): { value: number; unitKey: string } | null {
  const text = amount.replace(/,/g, '').trim();
  if (!text) return null;

  const grams = parseGrams(text);
  if (grams != null && grams > 0) {
    const isMl = /(ml|ミリリットル)/i.test(text);
    return { value: grams, unitKey: isMl ? 'ml' : 'g' };
  }

  if (/(半分|ハーフ|half)/i.test(text) && !/\d/.test(text.replace(/1\s*\/\s*2/, ''))) {
    const unit = text
      .replace(/(半分|ハーフ|half)/gi, '')
      .replace(/\s+/g, '')
      .toLowerCase();
    return { value: 0.5, unitKey: unit || 'portion' };
  }

  const frac = text.match(/(\d+)\s*\/\s*(\d+)\s*(.*)$/);
  if (frac) {
    const den = Number(frac[2]);
    if (den > 0) {
      const unit = frac[3].replace(/\s+/g, '').toLowerCase() || 'portion';
      return { value: Number(frac[1]) / den, unitKey: unit };
    }
  }

  const numUnit = text.match(/(\d+(?:\.\d+)?)\s*(.*)$/);
  if (numUnit) {
    const unit = numUnit[2].replace(/\s+/g, '').toLowerCase() || 'portion';
    return { value: Number(numUnit[1]), unitKey: unit };
  }

  return null;
}

function round1(n: number) {
  return Math.round(n * 10) / 10;
}

export type LookupNutrition = {
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
  source: 'reference';
};

/** 成分表ベースで推定できる場合のみ返す。できなければ null */
export function lookupReferenceNutrition(
  name: string,
  amount: string
): LookupNutrition | null {
  const ref = findRef(name);
  if (!ref) return null;

  if (ref.perUnit) {
    const count = parseUnitCount(amount, ref.perUnit.unit);
    if (count != null && count > 0) {
      return {
        calories: round1(ref.perUnit.calories * count),
        protein: round1(ref.perUnit.protein * count),
        fat: round1(ref.perUnit.fat * count),
        carbs: round1(ref.perUnit.carbs * count),
        source: 'reference',
      };
    }
  }

  const grams = parseGrams(amount);
  if (grams != null && ref.per100 && grams > 0) {
    const k = grams / 100;
    return {
      calories: round1(ref.per100.calories * k),
      protein: round1(ref.per100.protein * k),
      fat: round1(ref.per100.fat * k),
      carbs: round1(ref.per100.carbs * k),
      source: 'reference',
    };
  }

  return null;
}
