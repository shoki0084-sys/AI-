import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { hasSupabaseEnv, SUPABASE_ENV_ERROR } from '@/lib/env';
import { getJstDayBounds } from '@/lib/datetime';
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
      <main className="space-y-6 p-4">
        <p className="card text-sm text-amber-700">{SUPABASE_ENV_ERROR}</p>
      </main>
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { end } = getJstDayBounds();
  const { start } = getJstDayBounds(new Date(Date.now() - 6 * 86_400_000));

  const [profileRes, weightsRes, mealsRes, workoutsRes] = await Promise.all([
    supabase
      .from('users')
      .select('target_calories, target_protein, target_fat, target_carbs')
      .eq('id', user.id)
      .single(),
    supabase
      .from('weight_logs')
      .select('weight_kg, measured_at')
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
  const weights = weightsRes.data ?? [];
  const meals = mealsRes.data ?? [];

  const avgWeight =
    weights.length > 0
      ? round1(weights.reduce((s, w) => s + Number(w.weight_kg ?? 0), 0) / weights.length)
      : null;
  const weightChange =
    weights.length >= 2
      ? round1(Number(weights[weights.length - 1].weight_kg) - Number(weights[0].weight_kg))
      : null;

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

  const pfc = [
    { key: 'P', label: 'タンパク質', value: avgDaily.protein, rate: rate(avgDaily.protein, profile?.target_protein) },
    { key: 'F', label: '脂質', value: avgDaily.fat, rate: rate(avgDaily.fat, profile?.target_fat) },
    { key: 'C', label: '炭水化物', value: avgDaily.carbs, rate: rate(avgDaily.carbs, profile?.target_carbs) },
  ];

  return (
    <main className="space-y-6 p-4">
      <header className="space-y-1 pt-4">
        <h1 className="page-title">週間レポート</h1>
        <p className="text-xs text-gray-400">直近7日間</p>
      </header>

      <section className="grid grid-cols-2 gap-3">
        <div className="card space-y-1">
          <p className="text-xs text-gray-500">7日平均体重</p>
          <p className="text-2xl font-bold">
            {avgWeight != null ? avgWeight : '—'}
            {avgWeight != null && <span className="ml-1 text-sm font-normal text-gray-500">kg</span>}
          </p>
        </div>

        <div className="card space-y-1">
          <p className="text-xs text-gray-500">体重増減</p>
          {weightChange != null ? (
            <p className={`text-2xl font-bold ${weightChange > 0 ? 'text-red-600' : 'text-green-600'}`}>
              {weightChange > 0 ? '+' : ''}
              {weightChange}
              <span className="ml-1 text-sm font-normal text-gray-500">kg</span>
            </p>
          ) : (
            <p className="text-sm text-gray-400">データ不足</p>
          )}
        </div>

        <div className="card space-y-1">
          <p className="text-xs text-gray-500">トレーニング回数</p>
          <p className="text-2xl font-bold">
            {workoutsRes.count ?? 0}
            <span className="ml-1 text-sm font-normal text-gray-500">回</span>
          </p>
        </div>

        <div className="card space-y-1">
          <p className="text-xs text-gray-500">1日平均カロリー</p>
          <p className="text-2xl font-bold">
            {avgDaily.calories}
            <span className="ml-1 text-sm font-normal text-gray-500">kcal</span>
          </p>
          {profile?.target_calories ? (
            <p className="text-xs text-gray-400">達成率 {rate(avgDaily.calories, profile.target_calories)}%</p>
          ) : null}
        </div>
      </section>

      <section className="card space-y-3">
        <p className="text-sm font-semibold text-gray-600">PFC達成率（1日平均 / 目標）</p>
        <div className="space-y-3">
          {pfc.map((item) => (
            <div key={item.key} className="space-y-1">
              <div className="flex items-baseline justify-between text-sm">
                <span className="text-gray-600">
                  {item.label} <span className="text-gray-400">{item.value}g</span>
                </span>
                <span className="font-semibold">{item.rate != null ? `${item.rate}%` : '目標未設定'}</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
                <div
                  className="h-full rounded-full bg-blue-500"
                  style={{ width: `${Math.min(100, item.rate ?? 0)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </section>

      <ReportSummary />
    </main>
  );
}
