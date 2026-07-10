'use client';

import { useEffect, useState } from 'react';
import { parseApiResponse } from '@/lib/api-client';
import ClientWeightChart from './ClientWeightChart';
import ClientPfcChart from './ClientPfcChart';
import ClientWorkoutHistory from './ClientWorkoutHistory';
import CoachAnalysis from './CoachAnalysis';
import WeeklyReport from './WeeklyReport';

type Detail = {
  client: { id: string; user_id: string; display_name: string | null; email: string | null };
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

function SectionCard({
  title,
  icon,
  children,
}: {
  title: string;
  icon: string;
  children: React.ReactNode;
}) {
  return (
    <section className="card space-y-3">
      <div className="flex items-center gap-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-50 text-base" aria-hidden>
          {icon}
        </span>
        <p className="section-title">{title}</p>
      </div>
      {children}
    </section>
  );
}

function DetailSkeleton() {
  return (
    <div className="space-y-4">
      <div className="card h-16 animate-pulse bg-gray-100" />
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="card h-48 animate-pulse bg-gray-100" />
      ))}
    </div>
  );
}

export default function ClientDetail({ clientId }: { clientId: string }) {
  const [data, setData] = useState<Detail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/trainer/clients/${clientId}`);
        setData(await parseApiResponse<Detail>(res));
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setLoading(false);
      }
    })();
  }, [clientId]);

  if (loading) return <DetailSkeleton />;
  if (error) return <p className="card text-sm text-rose-600">⚠️ {error}</p>;
  if (!data) return null;

  const name = data.client.display_name || data.client.email || '顧客';

  return (
    <div className="space-y-4">
      <div className="card border-blue-100 bg-blue-50/40">
        <p className="text-sm text-gray-500">担当顧客</p>
        <p className="text-lg font-bold text-gray-900">{name}</p>
        {data.client.email && data.client.display_name && (
          <p className="text-xs text-gray-400">{data.client.email}</p>
        )}
      </div>

      <SectionCard title="体重グラフ" icon="⚖️">
        <ClientWeightChart weights={data.weights} />
      </SectionCard>

      <SectionCard title="PFC推移" icon="🍱">
        <ClientPfcChart meals={data.meals} />
      </SectionCard>

      <SectionCard title="筋トレ履歴" icon="🏋️">
        <ClientWorkoutHistory workouts={data.workouts} />
      </SectionCard>

      <CoachAnalysis clientId={clientId} />

      <WeeklyReport clientId={clientId} />
    </div>
  );
}
