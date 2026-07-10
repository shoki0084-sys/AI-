import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { hasSupabaseEnv, SUPABASE_ENV_ERROR } from '@/lib/env';
import { isAdminEmail } from '@/lib/auth/admin';
import ClientList from '@/components/trainer/ClientList';
import TrainerSummaryCards from '@/components/trainer/TrainerSummaryCards';
import UninputAlerts from '@/components/trainer/UninputAlerts';
import { formatDateJa, getJstDayBounds } from '@/lib/datetime';

export const dynamic = 'force-dynamic';

export default async function TrainerPage() {
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

  if (!isAdminEmail(user.email)) {
    return (
      <main className="space-y-4 p-4">
        <header className="pt-4">
          <h1 className="page-title">顧客管理</h1>
        </header>
        <p className="card text-sm text-amber-700">
          このアカウントにはトレーナー権限がありません。環境変数 ADMIN_EMAILS に登録されたメールでログインしてください。
        </p>
      </main>
    );
  }

  const { label } = getJstDayBounds();

  return (
    <main className="page-main">
      <header className="space-y-0.5 pt-2">
        <p className="text-sm text-gray-500">トレーナー向け</p>
        <h1 className="page-title">管理画面</h1>
        <p className="text-xs text-gray-400">{formatDateJa(label)}</p>
      </header>

      <TrainerSummaryCards />

      <section className="space-y-3">
        <p className="section-title">本日の未入力</p>
        <UninputAlerts />
      </section>

      <ClientList />
    </main>
  );
}
