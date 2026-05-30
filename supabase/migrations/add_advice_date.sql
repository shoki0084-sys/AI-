-- 既存プロジェクト用: Supabase SQL Editor で実行
alter table public.advices add column if not exists advice_date date;

create unique index if not exists advices_user_advice_date_key
  on public.advices (user_id, advice_date);
