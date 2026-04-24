-- profiles テーブルに updated_at 列がなければ追加し、自動更新トリガーを設定
-- （init 済みの環境でも追加できるよう IF NOT EXISTS / OR REPLACE を使用）

-- 1. updated_at 列を追加（既存なら無視）
alter table public.profiles
  add column if not exists updated_at timestamptz not null default now();

-- 2. 自動更新用の関数（OR REPLACE で冪等）
create or replace function public.update_updated_at_column()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- 3. 既存トリガーを削除して再作成
drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
before update on public.profiles
for each row execute procedure public.update_updated_at_column();

-- 4. 既存行の updated_at が null の場合は現在時刻で埋める
update public.profiles
set updated_at = coalesce(updated_at, created_at, now())
where updated_at is null;
