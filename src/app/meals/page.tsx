'use client';

import { useState } from 'react';
import MealForm from '@/components/meals/MealForm';
import MealList from '@/components/meals/MealList';

export default function MealsPage() {
  const [refreshKey, setRefreshKey] = useState(0);

  return (
    <main className="page-main">
      <header className="pt-2">
        <h1 className="page-title">食事を記録</h1>
      </header>
      <MealForm onSaved={() => setRefreshKey((k) => k + 1)} />
      <MealList refreshKey={refreshKey} />
    </main>
  );
}
