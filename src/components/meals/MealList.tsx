'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { parseApiResponse } from '@/lib/api-client';
import {
  datetimeLocalToIso,
  formatDateTimeJa,
  toDatetimeLocalValue,
} from '@/lib/datetime';
import { parseFoodName } from '@/lib/foods/food-name';
import { nutritionForAmountChange } from '@/lib/foods/reference-nutrition';
import { MEAL_TYPE_LABELS } from '@/lib/meal-labels';
import { calcCaloriesFromPfc } from '@/lib/nutrition';
import type { Meal, MealType } from '@/types/meal';

type Props = {
  mealType: MealType;
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
  if (target == null || target <= 0) return '目標未設定';
  const diff = round1(target - current);
  if (diff < 0) return `超過 ${Math.abs(diff)}${unit}`;
  if (diff === 0) return 'ちょうど目標';
  return `残り ${diff}${unit}`;
}

function progressPct(current: number, target: number | null) {
  if (target == null || target <= 0) return 0;
  return Math.min(100, Math.round((current / target) * 100));
}

const PFC_ROWS = [
  {
    key: 'calories' as const,
    label: 'カロリー',
    short: '',
    unit: 'kcal',
    targetKey: 'target_calories' as const,
    barClass: 'bg-blue-500',
  },
  {
    key: 'protein' as const,
    label: 'たんぱく質',
    short: 'P',
    unit: 'g',
    targetKey: 'target_protein' as const,
    barClass: 'bg-sky-500',
  },
  {
    key: 'fat' as const,
    label: '脂質',
    short: 'F',
    unit: 'g',
    targetKey: 'target_fat' as const,
    barClass: 'bg-amber-500',
  },
  {
    key: 'carbs' as const,
    label: '炭水化物',
    short: 'C',
    unit: 'g',
    targetKey: 'target_carbs' as const,
    barClass: 'bg-violet-500',
  },
];

const MEAL_TYPES: { value: MealType; label: string }[] = [
  { value: 'breakfast', label: '朝' },
  { value: 'lunch', label: '昼' },
  { value: 'dinner', label: '夜' },
  { value: 'snack', label: '間食' },
];

