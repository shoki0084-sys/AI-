'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { parseApiResponse } from '@/lib/api-client';
import {
  formatDateJa,
  formatDateTimeJa,
  getJstTodayString,
} from '@/lib/datetime';
import { MEAL_TYPE_LABELS } from '@/lib/meal-labels';
import type { Meal } from '@/types/meal';

type AdviceRecord = {
  id: string;
  response: string;
  advice_date: string | null;
  category: string;
  created_at: string;
};

function formatSavedAt(iso: string) {
  return new Date(iso).toLocaleString('ja-JP', {
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function AdvicePanel() {
  const [selectedDate, setSelectedDate] = useState(getJstTodayString);
  const [dayMeals, setDayMeals] = useState<Meal[]>([]);
  const [savedAdvice, setSavedAdvice] = useState<AdviceRecord | null>(null);
  const [history, setHistory] = useState<AdviceRecord[]>([]);
  const [loadingMeals, setLoadingMeals] = useState(true);
  const [loadingAdvice, setLoadingAdvice] = useState(true);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const loadDayMeals = useCallback(async (date: string) => {
    setLoadingMeals(true);
    try {
      const res = await fetch(`/api/meals?date=${date}`);
      const data = await parseApiResponse<{ meals: Meal[] }>(res);
      setDayMeals(data.meals ?? []);
    } catch {
      setDayMeals([]);
    } finally {
      setLoadingMeals(false);
    }
  }, []);

  const loadSavedAdvice = useCallback(async (date: string) => {
    setLoadingAdvice(true);
    try {
      const res = await fetch(`/api/advice?date=${date}`);
      const data = await parseApiResponse<{ advice: AdviceRecord | null }>(res);
      setSavedAdvice(data.advice ?? null);
    } catch {
      setSavedAdvice(null);
    } finally {
      setLoadingAdvice(false);
    }
  }, []);

  const loadHistory = useCallback(async () => {
    setLoadingHistory(true);
    try {
      const res = await fetch('/api/advice');
      const data = await parseApiResponse<{ advices: AdviceRecord[] }>(res);
      setHistory(data.advices ?? []);
    } catch (err) {
      setMessage(`⚠️ ${(err as Error).message}`);
    } finally {
      setLoadingHistory(false);
    }
  }, []);

  useEffect(() => {
    loadDayMeals(selectedDate);
    loadSavedAdvice(selectedDate);
  }, [selectedDate, loadDayMeals, loadSavedAdvice]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const dayTotals = dayMeals.reduce(
    (acc, m) => ({
      calories: acc.calories + Number(m.calories ?? 0),
      protein: acc.protein + Number(m.protein ?? 0),
      fat: acc.fat + Number(m.fat ?? 0),
      carbs: acc.carbs + Number(m.carbs ?? 0),
    }),
    { calories: 0, protein: 0, fat: 0, carbs: 0 }
  );

  const onGenerate = async () => {
    setGenerating(true);
    setMessage(null);
    try {
      const res = await fetch('/api/advice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: selectedDate }),
      });
      const data = await parseApiResponse<{
        advice: string;
        advice_date: string;
        saved?: AdviceRecord;
      }>(res);
      setSavedAdvice(
        data.saved ?? {
          id: '',
          response: data.advice,
          advice_date: data.advice_date,
          category: 'meal',
          created_at: new Date().toISOString(),
        }
      );
      await loadSavedAdvice(selectedDate);
      await loadHistory();
      setMessage('✅ アドバイスを生成して保存しました');
    } catch (err) {
      setMessage(`⚠️ ${(err as Error).message}`);
    } finally {
      setGenerating(false);
    }
  };

  const onSelectHistory = (item: AdviceRecord) => {
    if (item.advice_date) {
      setSelectedDate(item.advice_date);
      setMessage(null);
    }
  };

  return (
    <div className="space-y-4">
      <section className="card space-y-3">
        <div>
          <label className="label">アドバイスを受け取る日</label>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="field"
          />
          <p className="mt-1 text-xs text-gray-500">
            選択中: {formatDateJa(selectedDate)}（日本時間）
          </p>
        </div>
      </section>

      <section className="card space-y-3">
        <h2 className="text-sm font-semibold text-gray-700">
          {formatDateJa(selectedDate)}の食事（分析対象）
        </h2>
        {loadingMeals ? (
          <p className="text-sm text-gray-500">読み込み中…</p>
        ) : dayMeals.length === 0 ? (
          <div className="space-y-2 text-sm text-gray-600">
            <p>この日の食事記録がありません。</p>
            <Link href="/meals" className="font-semibold text-blue-600">
              食事タブで記録する →
            </Link>
          </div>
        ) : (
          <>
            <ul className="space-y-2 text-sm">
              {dayMeals.map((meal) => (
                <li key={meal.id} className="rounded-lg bg-gray-50 px-3 py-2">
                  <span className="font-medium">{meal.food_name}</span>
                  <span className="ml-2 text-xs text-gray-500">
                    {MEAL_TYPE_LABELS[meal.meal_type]}
                  </span>
                  <p className="text-xs text-gray-600">
                    {Number(meal.calories)} kcal · P{Number(meal.protein)}g F
                    {Number(meal.fat)}g C{Number(meal.carbs)}g ·{' '}
                    {formatDateTimeJa(meal.eaten_at)}
                  </p>
                </li>
              ))}
            </ul>
            <p className="text-sm font-medium text-blue-700">
              合計 {Math.round(dayTotals.calories)} kcal（P{Math.round(dayTotals.protein)}
              g F{Math.round(dayTotals.fat)}g C{Math.round(dayTotals.carbs)}g）
            </p>
          </>
        )}
      </section>

      <section className="card space-y-3">
        <p className="text-sm text-gray-600">
          選択した日の食事記録をもとに AI がアドバイスを生成し、自動で保存します。
        </p>
        <button
          type="button"
          onClick={onGenerate}
          disabled={generating || dayMeals.length === 0}
          className="btn-primary"
        >
          {generating ? '分析中…' : `${formatDateJa(selectedDate)}のアドバイスを取得`}
        </button>
        {message && <p className="text-sm text-amber-700">{message}</p>}
      </section>

      <section className="card space-y-2">
        <h2 className="text-sm font-semibold text-gray-700">
          保存済みのアドバイス（{formatDateJa(selectedDate)}）
        </h2>
        {loadingAdvice ? (
          <p className="text-sm text-gray-500">読み込み中…</p>
        ) : savedAdvice ? (
          <>
            <p className="text-xs text-gray-500">
              保存日時: {formatSavedAt(savedAdvice.created_at)}
            </p>
            <div className="whitespace-pre-wrap text-sm leading-relaxed text-gray-800">
              {savedAdvice.response}
            </div>
          </>
        ) : (
          <p className="text-sm text-gray-500">
            この日のアドバイスはまだありません。上のボタンで取得してください。
          </p>
        )}
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-gray-700">保存したアドバイス一覧</h2>
        {loadingHistory ? (
          <p className="text-sm text-gray-500">読み込み中…</p>
        ) : history.length === 0 ? (
          <p className="text-sm text-gray-500">まだアドバイスがありません</p>
        ) : (
          <ul className="space-y-2">
            {history.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => onSelectHistory(item)}
                  className="card w-full text-left transition active:bg-gray-50"
                >
                  <p className="mb-1 text-sm font-semibold text-blue-700">
                    {item.advice_date
                      ? formatDateJa(item.advice_date)
                      : formatSavedAt(item.created_at)}
                  </p>
                  <p className="line-clamp-3 whitespace-pre-wrap text-sm text-gray-800">
                    {item.response}
                  </p>
                  <p className="mt-1 text-xs text-gray-400">タップして表示 →</p>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
