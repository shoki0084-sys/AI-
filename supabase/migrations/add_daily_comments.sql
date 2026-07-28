-- 既存プロジェクト用: Supabase SQL Editor で実行
-- 日付ごとの顧客コメント（体調・睡眠・空腹・自由コメント）

create table if not exists public.daily_comments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  comment_date date not null,
  condition text,
  sleep_hours numeric,
  hunger text,
  free_comment text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, comment_date)
);

alter table public.daily_comments enable row level security;

drop policy if exists "daily_comments_all_own" on public.daily_comments;
create policy "daily_comments_all_own" on public.daily_comments
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
