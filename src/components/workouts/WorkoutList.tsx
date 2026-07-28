'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { parseApiResponse } from '@/lib/api-client';
import {
  datetimeLocalToIso,
  formatDateJa,
  formatDateTimeJa,
  toDatetimeLocalValue,
  toJstDateString,
} from '@/lib/datetime';
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

function SessionCard({
  session,
  onReplaceWorkouts,
  onRemoveIds,
}: {
  session: WorkoutSession;
  onReplaceWorkouts: (updated: Workout[]) => void;
  onRemoveIds: (ids: string[]) => void;
}) {
  const [editingDate, setEditingDate] = useState(false);
  const [editingExerciseId, setEditingExerciseId] = useState<string | null>(null);
  const [performedAt, setPerformedAt] = useState(() =>
    toDatetimeLocalValue(new Date(session.performedAt))
  );
  const [draft, setDraft] = useState({
    exercise_name: '',
    weight_kg: 0,
    reps: 0,
    sets: 0,
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    setPerformedAt(toDatetimeLocalValue(new Date(session.performedAt)));
  }, [session.performedAt]);

  const startEditExercise = (ex: Workout) => {
    setEditingExerciseId(ex.id);
    setDraft({
      exercise_name: ex.exercise_name,
      weight_kg: Number(ex.weight_kg),
      reps: Number(ex.reps),
      sets: Number(ex.sets),
    });
    setMessage(null);
  };

  const saveDate = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch('/api/workouts', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from_performed_at: session.performedAt,
          performed_at: datetimeLocalToIso(performedAt),
        }),
      });
      const data = await parseApiResponse<{ workouts: Workout[] }>(res);
      setEditingDate(false);
      onReplaceWorkouts(data.workouts ?? []);
    } catch (err) {
      setMessage(`⚠️ ${(err as Error).message}`);
    } finally {
      setSaving(false);
    }
  };

  const saveExercise = async (id: string) => {
    if (!draft.exercise_name.trim()) {
      setMessage('⚠️ 種目名を入力してください');
      return;
    }
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/workouts/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          exercise_name: draft.exercise_name.trim(),
          weight_kg: draft.weight_kg,
          reps: draft.reps,
          sets: draft.sets,
        }),
      });
      const data = await parseApiResponse<{ workout: Workout }>(res);
      setEditingExerciseId(null);
      onReplaceWorkouts([data.workout]);
    } catch (err) {
      setMessage(`⚠️ ${(err as Error).message}`);
    } finally {
      setSaving(false);
    }
  };

  const removeExercise = async (ex: Workout) => {
    if (!confirm(`「${ex.exercise_name}」を削除しますか？`)) return;
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/workouts/${ex.id}`, { method: 'DELETE' });
      await parseApiResponse(res);
      onRemoveIds([ex.id]);
    } catch (err) {
      setMessage(`⚠️ ${(err as Error).message}`);
      setSaving(false);
    }
  };

  const removeSession = async () => {
    if (!confirm('このトレーニングセッションをすべて削除しますか？')) return;
    setSaving(true);
    setMessage(null);
    try {
      const ids = session.exercises.map((ex) => ex.id);
      await Promise.all(
        ids.map(async (id) => {
          const res = await fetch(`/api/workouts/${id}`, { method: 'DELETE' });
          await parseApiResponse(res);
        })
      );
      onRemoveIds(ids);
    } catch (err) {
      setMessage(`⚠️ ${(err as Error).message}`);
      setSaving(false);
    }
  };

  return (
    <div className="card space-y-2 text-sm">
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
          <li key={ex.id} className="card-nested space-y-2 text-gray-800">
            {editingExerciseId === ex.id ? (
              <>
                <div>
                  <label className="label">種目名</label>
                  <input
                    type="text"
                    value={draft.exercise_name}
                    onChange={(e) =>
                      setDraft((d) => ({ ...d, exercise_name: e.target.value }))
                    }
                    className="field"
                  />
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="label text-center">重量</label>
                    <input
                      type="number"
                      inputMode="decimal"
                      min={0}
                      step="0.5"
                      value={draft.weight_kg}
                      onChange={(e) =>
                        setDraft((d) => ({ ...d, weight_kg: Number(e.target.value) }))
                      }
                      className="field text-center"
                    />
                  </div>
                  <div>
                    <label className="label text-center">回数</label>
                    <input
                      type="number"
                      inputMode="numeric"
                      min={0}
                      value={draft.reps}
                      onChange={(e) =>
                        setDraft((d) => ({ ...d, reps: Number(e.target.value) }))
                      }
                      className="field text-center"
                    />
                  </div>
                  <div>
                    <label className="label text-center">セット</label>
                    <input
                      type="number"
                      inputMode="numeric"
                      min={0}
                      value={draft.sets}
                      onChange={(e) =>
                        setDraft((d) => ({ ...d, sets: Number(e.target.value) }))
                      }
                      className="field text-center"
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => saveExercise(ex.id)}
                    disabled={saving}
                    className="btn-primary-sm flex-1"
                  >
                    {saving ? '保存中…' : '保存'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingExerciseId(null)}
                    className="btn-secondary flex-1"
                    disabled={saving}
                  >
                    キャンセル
                  </button>
                </div>
              </>
            ) : (
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-medium">{ex.exercise_name}</p>
                  <p className="text-xs text-gray-600">
                    {ex.weight_kg}kg × {ex.reps}回 × {ex.sets}セット（
                    {Math.round(Number(ex.weight_kg) * ex.reps * ex.sets)} kg）
                  </p>
                  <div className="mt-1 flex gap-3">
                    <button
                      type="button"
                      onClick={() => startEditExercise(ex)}
                      className="btn-ghost text-xs"
                    >
                      修正
                    </button>
                    <button
                      type="button"
                      onClick={() => removeExercise(ex)}
                      className="btn-danger-ghost"
                      disabled={saving}
                    >
                      削除
                    </button>
                  </div>
                </div>
              </div>
            )}
          </li>
        ))}
      </ul>
      {session.note && (
        <p className="text-xs text-gray-600">メモ: {session.note}</p>
      )}

      {!editingDate ? (
        <div className="flex flex-wrap gap-3 pt-1">
          <button type="button" onClick={() => setEditingDate(true)} className="btn-ghost text-xs">
            日時を修正
          </button>
          <button
            type="button"
            onClick={removeSession}
            className="btn-danger-ghost"
            disabled={saving}
          >
            セッション削除
          </button>
        </div>
      ) : (
        <div className="space-y-2 border-t border-gray-100 pt-2">
          <div>
            <label className="label">日時</label>
            <input
              type="datetime-local"
              value={performedAt}
              onChange={(e) => setPerformedAt(e.target.value)}
              className="field"
            />
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={saveDate}
              disabled={saving}
              className="btn-primary-sm flex-1"
            >
              {saving ? '保存中…' : '保存'}
            </button>
            <button
              type="button"
              onClick={() => {
                setEditingDate(false);
                setPerformedAt(toDatetimeLocalValue(new Date(session.performedAt)));
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

export default function WorkoutList({ refreshKey = 0 }: Props) {
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedSessions, setSelectedSessions] = useState<Set<string>>(new Set());
  const [bulkAt, setBulkAt] = useState(() => toDatetimeLocalValue());
  const [bulkSaving, setBulkSaving] = useState(false);
  const [bulkMessage, setBulkMessage] = useState<string | null>(null);

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

  const onReplaceWorkouts = useCallback((updated: Workout[]) => {
    setWorkouts((prev) => {
      const byId = new Map(prev.map((w) => [w.id, w]));
      for (const u of updated) byId.set(u.id, u);
      return [...byId.values()].sort(
        (a, b) =>
          new Date(b.performed_at).getTime() - new Date(a.performed_at).getTime()
      );
    });
  }, []);

  const onRemoveIds = useCallback((ids: string[]) => {
    const idSet = new Set(ids);
    setWorkouts((prev) => prev.filter((w) => !idSet.has(w.id)));
    setSelectedSessions((prev) => {
      const next = new Set(prev);
      // cleanup handled by sessions remount
      return next;
    });
  }, []);

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
      if (!session.note && w.note) session.note = w.note;
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

  const allSessionKeys = useMemo(
    () => sessionsByDate.flatMap(([, sessions]) => sessions.map((s) => s.performedAt)),
    [sessionsByDate]
  );

  const applyBulkDate = async () => {
    const keys = [...selectedSessions];
    if (keys.length === 0) {
      setBulkMessage('⚠️ セッションを選択してください');
      return;
    }
    setBulkSaving(true);
    setBulkMessage(null);
    try {
      const baseMs = new Date(datetimeLocalToIso(bulkAt)).getTime();
      const results: Workout[] = [];
      for (let i = 0; i < keys.length; i++) {
        const from = keys[i];
        const performed_at = new Date(baseMs + i * 60_000).toISOString();
        const res = await fetch('/api/workouts', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ from_performed_at: from, performed_at }),
        });
        const data = await parseApiResponse<{ workouts: Workout[] }>(res);
        results.push(...(data.workouts ?? []));
      }
      setWorkouts((prev) => {
        const byId = new Map(prev.map((w) => [w.id, w]));
        for (const u of results) byId.set(u.id, u);
        return [...byId.values()].sort(
          (a, b) =>
            new Date(b.performed_at).getTime() - new Date(a.performed_at).getTime()
        );
      });
      setSelectedSessions(new Set());
      setBulkMessage(`✅ ${keys.length}件のセッション日時を一括更新しました`);
    } catch (err) {
      setBulkMessage(`⚠️ ${(err as Error).message}`);
    } finally {
      setBulkSaving(false);
    }
  };

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
      <h2 className="section-title">記録一覧</h2>

      <div className="card space-y-3">
        <h3 className="text-sm font-semibold text-gray-800">日時を一括修正</h3>
        <p className="text-xs text-gray-500">
          チェックしたセッションの日時をまとめて変更します
        </p>
        <div className="flex flex-wrap gap-2 text-xs">
          <button
            type="button"
            onClick={() => setSelectedSessions(new Set(allSessionKeys))}
            className="btn-ghost"
          >
            すべて選択
          </button>
          <button
            type="button"
            onClick={() => setSelectedSessions(new Set())}
            className="btn-ghost"
          >
            選択解除
          </button>
          <span className="text-gray-500">{selectedSessions.size}件選択中</span>
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
        <button
          type="button"
          onClick={applyBulkDate}
          disabled={bulkSaving || selectedSessions.size === 0}
          className="btn-primary"
        >
          {bulkSaving ? '更新中…' : `選択した${selectedSessions.size || ''}件を一括更新`}
        </button>
        {bulkMessage && <p className="text-sm text-amber-700">{bulkMessage}</p>}
      </div>

      {sessionsByDate.map(([day, sessions]) => (
        <div key={day} className="space-y-2">
          <h3 className="text-xs font-semibold text-gray-500">{formatDateJa(day)}</h3>
          {sessions.map((session) => (
            <div key={session.performedAt} className="space-y-1">
              <label className="flex items-center gap-2 px-1 text-xs text-gray-600">
                <input
                  type="checkbox"
                  checked={selectedSessions.has(session.performedAt)}
                  onChange={() => {
                    setSelectedSessions((prev) => {
                      const next = new Set(prev);
                      if (next.has(session.performedAt)) next.delete(session.performedAt);
                      else next.add(session.performedAt);
                      return next;
                    });
                  }}
                  className="h-4 w-4 accent-blue-600"
                />
                一括修正の対象にする
              </label>
              <SessionCard
                session={session}
                onReplaceWorkouts={onReplaceWorkouts}
                onRemoveIds={onRemoveIds}
              />
            </div>
          ))}
        </div>
      ))}
    </section>
  );
}
