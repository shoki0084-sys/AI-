-- AIコーチ分析結果の保存テーブル
-- Supabase SQL Editor で実行してください

create table if not exists public.coach_analyses (
  id uuid primary key default gen_random_uuid(),
  trainer_id uuid not null references public.users (id) on delete cascade,
  client_id uuid not null references public.clients (id) on delete cascade,
  user_id uuid not null references public.users (id) on delete cascade,
  avg_weight numeric,
  avg_calories numeric,
  avg_protein numeric,
  avg_fat numeric,
  avg_carbs numeric,
  workout_days integer not null default 0,
  analysis text not null,
  created_at timestamptz not null default now()
);

alter table public.coach_analyses enable row level security;

create policy "coach_analyses_owner" on public.coach_analyses
  for all using (auth.uid() = trainer_id) with check (auth.uid() = trainer_id);
