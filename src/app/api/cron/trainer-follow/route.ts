import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { pushTextMessage } from '@/lib/line/client';
import { getJstDayBounds } from '@/lib/datetime';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type FollowType = 'reminder' | 'no-input' | 'stalled';

/**
 * トレーナー向けLINEフォロー。?type= で切替（cron で個別スケジュール）
 *  - reminder : 21時リマインド（本日未記録の項目を通知）
 *  - no-input : 3日間まったく記録がない顧客へ通知
 *  - stalled  : 直近7日間の体重が停滞している顧客へ通知
 */
export async function GET(req: Request) {
  const authHeader = req.headers.get('authorization');
  const expected = `Bearer ${process.env.CRON_SECRET}`;
  if (!process.env.CRON_SECRET || authHeader !== expected) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const type = (new URL(req.url).searchParams.get('type') ?? 'reminder') as FollowType;
  if (!['reminder', 'no-input', 'stalled'].includes(type)) {
    return NextResponse.json({ error: 'invalid type' }, { status: 400 });
  }

  let supabase;
  try {
    supabase = createAdminClient();
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 503 });
  }

  // トレーナーに紐付く顧客の user_id を取得
  const { data: clientRows, error: clientErr } = await supabase
    .from('clients')
    .select('user_id');
  if (clientErr) return NextResponse.json({ error: clientErr.message }, { status: 500 });

  const userIds = Array.from(new Set((clientRows ?? []).map((c) => c.user_id)));
  if (userIds.length === 0) {
    return NextResponse.json({ type, sent: 0, eligible: 0 });
  }

  const { data: users, error: userErr } = await supabase
    .from('users')
    .select('id, line_user_id')
    .in('id', userIds);
  if (userErr) return NextResponse.json({ error: userErr.message }, { status: 500 });

  const targets = (users ?? []).filter((u) => u.line_user_id?.trim());

  const { start: todayStart, end: todayEnd } = getJstDayBounds();
  const threeDaysAgo = new Date(Date.now() - 3 * 86_400_000).toISOString();
  const sevenDaysAgo = new Date(Date.now() - 7 * 86_400_000).toISOString();

  const buildMessage = async (userId: string): Promise<string | null> => {
    if (type === 'reminder') {
      const [w, m, k] = await Promise.all([
        supabase.from('weight_logs').select('id', { count: 'exact', head: true }).eq('user_id', userId).gte('measured_at', todayStart).lte('measured_at', todayEnd),
        supabase.from('meals').select('id', { count: 'exact', head: true }).eq('user_id', userId).gte('eaten_at', todayStart).lte('eaten_at', todayEnd),
        supabase.from('workouts').select('id', { count: 'exact', head: true }).eq('user_id', userId).gte('performed_at', todayStart).lte('performed_at', todayEnd),
      ]);
      const missing: string[] = [];
      if ((w.count ?? 0) === 0) missing.push('⚖️ 体重');
      if ((m.count ?? 0) === 0) missing.push('🍱 食事');
      if ((k.count ?? 0) === 0) missing.push('🏋️ 筋トレ');
      if (missing.length === 0) return null;
      return (
        '🌙 21時のリマインドです。本日まだ記録されていない項目があります。\n' +
        missing.map((x) => `・${x}`).join('\n') +
        '\n寝る前に記録しておきましょう！'
      );
    }

    if (type === 'no-input') {
      const [w, m, k] = await Promise.all([
        supabase.from('weight_logs').select('id', { count: 'exact', head: true }).eq('user_id', userId).gte('measured_at', threeDaysAgo),
        supabase.from('meals').select('id', { count: 'exact', head: true }).eq('user_id', userId).gte('eaten_at', threeDaysAgo),
        supabase.from('workouts').select('id', { count: 'exact', head: true }).eq('user_id', userId).gte('performed_at', threeDaysAgo),
      ]);
      const total = (w.count ?? 0) + (m.count ?? 0) + (k.count ?? 0);
      if (total > 0) return null;
      return '⏰ 3日間記録がありません。少しずつでも続けることが大切です。今日から再開しましょう！';
    }

    // stalled
    const { data: weights } = await supabase
      .from('weight_logs')
      .select('weight_kg, measured_at')
      .eq('user_id', userId)
      .gte('measured_at', sevenDaysAgo)
      .order('measured_at', { ascending: true });
    if (!weights || weights.length < 2) return null;
    const change = Number(weights[weights.length - 1].weight_kg) - Number(weights[0].weight_kg);
    if (Math.abs(change) >= 0.2) return null;
    return '📉 ここ1週間、体重が停滞気味です。食事内容やトレーニング強度を一緒に見直してみましょう！';
  };

  const results = await Promise.allSettled(
    targets.map(async (u) => {
      const message = await buildMessage(u.id);
      if (!message) return { id: u.id, sent: false };
      await pushTextMessage(u.line_user_id!.trim(), message);
      await supabase.from('notifications').insert({
        user_id: u.id,
        channel: 'line',
        message,
        sent_at: new Date().toISOString(),
      });
      return { id: u.id, sent: true };
    })
  );

  const fulfilled = results.filter(
    (r): r is PromiseFulfilledResult<{ id: string; sent: boolean }> => r.status === 'fulfilled'
  );
  const sent = fulfilled.filter((r) => r.value.sent).length;
  const skipped = fulfilled.filter((r) => !r.value.sent).length;
  const errors = results
    .filter((r): r is PromiseRejectedResult => r.status === 'rejected')
    .map((r) => String(r.reason?.message ?? r.reason));

  return NextResponse.json({
    type,
    sent,
    skipped,
    failed: errors.length,
    eligible: targets.length,
    errors: errors.length > 0 ? errors : undefined,
  });
}
