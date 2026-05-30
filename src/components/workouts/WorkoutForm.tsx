'use client';

import { useState } from 'react';
import { parseApiResponse } from '@/lib/api-client';
import type { ExerciseEntry } from '@/types/workout';

type ExerciseRow = ExerciseEntry & { id: string };

function newExerciseRow(): ExerciseRow {
  return {
    id: crypto.randomUUID(),
    exercise_name: '',
    weight_kg: 0,
    reps: 0,
    sets: 0,
  };
}

type Props = {
  onSaved?: () => void;
};

export default function WorkoutForm({ onSaved }: Props) {
  const [performedAt, setPerformedAt] = useState(new Date().toISOString().slice(0, 16));
  const [note, setNote] = useState('');
  const [exercises, setExercises] = useState<ExerciseRow[]>([newExerciseRow()]);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const updateExercise = (id: string, patch: Partial<ExerciseRow>) => {
    setExercises((prev) =>
      prev.map((ex) => (ex.id === id ? { ...ex, ...patch } : ex))
    );
  };

  const addExercise = () => setExercises((prev) => [...prev, newExerciseRow()]);

  const removeExercise = (id: string) => {
    setExercises((prev) => (prev.length <= 1 ? prev : prev.filter((ex) => ex.id !== id)));
  };

  const totalVolume = exercises.reduce(
    (sum, ex) => sum + (ex.weight_kg || 0) * (ex.reps || 0) * (ex.sets || 0),
    0
  );

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setMessage(null);

    const validExercises = exercises.filter((ex) => ex.exercise_name.trim());
    if (validExercises.length === 0) {
      setMessage('⚠️ 種目を1つ以上入力してください');
      setSubmitting(false);
      return;
    }

    try {
      const res = await fetch('/api/workouts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          performed_at: new Date(performedAt).toISOString(),
          note: note.trim() || undefined,
          exercises: validExercises.map(({ exercise_name, weight_kg, reps, sets }) => ({
            exercise_name,
            weight_kg,
            reps,
            sets,
          })),
        }),
      });
      await parseApiResponse(res);
      setMessage(`✅ ${validExercises.length}種目を保存しました`);
      setExercises([newExerciseRow()]);
      setNote('');
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
          <label className="label">日時</label>
          <input
            type="datetime-local"
            required
            value={performedAt}
            onChange={(e) => setPerformedAt(e.target.value)}
            className="field"
          />
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-gray-700">種目</p>
          <button
            type="button"
            onClick={addExercise}
            className="text-sm font-semibold text-blue-600"
          >
            ＋ 種目を追加
          </button>
        </div>

        {exercises.map((ex, index) => (
          <div key={ex.id} className="card space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-gray-500">種目 {index + 1}</span>
              {exercises.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeExercise(ex.id)}
                  className="text-xs text-red-600"
                >
                  削除
                </button>
              )}
            </div>

            <div>
              <label className="label">種目名</label>
              <input
                type="text"
                value={ex.exercise_name}
                onChange={(e) => updateExercise(ex.id, { exercise_name: e.target.value })}
                className="field"
                placeholder="ベンチプレス"
              />
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="label text-center">重量 (kg)</label>
                <input
                  type="number"
                  inputMode="decimal"
                  min={0}
                  step="0.5"
                  value={ex.weight_kg}
                  onChange={(e) =>
                    updateExercise(ex.id, { weight_kg: Number(e.target.value) })
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
                  step="1"
                  value={ex.reps}
                  onChange={(e) => updateExercise(ex.id, { reps: Number(e.target.value) })}
                  className="field text-center"
                />
              </div>
              <div>
                <label className="label text-center">セット</label>
                <input
                  type="number"
                  inputMode="numeric"
                  min={0}
                  step="1"
                  value={ex.sets}
                  onChange={(e) => updateExercise(ex.id, { sets: Number(e.target.value) })}
                  className="field text-center"
                />
              </div>
            </div>

            <p className="text-xs text-gray-500">
              ボリューム: {Math.round((ex.weight_kg || 0) * (ex.reps || 0) * (ex.sets || 0))} kg
            </p>
          </div>
        ))}
      </div>

      <div className="card">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600">総ボリューム（全種目）</span>
          <span className="text-lg font-bold text-blue-600">{totalVolume} kg</span>
        </div>
      </div>

      <div className="card">
        <label className="label">メモ</label>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          className="field"
          rows={3}
          placeholder="フォーム意識、調子など"
        />
      </div>

      <button type="submit" disabled={submitting} className="btn-primary">
        {submitting ? '保存中…' : '保存する'}
      </button>

      {message && <p className="text-center text-sm">{message}</p>}
    </form>
  );
}
