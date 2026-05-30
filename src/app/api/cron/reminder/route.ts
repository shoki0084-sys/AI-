import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { pushTextMessage } from '@/lib/line/client';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const REMINDER_TEXT =
  '🏋️ 本日の記録はお済みですか？\n食事・体重・筋トレを忘れずに記録しましょう！';

export async function GET(req: Request) {
  const authHeader = req.headers.get('authorization');
  const expected = `Bearer ${process.env.CRON_SECRET}`;
  if (!process.env.CRON_SECRET || authHeader !== expected) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  let supabase;
  try {
    supabase = createAdminClient();
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 503 });
  }

  const { data: allUsers, error: allError } = await supabase
    .from('users')
    .select('id, line_user_id');

  if (allError) return NextResponse.json({ error: allError.message }, { status: 500 });

  const users = (allUsers ?? []).filter((u) => u.line_user_id?.trim());

  const targets = users;

  const results = await Promise.allSettled(
    targets.map(async (u) => {
      await pushTextMessage(u.line_user_id!.trim(), REMINDER_TEXT);
      await supabase.from('notifications').insert({
        user_id: u.id,
        channel: 'line',
        message: REMINDER_TEXT,
        sent_at: new Date().toISOString(),
      });
    })
  );

  const sent = results.filter((r) => r.status === 'fulfilled').length;
  const failed = results.length - sent;
  const errors = results
    .filter((r): r is PromiseRejectedResult => r.status === 'rejected')
    .map((r) => String(r.reason?.message ?? r.reason));

  return NextResponse.json({
    sent,
    failed,
    eligible: targets.length,
    errors: errors.length > 0 ? errors : undefined,
    totalUsers: allUsers?.length ?? 0,
    hasServiceRoleKey: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
    hint:
      targets.length === 0
        ? 'line_user_id が登録されたユーザーが0人です。Supabaseの users 表と .env.local の SUPABASE_SERVICE_ROLE_KEY（同一プロジェクト）を確認し、npm run dev を再起動してください。'
        : sent === 0 && failed > 0
          ? 'LINE送信に失敗しました。errors を確認し、公式アカウントを友だち追加しているか確認してください。'
          : sent > 0
            ? '送信成功。LINEアプリのトーク一覧で公式アカウントを開いてください（curlには返信はありません）。'
            : undefined,
  });
}
