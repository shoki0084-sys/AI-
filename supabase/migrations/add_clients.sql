-- トレーナー向け顧客管理: clients テーブル追加
-- Supabase SQL Editor で実行してください

create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  trainer_id uuid not null references public.users (id) on delete cascade,
  user_id uuid not null references public.users (id) on delete cascade,
  display_name text,
  created_at timestamptz not null default now(),
  unique (trainer_id, user_id)
);

alter table public.clients enable row level security;

-- トレーナー自身が紐付けた行のみ参照/操作可能
-- （API は service_role 経由で動作するため、本ポリシーは直接アクセス時の最小保護）
create policy "clients_owner" on public.clients
  for all using (auth.uid() = trainer_id) with check (auth.uid() = trainer_id);
