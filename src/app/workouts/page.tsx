'use client';

import { useState } from 'react';
import WorkoutForm from '@/components/workouts/WorkoutForm';
import WorkoutList from '@/components/workouts/WorkoutList';

export default function WorkoutsPage() {
  const [refreshKey, setRefreshKey] = useState(0);

  return (
    <main className="space-y-4 p-4">
      <header className="pt-4">
        <h1 className="page-title">筋トレを記録</h1>
      </header>
      <WorkoutForm onSaved={() => setRefreshKey((k) => k + 1)} />
      <WorkoutList refreshKey={refreshKey} />
    </main>
  );
}
