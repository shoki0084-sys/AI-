-- 既存プロジェクト用: Supabase SQL Editor で実行
alter table public.users add column if not exists target_weight numeric;
