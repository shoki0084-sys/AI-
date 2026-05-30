'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { parseApiResponse } from '@/lib/api-client';
import { formatDateJa, formatDateTimeJa, toJstDateString } from '@/lib/datetime';
import type { Workout } from '@/types/workout';

type Props = {
  refreshKey?: number;
};

type WorkoutSession = {
  performedAt: string;
  note: string | null;
  exercises: Workout[];
  totalVolume: number;
};

export default function WorkoutList({ refreshKey = 0 }: Props) {
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/workouts');
      const data = await parseApiResponse<{ workouts: Workout[] }>(res);
      setWorkouts(data.workouts ?? []);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load, refreshKey]);

  const sessionsByDate = useMemo(() => {
    const sessionMap = new Map<string, WorkoutSession>();

    for (const w of workouts) {
      const key = w.performed_at;
      if (!sessionMap.has(key)) {
        sessionMap.set(key, {
          performedAt: key,
          note: w.note,
          exercises: [],
          totalVolume: 0,
        });
      }
      const session = sessionMap.get(key)!;
      session.exercises.push(w);
      session.totalVolume +=
        Number(w.weight_kg) * Number(w.reps) * Number(w.sets);
    }

    const byDate = new Map<string, WorkoutSession[]>();
    for (const session of sessionMap.values()) {
      const day = toJstDateString(session.performedAt);
      if (!byDate.has(day)) byDate.set(day, []);
      byDate.get(day)!.push(session);
    }

    for (const sessions of byDate.values()) {
      sessions.sort(
        (a, b) =>
          new Date(b.performedAt).getTime() - new Date(a.performedAt).getTime()
      );
    }

    return [...byDate.entries()].sort(([a], [b]) => b.localeCompare(a));
  }, [workouts]);

  if (loading) {
    return <p className="text-sm text-gray-500">記録を読み込み中…</p>;
  }

  if (error) {
    return <p className="text-sm text-amber-700">⚠️ {error}</p>;
  }

  if (sessionsByDate.length === 0) {
    return (
      <p className="text-sm text-gray-500">
        まだ筋トレ記録がありません。上のフォームから記録してください。
      </p>
    );
  }

  return (
    <section className="space-y-4">
      <h2 className="text-sm font-semibold text-gray-700">記録一覧</h2>
      {sessionsByDate.map(([day, sessions]) => (
        <div key={day} className="space-y-2">
          <h3 className="text-xs font-semibold text-gray-500">{formatDateJa(day)}</h3>
          {sessions.map((session) => (
            <div key={session.performedAt} className="card space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500">
                  {formatDateTimeJa(session.performedAt)}
                </span>
                <span className="text-xs font-medium text-blue-600">
                  計 {Math.round(session.totalVolume)} kg
                </span>
              </div>
              <ul className="space-y-1.5">
                {session.exercises.map((ex) => (
                  <li
                    key={ex.id}
                    className="rounded-lg bg-gray-50 px-3 py-2 text-gray-800"
                  >
                    <p className="font-medium">{ex.exercise_name}</p>
                    <p className="text-xs text-gray-600">
                      {ex.weight_kg}kg × {ex.reps}回 × {ex.sets}セット（
                      {Math.round(Number(ex.weight_kg) * ex.reps * ex.sets)} kg）
                    </p>
                  </li>
                ))}
              </ul>
              {session.note && (
                <p className="text-xs text-gray-600">メモ: {session.note}</p>
              )}
            </div>
          ))}
        </div>
      ))}
    </section>
  );
}
