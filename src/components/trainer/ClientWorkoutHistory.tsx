'use client';

import { formatDateTimeJa } from '@/lib/datetime';

type Workout = {
  exercise_name: string;
  weight_kg: number;
  reps: number;
  sets: number;
  performed_at: string;
};

export default function ClientWorkoutHistory({ workouts }: { workouts: Workout[] }) {
  if (!workouts.length) {
    return <p className="text-sm text-gray-400">筋トレの記録がありません。</p>;
  }

  return (
    <div className="space-y-2">
      {workouts.map((w, i) => (
        <div key={i} className="card-nested flex items-center justify-between gap-3">
          <div className="min-w-0 flex-1 space-y-0.5">
            <p className="truncate text-sm font-semibold text-gray-800">{w.exercise_name}</p>
            <p className="text-xs text-gray-500">
              {w.weight_kg}kg × {w.reps}回 × {w.sets}セット
            </p>
          </div>
          <p className="shrink-0 text-xs text-gray-400">{formatDateTimeJa(w.performed_at)}</p>
        </div>
      ))}
    </div>
  );
}
