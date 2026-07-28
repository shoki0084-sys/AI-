'use client';

import { useEffect, useRef, useState } from 'react';
import { parseApiResponse } from '@/lib/api-client';
import { datetimeLocalToIso, toDatetimeLocalValue } from '@/lib/datetime';
import { COMMON_FOODS } from '@/lib/foods/common-foods';
import { getFrequentFoods, rememberFoods } from '@/lib/foods/frequent-foods';
import { nutritionForAmountChange } from '@/lib/foods/reference-nutrition';
import { MEAL_TYPE_LABELS } from '@/lib/meal-labels';
import { calcCaloriesFromPfc } from '@/lib/nutrition';
import {
  ButtonLoadingContent,
  FormLoadingOverlay,
} from '@/components/ui/Loading';
import type { FoodItemWithNutrition, MealType } from '@/types/meal';

type FoodRow = FoodItemWithNutrition & { id: string };

function newFoodRow(preset?: { name?: string; amount?: string }): FoodRow {
  return {
    id: crypto.randomUUID(),
    name: preset?.name ?? '',
    amount: preset?.amount ?? '',
    calories: 0,
    protein: 0,
    fat: 0,
    carbs: 0,
  };
}

type Props = {
  mealType: MealType;
  onSaved?: () => void;
};

export default function MealForm({ mealType, onSaved }: Props) {
  const [eatenAt, setEatenAt] = useState(() => toDatetimeLocalValue());
  const [items, setItems] = useState<FoodRow[]>([newFoodRow()]);
  const [frequent, setFrequent] = useState<{ name: string; amount: string }[]>([]);
  const [estimating, setEstimating] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [justAddedId, setJustAddedId] = useState<string | null>(null);
  const [flashChipKey, setFlashChipKey] = useState<string | null>(null);
  const [addBump, setAddBump] = useState(false);
  /** 量フィールドにフォーカスした時点の分量（比例換算の基準） */
  const amountAtFocusRef = useRef<Record<string, string>>({});

  useEffect(() => {
    setFrequent(getFrequentFoods(8));
  }, []);

  const updateItem = (id: string, patch: Partial<FoodRow>) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        const next = { ...item, ...patch };
        if ('protein' in patch || 'fat' in patch || 'carbs' in patch) {
          next.calories = calcCaloriesFromPfc(next.protein, next.fat, next.carbs);
        }
        return next;
      })
    );
  };

  /** 量の入力確定時にカロリー・PFCを連動させる */
  const applyAmountNutrition = (id: string, previousAmount: string, nextAmount: string) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        const scaled = nutritionForAmountChange({
          name: item.name,
          previousAmount,
          nextAmount,
          previous: {
            calories: item.calories,
            protein: item.protein,
            fat: item.fat,
            carbs: item.carbs,
          },
        });
        if (!scaled) {
          return { ...item, amount: nextAmount };
        }
        return {
          ...item,
          amount: nextAmount,
          calories: scaled.calories,
          protein: scaled.protein,
          fat: scaled.fat,
          carbs: scaled.carbs,
        };
      })
    );
  };

  const flashChip = (key: string) => {
    setFlashChipKey(key);
    window.setTimeout(() => {
      setFlashChipKey((current) => (current === key ? null : current));
    }, 450);
  };

  const markJustAdded = (id: string) => {
    setJustAddedId(id);
    window.setTimeout(() => {
      setJustAddedId((current) => (current === id ? null : current));
    }, 400);
  };

  const bumpAddButton = () => {
    setAddBump(true);
    window.setTimeout(() => setAddBump(false), 250);
  };

  const addItem = (preset?: { name: string; amount: string }, chipKey?: string) => {
    if (chipKey) flashChip(chipKey);
    else bumpAddButton();

    setItems((prev) => {
      const empty = prev.find((item) => !item.name.trim());
      if (empty && preset) {
        queueMicrotask(() => markJustAdded(empty.id));
        return prev.map((item) =>
          item.id === empty.id
            ? {
                ...item,
                name: preset.name,
                amount: preset.amount,
                calories: 0,
                protein: 0,
                fat: 0,
                carbs: 0,
              }
            : item
        );
      }
      const next = newFoodRow(preset);
      queueMicrotask(() => markJustAdded(next.id));
      return [...prev, next];
    });
  };

  const removeItem = (id: string) => {
    setItems((prev) => (prev.length <= 1 ? prev : prev.filter((item) => item.id !== id)));
  };

  const totals = items.reduce(
    (acc, item) => ({
      calories: acc.calories + (item.calories || 0),
      protein: acc.protein + (item.protein || 0),
      fat: acc.fat + (item.fat || 0),
      carbs: acc.carbs + (item.carbs || 0),
    }),
    { calories: 0, protein: 0, fat: 0, carbs: 0 }
  );

  const roundedTotals = {
    calories: Math.round(totals.calories * 10) / 10,
    protein: Math.round(totals.protein * 10) / 10,
    fat: Math.round(totals.fat * 10) / 10,
    carbs: Math.round(totals.carbs * 10) / 10,
  };

  const onEstimate = async () => {
    const payload = items
      .map((item) => ({ name: item.name.trim(), amount: item.amount.trim() }))
      .filter((item) => item.name);

    if (payload.length === 0) {
      setMessage('⚠️ 食材名を入力してください');
      return;
    }
    if (payload.some((item) => !item.amount)) {
      setMessage('⚠️ すべての食材に分量を入力してください');
      return;
    }

    setEstimating(true);
    setMessage(null);
    try {
      const res = await fetch('/api/meals/estimate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: payload }),
      });
      const data = await parseApiResponse<{ items: FoodItemWithNutrition[] }>(res);

      setItems((prev) => {
        const filled = prev.filter((item) => item.name.trim());
        return data.items.map((result, index) => ({
          id: filled[index]?.id ?? crypto.randomUUID(),
          name: result.name,
          amount: result.amount,
          calories: result.calories,
          protein: result.protein,
          fat: result.fat,
          carbs: result.carbs,
        }));
      });
      setMessage('✅ AIで栄養を計算しました');
    } catch (err) {
      setMessage(`⚠️ ${(err as Error).message}`);
    } finally {
      setEstimating(false);
    }
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setMessage(null);

    const validItems = items.filter((item) => item.name.trim());
    if (validItems.length === 0) {
      setMessage('⚠️ 食材を1つ以上入力してください');
      setSubmitting(false);
      return;
    }
    if (validItems.some((item) => !item.amount.trim())) {
      setMessage('⚠️ 分量を入力するか、AIで栄養を計算してください');
      setSubmitting(false);
      return;
    }
    if (validItems.some((item) => item.calories === 0 && item.protein === 0)) {
      setMessage('⚠️ 「AIで栄養を計算」を実行してください');
      setSubmitting(false);
      return;
    }

    try {
      const res = await fetch('/api/meals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          meal_type: mealType,
          eaten_at: datetimeLocalToIso(eatenAt),
          items: validItems.map(({ name, amount, calories, protein, fat, carbs }) => ({
            name,
            amount,
            calories,
            protein,
            fat,
            carbs,
          })),
        }),
      });
      await parseApiResponse(res);
      rememberFoods(validItems.map(({ name, amount }) => ({ name, amount })));
      setFrequent(getFrequentFoods(8));
      setMessage(`✅ ${MEAL_TYPE_LABELS[mealType]}を${validItems.length}件保存しました`);
      setItems([newFoodRow()]);
      onSaved?.();
    } catch (err) {
      setMessage(`⚠️ ${(err as Error).message}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="relative space-y-4">
      <FormLoadingOverlay
        show={estimating || submitting}
        label={submitting ? '食事を保存しています…' : 'AIで栄養を計算しています…'}
      />
      <div className="card space-y-4">
        <div>
          <label className="label">日時（{MEAL_TYPE_LABELS[mealType]}）</label>
          <input
            type="datetime-local"
            required
            value={eatenAt}
            onChange={(e) => setEatenAt(e.target.value)}
            className="field"
          />
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-gray-700">
            {MEAL_TYPE_LABELS[mealType]}の食材
          </p>
          <button
            type="button"
            onClick={() => addItem()}
            className={`btn-ghost ${addBump ? 'animate-tap-pop' : ''}`}
          >
            ＋ 食材を追加
          </button>
        </div>

        {frequent.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-gray-500">よく使うもの</p>
            <div className="flex flex-wrap gap-1.5">
              {frequent.map((food) => {
                const key = `freq-${food.name}-${food.amount}`;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => addItem(food, key)}
                    className={`chip ${flashChipKey === key ? 'chip-flash' : ''}`}
                  >
                    {food.name}
                    {food.amount ? ` (${food.amount})` : ''}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div className="space-y-1.5">
          <p className="text-xs font-medium text-gray-500">定番食材</p>
          <div className="flex flex-wrap gap-1.5">
            {COMMON_FOODS.map((food) => {
              const key = `common-${food.name}`;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => addItem(food, key)}
                  className={`chip ${flashChipKey === key ? 'chip-flash' : ''}`}
                >
                  {food.name}
                </button>
              );
            })}
          </div>
        </div>

        {items.map((item, index) => (
          <div
            key={item.id}
            className={`card space-y-3 ${justAddedId === item.id ? 'row-enter ring-2 ring-blue-200' : ''}`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-gray-500">食材 {index + 1}</span>
              {items.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeItem(item.id)}
                  className="btn-danger-ghost"
                >
                  削除
                </button>
              )}
            </div>

            <div>
              <label className="label">食べ物</label>
              <input
                type="text"
                value={item.name}
                onChange={(e) => updateItem(item.id, { name: e.target.value })}
                className="field"
                placeholder="鶏むね肉"
                list="common-food-suggestions"
              />
            </div>

            <div>
              <label className="label">量</label>
              <input
                type="text"
                value={item.amount}
                onChange={(e) => updateItem(item.id, { amount: e.target.value })}
                onFocus={() => {
                  amountAtFocusRef.current[item.id] = item.amount;
                }}
                onBlur={(e) =>
                  applyAmountNutrition(
                    item.id,
                    amountAtFocusRef.current[item.id] ?? item.amount,
                    e.target.value
                  )
                }
                className="field"
                placeholder="例: 100g、1/2スクープ、半分"
              />
              <p className="mt-1 text-xs text-gray-400">
                半分なら「1/2スクープ」や「0.5スクープ」。入力後に枠外をタップするとカロリー・PFCが連動します
              </p>
            </div>

            {(item.calories > 0 || item.protein > 0) && (
              <div className="card-nested text-xs text-gray-600">
                <p className="font-semibold text-blue-600">{item.calories} kcal</p>
                <p className="mt-1">
                  P {item.protein}g / F {item.fat}g / C {item.carbs}g
                </p>
              </div>
            )}
          </div>
        ))}

        <datalist id="common-food-suggestions">
          {COMMON_FOODS.map((food) => (
            <option key={food.name} value={food.name} />
          ))}
          {frequent.map((food) => (
            <option key={`opt-${food.name}`} value={food.name} />
          ))}
        </datalist>
      </div>

      <button
        type="button"
        onClick={onEstimate}
        disabled={estimating || submitting}
        className="btn-outline"
      >
        <ButtonLoadingContent loading={estimating} loadingLabel="AI計算中…" spinnerOnDark={false}>
          🤖 AIで栄養を計算
        </ButtonLoadingContent>
      </button>

      <div className="card space-y-2">
        <p className="text-sm font-semibold text-gray-700">
          {MEAL_TYPE_LABELS[mealType]}の合計
        </p>
        <div className="flex items-center justify-between">
          <span className="text-gray-600">カロリー</span>
          <span className="text-lg font-bold text-blue-600">{roundedTotals.calories} kcal</span>
        </div>
        <p className="text-xs text-gray-600">
          P {roundedTotals.protein}g / F {roundedTotals.fat}g / C {roundedTotals.carbs}g
        </p>
      </div>

      <button type="submit" disabled={submitting || estimating} className="btn-primary">
        <ButtonLoadingContent loading={submitting} loadingLabel="保存中…">
          {MEAL_TYPE_LABELS[mealType]}を保存する
        </ButtonLoadingContent>
      </button>

      {message && <p className="text-center text-sm">{message}</p>}
    </form>
  );
}
