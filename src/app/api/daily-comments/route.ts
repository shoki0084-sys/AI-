import { NextResponse } from 'next/server';
import { getAuthContext } from '@/lib/api/auth';
import { getJstDayBoundsFromString, getJstTodayString } from '@/lib/datetime';
import type { DailyCommentInput } from '@/types/daily-comment';

function resolveCommentDate(raw?: string | null) {
  const day = raw?.trim() || getJstTodayString();
  getJstDayBoundsFromString(day);
  return day;
}

export async function GET(req: Request) {
  const { error, user, supabase } = await getAuthContext();
  if (error) return error;

  const dateParam = new URL(req.url).searchParams.get('date');

  if (dateParam) {
    let commentDate: string;
    try {
      commentDate = resolveCommentDate(dateParam);
    } catch {
      return NextResponse.json({ error: 'invalid date' }, { status: 400 });
    }

    const { data, error: dbError } = await supabase!
      .from('daily_comments')
      .select('*')
      .eq('user_id', user!.id)
      .eq('comment_date', commentDate)
      .maybeSingle();

    if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 });
    return NextResponse.json({ comment: data });
  }

  const { data, error: dbError } = await supabase!
    .from('daily_comments')
    .select('*')
    .eq('user_id', user!.id)
    .order('comment_date', { ascending: false })
    .limit(30);

  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 });
  return NextResponse.json({ comments: data });
}

export async function POST(req: Request) {
  const { error, user, supabase } = await getAuthContext();
  if (error) return error;

  const body = (await req.json()) as DailyCommentInput;

  let commentDate: string;
  try {
    commentDate = resolveCommentDate(body.comment_date);
  } catch {
    return NextResponse.json({ error: 'invalid date' }, { status: 400 });
  }

  const condition = body.condition?.trim() || null;
  const hunger = body.hunger?.trim() || null;
  const freeComment = body.free_comment?.trim() || null;
  const sleepHours =
    body.sleep_hours != null && String(body.sleep_hours).trim() !== ''
      ? Number(body.sleep_hours)
      : null;

  if (sleepHours != null && (Number.isNaN(sleepHours) || sleepHours < 0 || sleepHours > 24)) {
    return NextResponse.json({ error: 'sleep_hours must be between 0 and 24' }, { status: 400 });
  }

  if (!condition && sleepHours == null && !hunger && !freeComment) {
    return NextResponse.json(
      { error: '体調・睡眠時間・空腹感・自由コメントのいずれかを入力してください' },
      { status: 400 }
    );
  }

  const { data, error: dbError } = await supabase!
    .from('daily_comments')
    .upsert(
      {
        user_id: user!.id,
        comment_date: commentDate,
        condition,
        sleep_hours: sleepHours,
        hunger,
        free_comment: freeComment,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,comment_date' }
    )
    .select()
    .single();

  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 });
  return NextResponse.json({ comment: data }, { status: 201 });
}
