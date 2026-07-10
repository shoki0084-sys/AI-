'use client';

import { useCallback, useEffect, useState } from 'react';
import { parseApiResponse } from '@/lib/api-client';
import { formatDateTimeJa } from '@/lib/datetime';
import { MEAL_TYPE_LABELS } from '@/lib/meal-labels';
import type { Meal } from '@/types/meal';

type Props = {
  refreshKey?: number;
};

function sumMeals(meals: Meal[]) {
  return meals.reduce(
    (acc, m) => ({
      calories: acc.calories + Number(m.calories ?? 0),
      protein: acc.protein + Number(m.protein ?? 0),
      fat: acc.fat + Number(m.fat ?? 0),
      carbs: acc.carbs + Number(m.carbs ?? 0),
    }),
    { calories: 0, protein: 0, fat: 0, carbs: 0 }
  );
}

type ProfileTargets = {
  target_calories: number | null;
  target_protein: number | null;
  target_fat: number | null;
  target_carbs: number | null;
};

function round1(n: number) {
  return Math.round(n * 10) / 10;
}

function formatRemaining(current: number, target: number | null, unit: string) {
  if (target == null || target <= 0) return '—';
  const diff = round1(target - current);
  if (diff < 0) return `超過 ${Math.abs(diff)}${unit}`;
  return `${diff}${unit}`;
}

const PFC_ROWS = [
  { key: 'calories' as const, label: 'カロリー', unit: 'kcal', targetKey: 'target_calories' as const },
  { key: 'protein' as const, label: 'タンパク質', unit: 'g', targetKey: 'target_protein' as const },
  { key: 'fat' as const, label: '脂質', unit: 'g', targetKey: 'target_fat' as const },
  { key: 'carbs' as const, label: '炭水化物', unit: 'g', targetKey: 'target_carbs' as const },
];

export default function MealList({ refreshKey = 0 }: Props) {
  const [todayMeals, setTodayMeals] = useState<Meal[]>([]);
  const [recentMeals, setRecentMeals] = useState<Meal[]>([]);
  const [targets, setTargets] = useState<ProfileTargets | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [todayRes, allRes, profileRes] = await Promise.all([
        fetch('/api/meals?scope=today'),
        fetch('/api/meals'),
        fetch('/api/profile'),
      ]);
      const todayData = await parseApiResponse<{ meals: Meal[] }>(todayRes);
      const allData = await parseApiResponse<{ meals: Meal[] }>(allRes);
      const profileData = await parseApiResponse<{ profile: ProfileTargets | null }>(profileRes);
      setTodayMeals(todayData.meals ?? []);
      setRecentMeals((allData.meals ?? []).slice(0, 30));
      setTargets(profileData.profile);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load, refreshKey]);

  const todayTotals = sumMeals(todayMeals);

  if (loading) {
    return <p className="text-sm text-gray-500">記録を読み込み中…</p>;
  }

  if (error) {
    return <p className="text-sm text-amber-700">⚠️ {error}</p>;
  }

  return (
    <div className="space-y-4">
      <section className="card space-y-3">
        <h2 className="section-title">本日のPFC（日本時間）</h2>
        <div className="space-y-2">
          {PFC_ROWS.map((row) => {
            const current = round1(todayTotals[row.key]);
            const target = targets?.[row.targetKey] ?? null;
            return (
              <div key={row.key} className="card-nested grid grid-cols-3 gap-2 text-center text-xs">
                <div>
                  <p className="stat-label">現在</p>
                  <p className="mt-0.5 font-semibold text-gray-800">
                    {current}
                    {row.unit}
                  </p>
                </div>
                <div>
                  <p className="stat-label">目標</p>
                  <p className="mt-0.5 font-semibold text-gray-800">
                    {target != null ? `${target}${row.unit}` : '—'}
                  </p>
                </div>
                <div>
                  <p className="stat-label">残り</p>
                  <p className="mt-0.5 font-semibold text-gray-800">
                    {formatRemaining(current, target, row.unit)}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="card space-y-3">
        <h2 className="section-title">本日の記録（日本時間）</h2>
        {todayMeals.length === 0 ? (
          <p className="text-sm text-gray-500">
            まだ本日の食事がありません。上のフォームから記録してください。
          </p>
        ) : (
          <>
            <ul className="space-y-2">
              {todayMeals.map((meal) => (
                <li
                  key={meal.id}
                  className="card-nested text-sm"
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-medium text-gray-800">{meal.food_name}</span>
                    <span className="shrink-0 text-xs text-gray-500">
                      {MEAL_TYPE_LABELS[meal.meal_type]}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-gray-600">
                    {Number(meal.calories)} kcal · P{Number(meal.protein)}g F
                    {Number(meal.fat)}g C{Number(meal.carbs)}g
                  </p>
                  <p className="mt-0.5 text-xs text-gray-400">
                    {formatDateTimeJa(meal.eaten_at)}
                  </p>
                </li>
              ))}
            </ul>
            <div className="highlight-box">
              <p className="font-semibold">本日の合計</p>
              <p>
                {Math.round(todayTotals.calories)} kcal · P{Math.round(todayTotals.protein)}g
                F{Math.round(todayTotals.fat)}g C{Math.round(todayTotals.carbs)}g
              </p>
            </div>
          </>
        )}
      </section>

      <section className="space-y-2">
        <h2 className="section-title">最近の記録</h2>
        {recentMeals.length === 0 ? (
          <p className="text-sm text-gray-500">保存された記録はまだありません</p>
        ) : (
          <ul className="space-y-2">
            {recentMeals.map((meal) => (
              <li key={meal.id} className="card py-3 text-sm">
                <div className="flex justify-between gap-2">
                  <span className="font-medium">{meal.food_name}</span>
                  <span className="text-xs text-gray-500">
                    {MEAL_TYPE_LABELS[meal.meal_type]}
                  </span>
                </div>
                <p className="mt-1 text-xs text-gray-600">
                  {Number(meal.calories)} kcal · {formatDateTimeJa(meal.eaten_at)}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