function MealEditRow({
  meal,
  selected,
  onToggleSelect,
  onUpdated,
  onDeleted,
}: {
  meal: Meal;
  selected: boolean;
  onToggleSelect: () => void;
  onUpdated: (meal: Meal) => void;
  onDeleted: (id: string) => void;
}) {
  const parsed = parseFoodName(meal.food_name);
  const [editing, setEditing] = useState(false);
  const [eatenAt, setEatenAt] = useState(() =>
    toDatetimeLocalValue(new Date(meal.eaten_at))
  );
  const [type, setType] = useState<MealType>(meal.meal_type);
  const [name, setName] = useState(parsed.name);
  const [amount, setAmount] = useState(parsed.amount);
  const [calories, setCalories] = useState(Number(meal.calories));
  const [protein, setProtein] = useState(Number(meal.protein));
  const [fat, setFat] = useState(Number(meal.fat));
  const [carbs, setCarbs] = useState(Number(meal.carbs));
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const amountAtFocusRef = useRef(amount);

  useEffect(() => {
    const next = parseFoodName(meal.food_name);
    setEatenAt(toDatetimeLocalValue(new Date(meal.eaten_at)));
    setType(meal.meal_type);
    setName(next.name);
    setAmount(next.amount);
    setCalories(Number(meal.calories));
    setProtein(Number(meal.protein));
    setFat(Number(meal.fat));
    setCarbs(Number(meal.carbs));
  }, [meal]);

  const syncCaloriesFromPfc = (p: number, f: number, c: number) => {
    setCalories(calcCaloriesFromPfc(p, f, c));
  };

  const applyAmountNutrition = (previousAmount: string, nextAmount: string) => {
    const scaled = nutritionForAmountChange({
      name,
      previousAmount,
      nextAmount,
      previous: { calories, protein, fat, carbs },
    });
    setAmount(nextAmount);
    if (scaled) {
      setCalories(scaled.calories);
      setProtein(scaled.protein);
      setFat(scaled.fat);
      setCarbs(scaled.carbs);
      setMessage(null);
    } else if (
      nextAmount.trim() &&
      (calories > 0 || protein > 0) &&
      nextAmount.trim() !== previousAmount.trim()
    ) {
      setMessage('⚠️ 量の単位が変わる場合は、カロリー・PFCを手入力で直してください');
    }
  };

  const save = async () => {
    if (!name.trim()) {
      setMessage('⚠️ 食材名を入力してください');
      return;
    }
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/meals/${meal.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eaten_at: datetimeLocalToIso(eatenAt),
          meal_type: type,
          name: name.trim(),
          amount: amount.trim(),
          calories,
          protein,
          fat,
          carbs,
        }),
      });
      const data = await parseApiResponse<{ meal: Meal }>(res);
      setEditing(false);
      onUpdated(data.meal);
    } catch (err) {
      setMessage(`⚠️ ${(err as Error).message}`);
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!confirm(`「${meal.food_name}」を削除しますか？`)) return;
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/meals/${meal.id}`, { method: 'DELETE' });
      await parseApiResponse(res);
      onDeleted(meal.id);
    } catch (err) {
      setMessage(`⚠️ ${(err as Error).message}`);
      setSaving(false);
    }
  };

  return (
    <div className="card-nested space-y-2 text-sm">
      <div className="flex items-start gap-2">
        <input
          type="checkbox"
          checked={selected}
          onChange={onToggleSelect}
          className="mt-1 h-4 w-4 accent-blue-600"
          aria-label="一括修正用に選択"
        />
        <div className="min-w-0 flex-1">
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
        </div>
      </div>

      {!editing ? (
        <div className="flex gap-3 pl-6">
          <button type="button" onClick={() => setEditing(true)} className="btn-ghost text-xs">
            修正
          </button>
          <button type="button" onClick={remove} className="btn-danger-ghost" disabled={saving}>
            削除
          </button>
        </div>
      ) : (
        <div className="space-y-2 border-t border-gray-100 pt-2">
          <div>
            <label className="label">食べ物</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="field"
            />
          </div>
          <div>
            <label className="label">量・個数</label>
            <input
              type="text"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              onFocus={() => {
                amountAtFocusRef.current = amount;
              }}
              onBlur={(e) => applyAmountNutrition(amountAtFocusRef.current, e.target.value)}
              className="field"
              placeholder="例: 100g、1/2スクープ、半分"
            />
            <p className="mt-1 text-xs text-gray-400">
              半分・1/4なら「1/2スクープ」「0.25スクープ」。入力後に枠外をタップするとPFCも連動します
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="label">カロリー</label>
              <input
                type="number"
                inputMode="decimal"
                value={calories}
                onChange={(e) => setCalories(Number(e.target.value))}
                className="field"
              />
            </div>
            <div>
              <label className="label">P (g)</label>
              <input
                type="number"
                inputMode="decimal"
                value={protein}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  setProtein(v);
                  syncCaloriesFromPfc(v, fat, carbs);
                }}
                className="field"
              />
            </div>
            <div>
              <label className="label">F (g)</label>
              <input
                type="number"
                inputMode="decimal"
                value={fat}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  setFat(v);
                  syncCaloriesFromPfc(protein, v, carbs);
                }}
                className="field"
              />
            </div>
            <div>
              <label className="label">C (g)</label>
              <input
                type="number"
                inputMode="decimal"
                value={carbs}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  setCarbs(v);
                  syncCaloriesFromPfc(protein, fat, v);
                }}
                className="field"
              />
            </div>
          </div>
          <div>
            <label className="label">日時</label>
            <input
              type="datetime-local"
              value={eatenAt}
              onChange={(e) => setEatenAt(e.target.value)}
              className="field"
            />
          </div>
          <div>
            <label className="label">食事区分</label>
            <div className="grid grid-cols-4 gap-1.5">
              {MEAL_TYPES.map((m) => (
                <button
                  key={m.value}
                  type="button"
                  onClick={() => setType(m.value)}
                  className={`btn-segment py-2 text-xs ${type === m.value ? 'btn-segment-active' : ''}`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={save}
              disabled={saving}
              className="btn-primary-sm flex-1"
            >
              {saving ? '保存中…' : '保存'}
            </button>
            <button
              type="button"
              onClick={() => {
                setEditing(false);
                setMessage(null);
              }}
              className="btn-secondary flex-1"
              disabled={saving}
            >
              キャンセル
            </button>
          </div>
        </div>
      )}
      {message && <p className="text-xs text-amber-700">{message}</p>}
    </div>
  );
}

export default function MealList({ mealType, refreshKey = 0 }: Props) {
  const [todayMeals, setTodayMeals] = useState<Meal[]>([]);
  const [recentMeals, setRecentMeals] = useState<Meal[]>([]);
  const [targets, setTargets] = useState<ProfileTargets | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkAt, setBulkAt] = useState(() => toDatetimeLocalValue());
  const [bulkType, setBulkType] = useState<MealType | ''>('');
  const [bulkSaving, setBulkSaving] = useState(false);
  const [bulkMessage, setBulkMessage] = useState<string | null>(null);

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
      setRecentMeals((allData.meals ?? []).slice(0, 50));
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

  useEffect(() => {
    setSelectedIds(new Set());
    setBulkMessage(null);
    setBulkType(mealType);
  }, [mealType]);

  const mergeMeals = useCallback((updated: Meal[]) => {
    const map = new Map(updated.map((m) => [m.id, m]));
    setTodayMeals((prev) => prev.map((m) => map.get(m.id) ?? m));
    setRecentMeals((prev) => prev.map((m) => map.get(m.id) ?? m));
  }, []);

  const upsertMeal = useCallback((meal: Meal) => {
    mergeMeals([meal]);
  }, [mergeMeals]);

  const removeMealLocal = useCallback((id: string) => {
    setTodayMeals((prev) => prev.filter((m) => m.id !== id));
    setRecentMeals((prev) => prev.filter((m) => m.id !== id));
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }, []);

  const filteredToday = useMemo(
    () => todayMeals.filter((m) => m.meal_type === mealType),
    [todayMeals, mealType]
  );
  const filteredRecent = useMemo(
    () => recentMeals.filter((m) => m.meal_type === mealType).slice(0, 30),
    [recentMeals, mealType]
  );

  const selectableIds = useMemo(() => {
    const ids = new Set<string>();
    for (const m of filteredToday) ids.add(m.id);
    for (const m of filteredRecent) ids.add(m.id);
    return [...ids];
  }, [filteredToday, filteredRecent]);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => setSelectedIds(new Set(selectableIds));
  const clearSelection = () => setSelectedIds(new Set());

  const applyBulk = async () => {
    const ids = [...selectedIds];
    if (ids.length === 0) {
      setBulkMessage('⚠️ 記録を選択してください');
      return;
    }
    setBulkSaving(true);
    setBulkMessage(null);
    try {
      const body: { ids: string[]; eaten_at: string; meal_type?: MealType } = {
        ids,
        eaten_at: datetimeLocalToIso(bulkAt),
      };
      if (bulkType) body.meal_type = bulkType;

      const res = await fetch('/api/meals', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await parseApiResponse<{ meals: Meal[] }>(res);
      mergeMeals(data.meals ?? []);
      setSelectedIds(new Set());
      setBulkMessage(`✅ ${ids.length}件の日時を一括更新しました`);
    } catch (err) {
      setBulkMessage(`⚠️ ${(err as Error).message}`);
    } finally {
      setBulkSaving(false);
    }
  };

  const todayTotals = sumMeals(todayMeals);
  const typeTotals = sumMeals(filteredToday);
  const typeLabel = MEAL_TYPE_LABELS[mealType];

  if (loading) {
    return <p className="text-sm text-gray-500">記録を読み込み中…</p>;
  }

  if (error) {
    return <p className="text-sm text-amber-700">⚠️ {error}</p>;
  }

  const renderRow = (meal: Meal) => (
    <li key={meal.id}>
      <MealEditRow
        meal={meal}
        selected={selectedIds.has(meal.id)}
        onToggleSelect={() => toggleSelect(meal.id)}
        onUpdated={upsertMeal}
        onDeleted={removeMealLocal}
      />
    </li>
  );

  return (
    <div className="space-y-4">
      <section className="card space-y-4">
        <div>
          <h2 className="section-title">本日のPFC（日本時間・全日）</h2>
          <p className="mt-1 text-xs text-gray-500">
            現在の摂取量 / 目標量。バーで達成度が分かります。
          </p>
        </div>
        <div className="space-y-3">
          {PFC_ROWS.map((row) => {
            const current = round1(todayTotals[row.key]);
            const target = targets?.[row.targetKey] ?? null;
            const over = target != null && target > 0 && current > target;
            const pct = progressPct(current, target);
            const title = row.short ? `${row.short} ${row.label}` : row.label;
            return (
              <div key={row.key} className="space-y-1.5">
                <div className="flex items-baseline justify-between gap-2">
                  <p className="text-sm font-semibold text-gray-800">{title}</p>
                  <p className="text-sm font-semibold text-gray-800">
                    {current}
                    <span className="mx-0.5 font-normal text-gray-400">/</span>
                    {target != null ? target : '—'}
                    <span className="ml-0.5 text-xs font-normal text-gray-400">
                      {row.unit}
                    </span>
                  </p>
                </div>
                <div className="progress-track">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      over ? 'progress-fill-over' : row.barClass
                    }`}
                    style={{ width: `${target != null && target > 0 ? pct : 0}%` }}
                  />
                </div>
                <p
                  className={`text-xs ${over ? 'font-medium text-orange-600' : 'text-gray-500'}`}
                >
                  {formatRemaining(current, target, row.unit)}
                  {target != null && target > 0 ? ` · ${pct}%` : ''}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      {selectableIds.length > 0 && (
        <section className="card space-y-3">
          <h2 className="section-title">日時を一括修正</h2>
          <p className="text-xs text-gray-500">
            チェックした記録の日時をまとめて変更します（再読み込みなし）
          </p>
          <div className="flex flex-wrap gap-2 text-xs">
            <button type="button" onClick={selectAll} className="btn-ghost">
              すべて選択
            </button>
            <button type="button" onClick={clearSelection} className="btn-ghost">
              選択解除
            </button>
            <span className="text-gray-500">{selectedIds.size}件選択中</span>
          </div>
          <div>
            <label className="label">新しい日時</label>
            <input
              type="datetime-local"
              value={bulkAt}
              onChange={(e) => setBulkAt(e.target.value)}
              className="field"
            />
          </div>
          <div>
            <label className="label">区分もまとめて変更（任意）</label>
            <div className="grid grid-cols-5 gap-1.5">
              <button
                type="button"
                onClick={() => setBulkType('')}
                className={`btn-segment py-2 text-xs ${bulkType === '' ? 'btn-segment-active' : ''}`}
              >
                変更なし
              </button>
              {MEAL_TYPES.map((m) => (
                <button
                  key={m.value}
                  type="button"
                  onClick={() => setBulkType(m.value)}
                  className={`btn-segment py-2 text-xs ${bulkType === m.value ? 'btn-segment-active' : ''}`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>
          <button
            type="button"
            onClick={applyBulk}
            disabled={bulkSaving || selectedIds.size === 0}
            className="btn-primary"
          >
            {bulkSaving ? '更新中…' : `選択した${selectedIds.size || ''}件を一括更新`}
          </button>
          {bulkMessage && <p className="text-sm text-amber-700">{bulkMessage}</p>}
        </section>
      )}

      <section className="card space-y-3">
        <h2 className="section-title">本日の{typeLabel}</h2>
        {filteredToday.length === 0 ? (
          <p className="text-sm text-gray-500">
            まだ本日の{typeLabel}がありません。上のフォームから記録してください。
          </p>
        ) : (
          <>
            <ul className="space-y-2">{filteredToday.map((m) => renderRow(m))}</ul>
            <div className="highlight-box">
              <p className="font-semibold">{typeLabel}の合計</p>
              <p>
                {Math.round(typeTotals.calories)} kcal · P{Math.round(typeTotals.protein)}g
                F{Math.round(typeTotals.fat)}g C{Math.round(typeTotals.carbs)}g
              </p>
            </div>
          </>
        )}
      </section>

      <section className="space-y-2">
        <h2 className="section-title">最近の{typeLabel}</h2>
        {filteredRecent.length === 0 ? (
          <p className="text-sm text-gray-500">保存された{typeLabel}の記録はまだありません</p>
        ) : (
          <ul className="space-y-2">{filteredRecent.map((m) => renderRow(m))}</ul>
        )}
      </section>
    </div>
  );
}
