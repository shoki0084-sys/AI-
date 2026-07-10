import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { hasSupabaseEnv, SUPABASE_ENV_ERROR } from '@/lib/env';
import { isAdminEmail } from '@/lib/auth/admin';
import ClientDetail from '@/components/trainer/ClientDetail';

export const dynamic = 'force-dynamic';

export default async function TrainerClientPage({
  params,
}: {
  params: { clientId: string };
}) {
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
          <h1 className="page-title">顧客詳細</h1>
        </header>
        <p className="card text-sm text-amber-700">
          このアカウントにはトレーナー権限がありません。
        </p>
      </main>
    );
  }

  return (
    <main className="page-main">
      <header className="space-y-1 pt-2">
        <Link href="/trainer" className="btn-ghost text-xs">
          ‹ 顧客一覧に戻る
        </Link>
        <p className="text-sm text-gray-500">トレーナー向け</p>
        <h1 className="page-title">顧客詳細</h1>
      </header>
      <ClientDetail clientId={params.clientId} />
    </main>
  );
}
