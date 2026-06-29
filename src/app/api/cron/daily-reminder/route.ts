import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { pushTextMessage } from '@/lib/line/client';
import { getJstDayBounds } from '@/lib/datetime';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

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

  const { start, end } = getJstDayBounds();

  const { data: allUsers, error: allError } = await supabase
    .from('users')
    .select('id, line_user_id');
  if (allError) return NextResponse.json({ error: allError.message }, { status: 500 });

  const targets = (allUsers ?? []).filter((u) => u.line_user_id?.trim());

  const results = await Promise.allSettled(
    targets.map(async (u) => {
      const [weightRes, mealRes, workoutRes] = await Promise.all([
        supabase
          .from('weight_logs')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', u.id)
          .gte('measured_at', start)
          .lte('measured_at', end),
        supabase
          .from('meals')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', u.id)
          .gte('eaten_at', start)
          .lte('eaten_at', end),
        supabase
          .from('workouts')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', u.id)
          .gte('performed_at', start)
          .lte('performed_at', end),
      ]);

      const missing: string[] = [];
      if ((weightRes.count ?? 0) === 0) missing.push('⚖️ 体重');
      if ((mealRes.count ?? 0) === 0) missing.push('🍱 食事');
      if ((workoutRes.count ?? 0) === 0) missing.push('🏋️ 筋トレ');

      if (missing.length === 0) {
        return { id: u.id, sent: false };
      }

      const message =
        '🌙 本日まだ記録されていない項目があります。\n' +
        missing.map((m) => `・${m}`).join('\n') +
        '\n寝る前に記録しておきましょう！';

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
    (r): r is PromiseFulfilledResult<{ id: string; sent: boolean }> =>
      r.status === 'fulfilled'
  );
  const sent = fulfilled.filter((r) => r.value.sent).length;
  const skipped = fulfilled.filter((r) => !r.value.sent).length;
  const errors = results
    .filter((r): r is PromiseRejectedResult => r.status === 'rejected')
    .map((r) => String(r.reason?.message ?? r.reason));

  return NextResponse.json({
    sent,
    skipped,
    failed: errors.length,
    eligible: targets.length,
    errors: errors.length > 0 ? errors : undefined,
  });
}
