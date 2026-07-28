import { NextResponse } from 'next/server';
import { requireTrainer } from '@/lib/auth/admin';
import { getJstDayBoundsFromString, getJstTodayString } from '@/lib/datetime';
import type { TrainerMemoInput } from '@/types/trainer-memo';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function loadClient(
  clientId: string,
  trainerId: string,
  admin: NonNullable<Awaited<ReturnType<typeof requireTrainer>>['admin']>
) {
  const { data } = await admin
    .from('clients')
    .select('id, user_id')
    .eq('id', clientId)
    .eq('trainer_id', trainerId)
    .maybeSingle();
  return data;
}

function resolveMemoDate(raw?: string | null) {
  const day = raw?.trim() || getJstTodayString();
  getJstDayBoundsFromString(day);
  return day;
}

/** 顧客メモを時系列（新しい順）で返す */
export async function GET(
  _req: Request,
  { params }: { params: { clientId: string } }
) {
  const { error, admin, user } = await requireTrainer();
  if (error) return error;

  const client = await loadClient(params.clientId, user!.id, admin!);
  if (!client) return NextResponse.json({ error: '顧客が見つかりません。' }, { status: 404 });

  const { data, error: dbError } = await admin!
    .from('trainer_memos')
    .select('id, trainer_id, client_id, user_id, memo_date, content, created_at')
    .eq('client_id', params.clientId)
    .eq('trainer_id', user!.id)
    .order('memo_date', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(100);

  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 });
  return NextResponse.json({ memos: data ?? [] });
}

/** 指導メモを日付付きで保存する */
export async function POST(
  req: Request,
  { params }: { params: { clientId: string } }
) {
  const { error, admin, user } = await requireTrainer();
  if (error) return error;

  const client = await loadClient(params.clientId, user!.id, admin!);
  if (!client) return NextResponse.json({ error: '顧客が見つかりません。' }, { status: 404 });

  const body = (await req.json()) as TrainerMemoInput;
  let memoDate: string;
  try {
    memoDate = resolveMemoDate(body.memo_date);
  } catch {
    return NextResponse.json({ error: 'invalid date' }, { status: 400 });
  }

  const content = body.content?.trim() ?? '';
  if (!content) {
    return NextResponse.json({ error: 'メモ内容を入力してください' }, { status: 400 });
  }

  const { data, error: dbError } = await admin!
    .from('trainer_memos')
    .insert({
      trainer_id: user!.id,
      client_id: client.id,
      user_id: client.user_id,
      memo_date: memoDate,
      content,
    })
    .select('id, trainer_id, client_id, user_id, memo_date, content, created_at')
    .single();

  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 });
  return NextResponse.json({ memo: data }, { status: 201 });
}
