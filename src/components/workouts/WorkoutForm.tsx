'use client';

import { useMemo, useState } from 'react';
import { parseApiResponse } from '@/lib/api-client';
import { datetimeLocalToIso, toDatetimeLocalValue } from '@/lib/datetime';
import {
  BODY_PART_LABELS,
  EXERCISES,
  GOJUON_ROWS,
  exercisesByGojuon,
  exercisesByPart,
  type BodyPart,
} from '@/lib/workouts/exercises';
import {
  ButtonLoadingContent,
  FormLoadingOverlay,
} from '@/components/ui/Loading';
import type { ExerciseEntry } from '@/types/workout';

type ExerciseRow = ExerciseEntry & { id: string };
type NameMode = 'part' | 'gojuon' | 'free';

function newExerciseRow(name = ''): ExerciseRow {
  return {
    id: crypto.randomUUID(),
    exercise_name: name,
    weight_kg: 0,
    reps: 0,
    sets: 0,
  };
}

type Props = {
  onSaved?: () => void;
};

export default function WorkoutForm({ onSaved }: Props) {
  const [performedAt, setPerformedAt] = useState(() => toDatetimeLocalValue());
  const [note, setNote] = useState('');
  const [exercises, setExercises] = useState<ExerciseRow[]>([newExerciseRow()]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [nameMode, setNameMode] = useState<NameMode>('part');
  const [bodyPart, setBodyPart] = useState<BodyPart>('chest');
  const [gojuon, setGojuon] = useState('あ');
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [justAddedId, setJustAddedId] = useState<string | null>(null);
  const [flashChipKey, setFlashChipKey] = useState<string | null>(null);
  const [addBump, setAddBump] = useState(false);

  const pickerExercises = useMemo(() => {
    if (nameMode === 'part') return exercisesByPart(bodyPart);
    if (nameMode === 'gojuon') return exercisesByGojuon(gojuon);
    return [];
  }, [nameMode, bodyPart, gojuon]);

  const updateExercise = (id: string, patch: Partial<ExerciseRow>) => {
    setExercises((prev) =>
      prev.map((ex) => (ex.id === id ? { ...ex, ...patch } : ex))
    );
  };

  const markJustAdded = (id: string) => {
    setJustAddedId(id);
    window.setTimeout(() => {
      setJustAddedId((current) => (current === id ? null : current));
    }, 400);
  };

  const flashChip = (key: string) => {
    setFlashChipKey(key);
    window.setTimeout(() => {
      setFlashChipKey((current) => (current === key ? null : current));
    }, 450);
  };

  const addExercise = (name = '', chipKey?: string) => {
    if (chipKey) flashChip(chipKey);
    else {
      setAddBump(true);
      window.setTimeout(() => setAddBump(false), 250);
    }
    const row = newExerciseRow(name);
    setExercises((prev) => [...prev, row]);
    setActiveId(row.id);
    markJustAdded(row.id);
  };

  const removeExercise = (id: string) => {
    setExercises((prev) => {
      const next = prev.length <= 1 ? prev : prev.filter((ex) => ex.id !== id);
      if (activeId === id) setActiveId(next[0]?.id ?? null);
      return next;
    });
  };

  const applyExerciseName = (name: string, chipKey?: string) => {
    if (chipKey) flashChip(chipKey);
    const targetId = activeId ?? exercises[0]?.id;
    if (!targetId) {
      addExercise(name);
      return;
    }
    const target = exercises.find((ex) => ex.id === targetId);
    if (target && !target.exercise_name.trim()) {
      updateExercise(targetId, { exercise_name: name });
      markJustAdded(targetId);
      return;
    }
    addExercise(name);
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
          performed_at: datetimeLocalToIso(performedAt),
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
      setActiveId(null);
      setNote('');
      onSaved?.();
    } catch (err) {
      setMessage(`⚠️ ${(err as Error).message}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="relative space-y-4">
      <FormLoadingOverlay show={submitting} label="筋トレを保存しています…" />
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

      <div className="card space-y-3">
        <p className="text-sm font-semibold text-gray-700">種目の選び方</p>
        <div className="grid grid-cols-3 gap-2">
          {(
            [
              { value: 'part' as const, label: '部位別' },
              { value: 'gojuon' as const, label: 'あいうえお' },
              { value: 'free' as const, label: '自分で入力' },
            ] as const
          ).map((m) => (
            <button
              key={m.value}
              type="button"
              onClick={() => setNameMode(m.value)}
              className={`btn-segment ${nameMode === m.value ? 'btn-segment-active' : ''}`}
            >
              {m.label}
            </button>
          ))}
        </div>

        {nameMode === 'part' && (
          <>
            <div className="flex flex-wrap gap-1.5">
              {(Object.keys(BODY_PART_LABELS) as BodyPart[]).map((part) => (
                <button
                  key={part}
                  type="button"
                  onClick={() => setBodyPart(part)}
                  className={`chip ${bodyPart === part ? 'chip-active' : ''}`}
                >
                  {BODY_PART_LABELS[part]}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {pickerExercises.map((ex) => {
                const key = `part-${ex.name}`;
                return (
                  <button
                    key={ex.name}
                    type="button"
                    onClick={() => applyExerciseName(ex.name, key)}
                    className={`chip ${flashChipKey === key ? 'chip-flash' : ''}`}
                  >
                    {ex.name}
                  </button>
                );
              })}
            </div>
          </>
        )}

        {nameMode === 'gojuon' && (
          <>
            <div className="flex flex-wrap gap-1.5">
              {GOJUON_ROWS.map((row) => (
                <button
                  key={row.label}
                  type="button"
                  onClick={() => setGojuon(row.label)}
                  className={`chip ${gojuon === row.label ? 'chip-active' : ''}`}
                >
                  {row.label}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {pickerExercises.length === 0 ? (
                <p className="text-xs text-gray-500">この行の種目はまだありません</p>
              ) : (
                pickerExercises.map((ex) => {
                  const key = `gojuon-${ex.name}`;
                  return (
                    <button
                      key={ex.name}
                      type="button"
                      onClick={() => applyExerciseName(ex.name, key)}
                      className={`chip ${flashChipKey === key ? 'chip-flash' : ''}`}
                    >
                      {ex.name}
                    </button>
                  );
                })
              )}
            </div>
          </>
        )}

        {nameMode === 'free' && (
          <p className="text-xs text-gray-500">
            下の種目名欄に自由に入力できます。候補から選ぶ場合は「部位別」「あいうえお」に切り替えてください。
          </p>
        )}
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-gray-700">種目</p>
          <button
            type="button"
            onClick={() => addExercise()}
            className={`btn-ghost ${addBump ? 'animate-tap-pop' : ''}`}
          >
            ＋ 種目を追加
          </button>
        </div>

        {exercises.map((ex, index) => (
          <div
            key={ex.id}
            className={`card space-y-3 ${activeId === ex.id ? 'ring-2 ring-blue-200' : ''} ${
              justAddedId === ex.id ? 'row-enter' : ''
            }`}
            onClick={() => setActiveId(ex.id)}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-gray-500">種目 {index + 1}</span>
              {exercises.length > 1 && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeExercise(ex.id);
                  }}
                  className="btn-danger-ghost"
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
                onFocus={() => setActiveId(ex.id)}
                className="field"
                placeholder="ベンチプレス"
                list="exercise-suggestions"
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

        <datalist id="exercise-suggestions">
          {EXERCISES.map((ex) => (
            <option key={ex.name} value={ex.name} />
          ))}
        </datalist>
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
        <ButtonLoadingContent loading={submitting} loadingLabel="保存中…">
          保存する
        </ButtonLoadingContent>
      </button>

      {message && <p className="text-center text-sm">{message}</p>}
    </form>
  );
}
