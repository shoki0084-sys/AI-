-- 既存プロジェクト用: Supabase SQL Editor で実行
-- トレーナーがクライアントごとに指導メモを残す

create table if not exists public.trainer_memos (
  id uuid primary key default gen_random_uuid(),
  trainer_id uuid not null references public.users (id) on delete cascade,
  client_id uuid not null references public.clients (id) on delete cascade,
  user_id uuid not null references public.users (id) on delete cascade,
  memo_date date not null,
  content text not null,
  created_at timestamptz not null default now()
);

create index if not exists trainer_memos_client_date_idx
  on public.trainer_memos (client_id, memo_date desc, created_at desc);

alter table public.trainer_memos enable row level security;

drop policy if exists "trainer_memos_owner" on public.trainer_memos;
create policy "trainer_memos_owner" on public.trainer_memos
  for all using (auth.uid() = trainer_id) with check (auth.uid() = trainer_id);
