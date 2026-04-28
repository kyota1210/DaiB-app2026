-- 問い合わせフォーム用テーブル
-- 認証ユーザー本人のみ insert 可能（user_id を auth.uid() に強制）
-- 一覧/参照は service_role のみ（管理側で別途参照）

create table if not exists public.contacts (
    id uuid primary key default gen_random_uuid(),
    user_id uuid references auth.users(id) on delete set null,
    name text not null check (length(trim(name)) between 1 and 100),
    email text not null check (length(trim(email)) between 3 and 320),
    subject text not null check (length(trim(subject)) between 1 and 200),
    message text not null check (length(trim(message)) between 1 and 4000),
    status text not null default 'new' check (status in ('new','triaged','responded','closed')),
    created_at timestamptz not null default now(),
    handled_at timestamptz
);

create index if not exists contacts_user_id_idx on public.contacts (user_id);
create index if not exists contacts_status_created_at_idx on public.contacts (status, created_at desc);

alter table public.contacts enable row level security;

drop policy if exists "contacts_insert_own" on public.contacts;
create policy "contacts_insert_own" on public.contacts
    for insert
    to authenticated
    with check (auth.uid() = user_id);

drop policy if exists "contacts_service_role_all" on public.contacts;
create policy "contacts_service_role_all" on public.contacts
    for all
    to service_role
    using (true)
    with check (true);
