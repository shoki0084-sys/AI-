import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { hasSupabaseEnv, SUPABASE_ENV_ERROR } from '@/lib/env';
import { isAdminEmail } from '@/lib/auth/admin';
import AdminPanel from '@/components/admin/AdminPanel';

export const dynamic = 'force-dynamic';

export default async function AdminPage() {
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
          <h1 className="page-title">管理者モード</h1>
        </header>
        <p className="card text-sm text-amber-700">
          このアカウントには管理者権限がありません。環境変数 ADMIN_EMAILS に登録されたメールでログインしてください。
        </p>
      </main>
    );
  }

  return (
    <main className="space-y-4 p-4">
      <header className="pt-4">
        <h1 className="page-title">管理者モード</h1>
        <p className="text-xs text-gray-400">全ユーザーの記録確認・AIアドバイス生成</p>
      </header>
      <AdminPanel />
    </main>
  );
}
