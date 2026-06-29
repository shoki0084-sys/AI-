import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { hasSupabaseEnv, SUPABASE_ENV_ERROR } from '@/lib/env';
import { getJstDayBounds, formatDateJa } from '@/lib/datetime';

export const dynamic = 'force-dynamic';

const SHORTCUTS = [
  { href: '/meals', label: '食事を記録', icon: '🍱' },
  { href: '/workouts', label: '筋トレを記録', icon: '🏋️' },
  { href: '/weight', label: '体重を記録', icon: '⚖️' },
  { href: '/advice', label: 'AIアドバイス', icon: '🤖' },
];

function round1(n: number) {
  return Math.round(n * 10) / 10;
}

export default async function HomePage() {
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

  const { start, end, label } = getJstDayBounds();

  const [profileRes, latestWeightRes, startWeightRes, mealsRes, workoutsRes, adviceRes] =
    await Promise.all([
      supabase.from('users').select('*').eq('id', user.id).single(),
      supabase
        .from('weight_logs')
        .select('weight_kg, measured_at')
        .eq('user_id', user.id)
        .order('measured_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from('weight_logs')
        .select('weight_kg, measured_at')
        .eq('user_id', user.id)
        .order('measured_at', { ascending: true })
        .limit(1)
        .maybeSingle(),
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
      supabase
        .from('advices')
        .select('response, advice_date, created_at')
        .eq('user_id', user.id)
        .order('advice_date', { ascending: false, nullsFirst: false })
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

  const profile = profileRes.data as
    | { target_weight?: number | null }
    | null;
  const latestWeight = latestWeightRes.data?.weight_kg ?? null;
  const startWeight = startWeightRes.data?.weight_kg ?? null;
  const targetWeight = profile?.target_weight ?? null;
  const weightDiff =
    latestWeight != null && targetWeight != null
      ? round1(Number(latestWeight) - Number(targetWeight))
      : null;

  let progressPct: number | null = null;
  let goalReached = false;
  if (latestWeight != null && targetWeight != null && startWeight != null) {
    const start = Number(startWeight);
    const current = Number(latestWeight);
    const target = Number(targetWeight);
    const totalGap = Math.abs(start - target);
    if (totalGap < 0.01) {
      progressPct = 100;
    } else {
      const done = Math.abs(start - current);
      const overshoot =
        (start > target && current <= target) ||
        (start < target && current >= target);
      progressPct = overshoot ? 100 : Math.max(0, Math.min(100, round1((done / totalGap) * 100)));
    }
    goalReached = progressPct >= 100;
  }

  const totals = (mealsRes.data ?? []).reduce(
    (acc, m) => ({
      calories: acc.calories + Number(m.calories ?? 0),
      protein: acc.protein + Number(m.protein ?? 0),
      fat: acc.fat + Number(m.fat ?? 0),
      carbs: acc.carbs + Number(m.carbs ?? 0),
    }),
    { calories: 0, protein: 0, fat: 0, carbs: 0 }
  );

  const workoutCount = workoutsRes.count ?? 0;
  const latestAdvice = adviceRes.data;

  return (
    <main className="page-main">
      <header className="flex items-start justify-between pt-2">
        <div className="space-y-0.5">
          <p className="text-sm text-gray-500">ようこそ</p>
          <h1 className="page-title">ダッシュボード</h1>
          <p className="text-xs text-gray-400">{formatDateJa(label)}</p>
        </div>
        <Link href="/settings" className="btn-secondary shrink-0 gap-1.5 px-3">
          <span aria-hidden>⚙️</span>
          <span>設定</span>
        </Link>
      </header>

      <section className="grid grid-cols-2 gap-3">
        <div className="card space-y-1">
          <p className="stat-label">最新体重</p>
          <p className="stat-value">
            {latestWeight != null ? `${round1(Number(latestWeight))}` : '—'}
            {latestWeight != null && <span className="stat-unit">kg</span>}
          </p>
        </div>

        <div className="card space-y-1">
          <p className="stat-label">目標体重との差</p>
          {weightDiff != null ? (
            <p className={`stat-value ${weightDiff > 0 ? 'text-danger' : 'text-success'}`}>
              {weightDiff > 0 ? '+' : ''}
              {weightDiff}
              <span className="stat-unit">kg</span>
            </p>
          ) : (
            <p className="pt-1 text-sm text-gray-400">
              {targetWeight == null ? '目標未設定' : '体重未記録'}
            </p>
          )}
        </div>

        {targetWeight != null && (
          <div className="card col-span-2 space-y-3">
            <div className="flex items-baseline justify-between gap-2">
              <p className="stat-label">目標体重への進捗</p>
              <p className="text-sm font-semibold text-gray-800">
                目標 {round1(Number(targetWeight))}
                <span className="ml-1 text-xs font-normal text-gray-400">kg</span>
              </p>
            </div>
            {progressPct != null ? (
              <>
                <div className="progress-track">
                  <div
                    className={`progress-fill ${goalReached ? 'progress-fill-success' : ''}`}
                    style={{ width: `${progressPct}%` }}
                  />
                </div>
                <p className="text-xs text-gray-500">
                  {goalReached
                    ? '🎉 目標達成！'
                    : `達成率 ${progressPct}%（残り ${round1(Math.abs(Number(latestWeight) - Number(targetWeight)))}kg）`}
                </p>
              </>
            ) : (
              <p className="text-sm text-gray-400">体重を記録すると進捗が表示されます。</p>
            )}
          </div>
        )}

        <div className="card col-span-2 space-y-3">
          <div className="flex items-baseline justify-between gap-2">
            <p className="stat-label">今日のPFC合計</p>
            <p className="text-sm font-semibold text-gray-800">
              {round1(totals.calories)}
              <span className="ml-1 text-xs font-normal text-gray-400">kcal</span>
            </p>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div className="macro-p">
              <p className="macro-label">P</p>
              <p className="macro-value">{round1(totals.protein)}g</p>
            </div>
            <div className="macro-f">
              <p className="macro-label">F</p>
              <p className="macro-value">{round1(totals.fat)}g</p>
            </div>
            <div className="macro-c">
              <p className="macro-label">C</p>
              <p className="macro-value">{round1(totals.carbs)}g</p>
            </div>
          </div>
        </div>

        <div className="card space-y-1">
          <p className="stat-label">今日のトレーニング</p>
          <p className="stat-value">
            {workoutCount}
            <span className="stat-unit">回</span>
          </p>
        </div>

        <Link href="/advice" className="card-interactive space-y-1.5">
          <p className="stat-label">最新AIアドバイス</p>
          {latestAdvice ? (
            <p className="line-clamp-3 text-xs leading-relaxed text-gray-600">
              {latestAdvice.response}
            </p>
          ) : (
            <p className="text-sm text-gray-400">まだありません</p>
          )}
        </Link>
      </section>

      <section className="space-y-3">
        <p className="section-title">クイック記録</p>
        <div className="grid grid-cols-2 gap-3">
          {SHORTCUTS.map((s) => (
            <Link key={s.href} href={s.href} className="shortcut-card">
              <span className="shortcut-icon">{s.icon}</span>
              <span className="text-sm font-semibold text-gray-800">{s.label}</span>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
