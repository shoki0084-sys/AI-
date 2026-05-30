'use client';

import { useState } from 'react';
import WeightChart from '@/components/weight/WeightChart';
import WeightForm from '@/components/weight/WeightForm';

export default function WeightPage() {
  const [refreshKey, setRefreshKey] = useState(0);

  return (
    <main className="space-y-4 p-4">
      <header className="pt-4">
        <h1 className="page-title">体重推移</h1>
      </header>
      <WeightForm onSaved={() => setRefreshKey((k) => k + 1)} />
      <WeightChart refreshKey={refreshKey} />
    </main>
  );
}
