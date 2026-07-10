import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { hasSupabaseEnv, SUPABASE_ENV_ERROR } from '@/lib/env';
import { formatDateJa, getJstDayBounds } from '@/lib/datetime';
import ClientWeightChart from '@/components/trainer/ClientWeightChart';
import PfcAchievement from '@/components/reports/PfcAchievement';
import ReportSection from '@/components/reports/ReportSection';
import ReportSummary from '@/components/reports/ReportSummary';

export const dynamic = 'force-dynamic';

function round1(n: number) {
  return Math.round(n * 10) / 10;
}

function rate(actual: number, target?: number | null) {
  if (!target || target <= 0) return null;
  return Math.round((actual / target) * 100);
}

export default async function ReportsPage() {
  if (!hasSupabaseEnv()) {
    return (
      <main className="page-main">
        <p className="card text-sm text-amber-700">{SUPABASE_ENV_ERROR}</p>
      </main>
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { end, label } = getJstDayBounds();
  const { start } = getJstDayBounds(new Date(Date.now() - 6 * 86_400_000));

  const [profileRes, weightsRes, mealsRes, workoutsRes] = await Promise.all([
    supabase
      .from('users')
      .select('target_calories, target_protein, target_fat, target_carbs')
      .eq('id', user.id)
      .single(),
    supabase
      .from('weight_logs')
      .select('weight_kg, body_fat, measured_at')
      .eq('user_id', user.id)
      .gte('measured_at', start)
      .lte('measured_at', end)
      .order('measured_at', { ascending: true }),
    supabase
      .from('meals')
      .select('calories, protein, fat, carbs')
      .eq('user_id', user.id)
      .gte('eaten_at', start)
      .lte('eaten_at', end),
    supabase
      .from('workouts')
      .select('id', { count: 'exact' })
      .eq('user_id', user.id)
      .gte('performed_at', start)
      .lte('performed_at', end),
  ]);

  const profile = profileRes.data;
  const weights = (weightsRes.data ?? []).map((w) => ({
    weight_kg: Number(w.weight_kg),
    body_fat: w.body_fat != null ? Number(w.body_fat) : null,
    measured_at: w.measured_at,
  }));
  const meals = mealsRes.data ?? [];
  const workoutCount = workoutsRes.count ?? 0;

  const totals = meals.reduce(
    (acc, m) => ({
      calories: acc.calories + Number(m.calories ?? 0),
      protein: acc.protein + Number(m.protein ?? 0),
      fat: acc.fat + Number(m.fat ?? 0),
      carbs: acc.carbs + Number(m.carbs ?? 0),
    }),
    { calories: 0, protein: 0, fat: 0, carbs: 0 }
  );
  const avgDaily = {
    calories: round1(totals.calories / 7),
    protein: round1(totals.protein / 7),
    fat: round1(totals.fat / 7),
    carbs: round1(totals.carbs / 7),
  };

  const pfcItems = [
    {
      key: 'calories',
      label: 'カロリー',
      value: avgDaily.calories,
      rate: rate(avgDaily.calories, profile?.target_calories),
      unit: 'kcal',
    },
    {
      key: 'protein',
      label: 'タンパク質',
      value: avgDaily.protein,
      rate: rate(avgDaily.protein, profile?.target_protein),
      unit: 'g',
    },
    {
      key: 'fat',
      label: '脂質',
      value: avgDaily.fat,
      rate: rate(avgDaily.fat, profile?.target_fat),
      unit: 'g',
    },
    {
      key: 'carbs',
      label: '炭水化物',
      value: avgDaily.carbs,
      rate: rate(avgDaily.carbs, profile?.target_carbs),
      unit: 'g',
    },
  ];

  return (
    <main className="page-main">
      <header className="space-y-0.5 pt-2">
        <h1 className="page-title">週間レポート</h1>
        <p className="text-xs text-gray-400">直近7日間（{formatDateJa(label)} まで）</p>
      </header>

      <ReportSection title="体重推移グラフ" icon="⚖️">
        <ClientWeightChart weights={weights} />
      </ReportSection>

      <ReportSection title="PFC達成率" icon="🍱">
        <p className="text-xs text-gray-400">1日平均 / 目標に対する達成率</p>
        <PfcAchievement items={pfcItems} />
      </ReportSection>

      <ReportSection title="筋トレ回数" icon="🏋️">
        <div className="card-nested flex items-center justify-between gap-3">
          <div>
            <p className="stat-label">直近7日間のトレーニング</p>
            <p className="stat-value">
              {workoutCount}
              <span className="stat-unit">回</span>
            </p>
          </div>
          <span className="text-3xl" aria-hidden>
            🏋️
          </span>
        </div>
      </ReportSection>

      <ReportSummary />
    </main>
  );
}
