-- Supabase SQL Editor で実行してください

create table if not exists public.users (
  id uuid primary key references auth.users (id) on delete cascade,
  line_user_id text,
  target_weight numeric,
  target_calories numeric,
  target_protein numeric,
  target_fat numeric,
  target_carbs numeric,
  created_at timestamptz not null default now()
);

create table if not exists public.meals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  meal_type text not null check (meal_type in ('breakfast', 'lunch', 'dinner', 'snack')),
  food_name text not null,
  calories numeric not null default 0,
  protein numeric not null default 0,
  fat numeric not null default 0,
  carbs numeric not null default 0,
  eaten_at timestamptz not null,
  created_at timestamptz not null default now()
);

create table if not exists public.workouts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  exercise_name text not null,
  weight_kg numeric not null default 0,
  reps integer not null default 0,
  sets integer not null default 0,
  performed_at timestamptz not null,
  note text,
  created_at timestamptz not null default now()
);

create table if not exists public.weight_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  weight_kg numeric not null,
  body_fat numeric,
  measured_at timestamptz not null,
  created_at timestamptz not null default now(),
  unique (user_id, measured_at)
);

create table if not exists public.advices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  prompt text not null,
  response text not null,
  category text not null default 'meal',
  advice_date date,
  created_at timestamptz not null default now(),
  unique (user_id, advice_date)
);

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

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  channel text not null default 'line',
  message text not null,
  sent_at timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id) values (new.id) on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

alter table public.users enable row level security;
alter table public.meals enable row level security;
alter table public.workouts enable row level security;
alter table public.weight_logs enable row level security;
alter table public.advices enable row level security;
alter table public.daily_comments enable row level security;
alter table public.notifications enable row level security;

create policy "users_select_own" on public.users for select using (auth.uid() = id);
create policy "users_update_own" on public.users for update using (auth.uid() = id);
create policy "users_insert_own" on public.users for insert with check (auth.uid() = id);

create policy "meals_all_own" on public.meals for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "workouts_all_own" on public.workouts for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "weight_logs_all_own" on public.weight_logs for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "advices_all_own" on public.advices for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "daily_comments_all_own" on public.daily_comments for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "notifications_select_own" on public.notifications for select using (auth.uid() = user_id);

-- トレーナー向け顧客管理: trainer と既存 users を紐付ける
create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  trainer_id uuid not null references public.users (id) on delete cascade,
  user_id uuid not null references public.users (id) on delete cascade,
  display_name text,
  created_at timestamptz not null default now(),
  unique (trainer_id, user_id)
);

alter table public.clients enable row level security;

create policy "clients_owner" on public.clients
  for all using (auth.uid() = trainer_id) with check (auth.uid() = trainer_id);

-- AIコーチ分析結果の保存
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

-- トレーナー指導メモ
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

create policy "trainer_memos_owner" on public.trainer_memos
  for all using (auth.uid() = trainer_id) with check (auth.uid() = trainer_id);
