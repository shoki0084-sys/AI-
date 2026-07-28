'use client';

import { useState } from 'react';
import MealForm from '@/components/meals/MealForm';
import MealList from '@/components/meals/MealList';
import { MEAL_TYPE_LABELS } from '@/lib/meal-labels';
import type { MealType } from '@/types/meal';

const MEAL_TYPES: { value: MealType; label: string }[] = [
  { value: 'breakfast', label: '朝' },
  { value: 'lunch', label: '昼' },
  { value: 'dinner', label: '夜' },
  { value: 'snack', label: '間食' },
];

export default function MealsPage() {
  const [refreshKey, setRefreshKey] = useState(0);
  const [mealType, setMealType] = useState<MealType>('breakfast');

  return (
    <main className="page-main">
      <header className="pt-2 space-y-3">
        <h1 className="page-title">食事を記録</h1>
        <div className="card space-y-2">
          <div className="grid grid-cols-4 gap-2">
            {MEAL_TYPES.map((m) => {
              const active = mealType === m.value;
              return (
                <button
                  type="button"
                  key={m.value}
                  onClick={() => setMealType(m.value)}
                  className={`btn-segment ${active ? 'btn-segment-active' : ''}`}
                >
                  {m.label}
                </button>
              );
            })}
          </div>
          <p className="text-xs text-gray-500">
            いま表示・入力しているのは <span className="font-semibold text-gray-700">{MEAL_TYPE_LABELS[mealType]}</span> だけです
          </p>
        </div>
      </header>
      <MealForm
        key={mealType}
        mealType={mealType}
        onSaved={() => setRefreshKey((k) => k + 1)}
      />
      <MealList mealType={mealType} refreshKey={refreshKey} />
    </main>
  );
}
