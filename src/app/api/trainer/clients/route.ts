import { NextResponse } from 'next/server';
import { requireTrainer } from '@/lib/auth/admin';
import { getEmailsByUserIds, findUserIdByEmail } from '@/lib/supabase/admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export type ClientStatus = 'good' | 'stalled' | 'attention';

function round1(n: number) {
  return Math.round(n * 10) / 10;
}

/** 直近7日間の体重変化からステータスを判定する */
function judgeStatus(
  weights: { weight_kg: number; measured_at: string }[]
): ClientStatus {
  // 記録が2件未満（推移を判断できない）→ 要対応
  if (weights.length < 2) return 'attention';
  const change = weights[weights.length - 1].weight_kg - weights[0].weight_kg;
  if (change <= -0.2) return 'good'; // 減少傾向 → 順調
  if (change >= 0.5) return 'attention'; // 増加傾向 → 要対応
  return 'stalled'; // ほぼ変化なし → 停滞
}

function calcProgressPct(
  latestWeight: number | null,
  startWeight: number | null,
  targetWeight: number | null
): number | null {
  if (latestWeight == null || startWeight == null || targetWeight == null) return null;
  const start = Number(startWeight);
  const current = Number(latestWeight);
  const target = Number(targetWeight);
  const totalGap = Math.abs(start - target);
  if (totalGap < 0.01) return 100;
  const done = Math.abs(start - current);
  const overshoot =
    (start > target && current <= target) || (start < target && current >= target);
  return overshoot ? 100 : Math.max(0, Math.min(100, round1((done / totalGap) * 100)));
}

/** 担当顧客の一覧を返す */
export async function GET() {
  const { error, admin, user } = await requireTrainer();
  if (error) return error;

  const { data: rows, error: dbError } = await admin!
    .from('clients')
    .select('id, user_id, display_name, created_at')
    .eq('trainer_id', user!.id)
    .order('created_at', { ascending: true });
  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 });

  const userIds = (rows ?? []).map((c) => c.user_id);
  const emailById = await getEmailsByUserIds(admin!, userIds);
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const recentWeightByUser = new Map<string, { weight_kg: number; measured_at: string }[]>();
  const latestWeightByUser = new Map<string, number>();
  const startWeightByUser = new Map<string, number>();
  const targetWeightByUser = new Map<string, number | null>();

  if (userIds.length) {
    const [{ data: weights }, { data: profiles }] = await Promise.all([
      admin!
        .from('weight_logs')
        .select('user_id, weight_kg, measured_at')
        .in('user_id', userIds)
        .order('measured_at', { ascending: true }),
      admin!.from('users').select('id, target_weight').in('id', userIds),
    ]);

    for (const p of profiles ?? []) {
      targetWeightByUser.set(
        p.id,
        p.target_weight != null ? Number(p.target_weight) : null
      );
    }

    for (const w of weights ?? []) {
      const kg = Number(w.weight_kg);
      startWeightByUser.set(w.user_id, kg);
      latestWeightByUser.set(w.user_id, kg);
      if (w.measured_at >= sevenDaysAgo) {
        const list = recentWeightByUser.get(w.user_id) ?? [];
        list.push({ weight_kg: kg, measured_at: w.measured_at });
        recentWeightByUser.set(w.user_id, list);
      }
    }
  }

  const clients = (rows ?? []).map((c) => {
    const currentWeight = latestWeightByUser.get(c.user_id) ?? null;
    const startWeight = startWeightByUser.get(c.user_id) ?? null;
    const targetWeight = targetWeightByUser.get(c.user_id) ?? null;
    return {
      id: c.id,
      user_id: c.user_id,
      display_name: c.display_name ?? null,
      email: emailById.get(c.user_id) ?? null,
      created_at: c.created_at,
      status: judgeStatus(recentWeightByUser.get(c.user_id) ?? []),
      current_weight: currentWeight,
      target_weight: targetWeight,
      progress_pct: calcProgressPct(currentWeight, startWeight, targetWeight),
    };
  });

  return NextResponse.json({ clients });
}

/** 既存ユーザーを顧客として登録する。{ userId, displayName? } または { email, displayName? } */
export async function POST(req: Request) {
  const { error, admin, user } = await requireTrainer();
  if (error) return error;

  const body = (await req.json().catch(() => null)) as
    | { userId?: string; email?: string; displayName?: string }
    | null;
  if (!body || (!body.userId && !body.email)) {
    return NextResponse.json({ error: 'userId または email が必要です。' }, { status: 400 });
  }

  let userId = body.userId;
  if (!userId && body.email) {
    userId = (await findUserIdByEmail(admin!, body.email!)) ?? undefined;
    if (!userId) {
      return NextResponse.json({ error: '該当するユーザーが見つかりません。' }, { status: 404 });
    }
  }

  const { data, error: dbError } = await admin!
    .from('clients')
    .upsert(
      { trainer_id: user!.id, user_id: userId!, display_name: body.displayName ?? null },
      { onConflict: 'trainer_id,user_id' }
    )
    .select('id')
    .single();
  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 });

  return NextResponse.json({ id: data.id });
}
