'use client';

import { useCallback, useEffect, useState } from 'react';
import { parseApiResponse } from '@/lib/api-client';
import { formatDateTimeJa } from '@/lib/datetime';
import { MEAL_TYPE_LABELS } from '@/lib/meal-labels';

type AdminUser = {
  id: string;
  email: string | null;
  line_user_id: string | null;
  target_weight: number | null;
  created_at: string;
};

type Records = {
  weights: { weight_kg: number; body_fat: number | null; measured_at: string }[];
  meals: {
    meal_type: string;
    food_name: string;
    calories: number;
    protein: number;
    fat: number;
    carbs: number;
    eaten_at: string;
  }[];
  workouts: {
    exercise_name: string;
    weight_kg: number;
    reps: number;
    sets: number;
    performed_at: string;
  }[];
};

export default function AdminPanel() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [selected, setSelected] = useState<AdminUser | null>(null);
  const [records, setRecords] = useState<Records | null>(null);
  const [advice, setAdvice] = useState<string | null>(null);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [loadingRecords, setLoadingRecords] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/admin/users');
        const data = await parseApiResponse<{ users: AdminUser[] }>(res);
        setUsers(data.users);
      } catch (err) {
        setMessage(`⚠️ ${(err as Error).message}`);
      } finally {
        setLoadingUsers(false);
      }
    })();
  }, []);

  const selectUser = useCallback(async (u: AdminUser) => {
    setSelected(u);
    setRecords(null);
    setAdvice(null);
    setMessage(null);
    setLoadingRecords(true);
    try {
      const res = await fetch(`/api/admin/records?userId=${u.id}`);
      setRecords(await parseApiResponse<Records>(res));
    } catch (err) {
      setMessage(`⚠️ ${(err as Error).message}`);
    } finally {
      setLoadingRecords(false);
    }
  }, []);

  const generateAdvice = async () => {
    if (!selected) return;
    setGenerating(true);
    setMessage(null);
    try {
      const res = await fetch('/api/admin/advice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: selected.id }),
      });
      const data = await parseApiResponse<{ advice: string }>(res);
      setAdvice(data.advice);
    } catch (err) {
      setMessage(`⚠️ ${(err as Error).message}`);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="space-y-4">
      {message && <p className="card text-sm text-amber-700">{message}</p>}

      <section className="card space-y-2">
        <p className="text-sm font-semibold text-gray-600">
          ユーザー一覧（{users.length}）
        </p>
        {loadingUsers ? (
          <p className="text-sm text-gray-400">読み込み中…</p>
        ) : (
          <ul className="divide-y">
            {users.map((u) => (
              <li key={u.id}>
                <button
                  type="button"
                  onClick={() => selectUser(u)}
                  className={`flex w-full items-center justify-between py-2 text-left text-sm active:bg-gray-50 ${
                    selected?.id === u.id ? 'font-semibold text-blue-600' : 'text-gray-700'
                  }`}
                >
                  <span className="truncate">{u.email ?? u.id.slice(0, 8)}</span>
                  <span className="ml-2 shrink-0 text-xs text-gray-400">
                    {u.line_user_id ? 'LINE連携済' : '未連携'}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {selected && (
        <section className="card space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-gray-700">
              {selected.email ?? selected.id.slice(0, 8)} の記録
            </p>
            <button
              type="button"
              onClick={generateAdvice}
              disabled={generating}
              className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white active:bg-blue-700 disabled:opacity-50"
            >
              {generating ? '生成中…' : 'AIアドバイス生成'}
            </button>
          </div>

          {loadingRecords ? (
            <p className="text-sm text-gray-400">読み込み中…</p>
          ) : records ? (
            <div className="space-y-3 text-sm">
              <div>
                <p className="text-xs font-semibold text-gray-500">体重（最新10件）</p>
                {records.weights.length ? (
                  records.weights.map((w, i) => (
                    <p key={i} className="text-gray-700">
                      {formatDateTimeJa(w.measured_at)}：{w.weight_kg}kg
                      {w.body_fat != null ? ` / 体脂肪${w.body_fat}%` : ''}
                    </p>
                  ))
                ) : (
                  <p className="text-gray-400">記録なし</p>
                )}
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-500">食事（最新10件）</p>
                {records.meals.length ? (
                  records.meals.map((m, i) => (
                    <p key={i} className="text-gray-700">
                      {formatDateTimeJa(m.eaten_at)}：[{MEAL_TYPE_LABELS[m.meal_type as keyof typeof MEAL_TYPE_LABELS] ?? m.meal_type}] {m.food_name}（{m.calories}kcal）
                    </p>
                  ))
                ) : (
                  <p className="text-gray-400">記録なし</p>
                )}
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-500">筋トレ（最新10件）</p>
                {records.workouts.length ? (
                  records.workouts.map((w, i) => (
                    <p key={i} className="text-gray-700">
                      {formatDateTimeJa(w.performed_at)}：{w.exercise_name} {w.weight_kg}kg × {w.reps}回 × {w.sets}セット
                    </p>
                  ))
                ) : (
                  <p className="text-gray-400">記録なし</p>
                )}
              </div>
            </div>
          ) : null}

          {advice && (
            <div className="rounded-lg bg-gray-50 p-3">
              <p className="mb-1 text-xs font-semibold text-gray-500">AIアドバイス</p>
              <p className="whitespace-pre-wrap text-sm text-gray-700">{advice}</p>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
