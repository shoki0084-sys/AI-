'use client';

import { useState } from 'react';
import { parseApiResponse } from '@/lib/api-client';
import { calcCaloriesFromPfc } from '@/lib/nutrition';
import type { FoodItemWithNutrition, MealType } from '@/types/meal';

const MEAL_TYPES: { value: MealType; label: string }[] = [
  { value: 'breakfast', label: '朝食' },
  { value: 'lunch', label: '昼食' },
  { value: 'dinner', label: '夕食' },
  { value: 'snack', label: '間食' },
];

type FoodRow = FoodItemWithNutrition & { id: string };

function newFoodRow(): FoodRow {
  return {
    id: crypto.randomUUID(),
    name: '',
    amount: '',
    calories: 0,
    protein: 0,
    fat: 0,
    carbs: 0,
  };
}

type Props = {
  onSaved?: () => void;
};

export default function MealForm({ onSaved }: Props) {
  const [mealType, setMealType] = useState<MealType>('breakfast');
  const [eatenAt, setEatenAt] = useState(new Date().toISOString().slice(0, 16));
  const [items, setItems] = useState<FoodRow[]>([newFoodRow()]);
  const [estimating, setEstimating] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

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

  const addItem = () => setItems((prev) => [...prev, newFoodRow()]);

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
          eaten_at: new Date(eatenAt).toISOString(),
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
      setMessage(`✅ ${validItems.length}件の食事を保存しました`);
      setItems([newFoodRow()]);
      onSaved?.();
    } catch (err) {
      setMessage(`⚠️ ${(err as Error).message}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="card space-y-4">
        <div>
          <label className="label">食事区分</label>
          <div className="grid grid-cols-4 gap-2">
            {MEAL_TYPES.map((m) => {
              const active = mealType === m.value;
              return (
                <button
                  type="button"
                  key={m.value}
                  onClick={() => setMealType(m.value)}
                  className={`rounded-xl border px-2 py-2.5 text-sm font-medium transition ${
                    active
                      ? 'border-blue-600 bg-blue-50 text-blue-700'
                      : 'border-gray-300 bg-white text-gray-700'
                  }`}
                >
                  {m.label}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <label className="label">日時</label>
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
          <p className="text-sm font-semibold text-gray-700">食材</p>
          <button
            type="button"
            onClick={addItem}
            className="text-sm font-semibold text-blue-600"
          >
            ＋ 食材を追加
          </button>
        </div>

        {items.map((item, index) => (
          <div key={item.id} className="card space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-gray-500">食材 {index + 1}</span>
              {items.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeItem(item.id)}
                  className="text-xs text-red-600"
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
              />
            </div>

            <div>
              <label className="label">量</label>
              <input
                type="text"
                value={item.amount}
                onChange={(e) => updateItem(item.id, { amount: e.target.value })}
                className="field"
                placeholder="100g、1杯、1個 など"
              />
            </div>

            {(item.calories > 0 || item.protein > 0) && (
              <div className="rounded-xl bg-gray-50 p-3 text-xs text-gray-600">
                <p className="font-semibold text-blue-600">{item.calories} kcal</p>
                <p className="mt-1">
                  P {item.protein}g / F {item.fat}g / C {item.carbs}g
                </p>
              </div>
            )}
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={onEstimate}
        disabled={estimating}
        className="inline-flex w-full items-center justify-center rounded-xl border-2 border-blue-600 bg-white px-4 py-3 text-base font-semibold text-blue-600 disabled:opacity-50"
      >
        {estimating ? 'AI計算中…' : '🤖 AIで栄養を計算'}
      </button>

      <div className="card space-y-2">
        <p className="text-sm font-semibold text-gray-700">合計（全食材）</p>
        <div className="flex items-center justify-between">
          <span className="text-gray-600">カロリー</span>
          <span className="text-lg font-bold text-blue-600">{roundedTotals.calories} kcal</span>
        </div>
        <p className="text-xs text-gray-600">
          P {roundedTotals.protein}g / F {roundedTotals.fat}g / C {roundedTotals.carbs}g
        </p>
      </div>

      <button type="submit" disabled={submitting} className="btn-primary">
        {submitting ? '保存中…' : '保存する'}
      </button>

      {message && <p className="text-center text-sm">{message}</p>}
    </form>
  );
}
