-- IAP サブスクリプション状態管理テーブル
-- 1 ユーザー = 1 アクティブなサブスクという前提
-- store: 'apple' | 'google'
-- status: Apple App Store Server API の subscription status を流用
--   ('active','expired','in_grace_period','in_billing_retry','revoked','refunded','paused','unknown')
-- ※ Google Play は将来追加時に許可値を増やす
-- expires_at: 次回更新日（または失効日）。広告非表示判定はこれが将来かつ status が active 系か。
-- updated_at: Apple Webhook / レシート検証で更新したタイムスタンプ。

create table if not exists public.subscriptions (
    user_id uuid primary key references auth.users(id) on delete cascade,
    store text not null check (store in ('apple','google')),
    product_id text not null,
    original_transaction_id text not null,
    latest_transaction_id text,
    status text not null check (status in (
        'active','expired','in_grace_period','in_billing_retry',
        'revoked','refunded','paused','unknown'
    )),
    auto_renew boolean,
    expires_at timestamptz,
    last_verified_at timestamptz,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index if not exists subscriptions_status_idx on public.subscriptions (status);
create index if not exists subscriptions_expires_at_idx on public.subscriptions (expires_at);
create index if not exists subscriptions_orig_tx_idx on public.subscriptions (original_transaction_id);

alter table public.subscriptions enable row level security;

-- 本人のみ select 可（広告非表示判定や設定画面のため）
drop policy if exists "subscriptions_select_own" on public.subscriptions;
create policy "subscriptions_select_own" on public.subscriptions
    for select
    to authenticated
    using (auth.uid() = user_id);

-- insert / update / delete はクライアントから不可。Edge Function（service_role）経由のみ。
drop policy if exists "subscriptions_service_role_all" on public.subscriptions;
create policy "subscriptions_service_role_all" on public.subscriptions
    for all
    to service_role
    using (true)
    with check (true);

-- updated_at 自動更新トリガ
create or replace function public.subscriptions_set_updated_at()
returns trigger language plpgsql as $$
begin
    new.updated_at = now();
    return new;
end;
$$;

drop trigger if exists trg_subscriptions_set_updated_at on public.subscriptions;
create trigger trg_subscriptions_set_updated_at
    before update on public.subscriptions
    for each row execute function public.subscriptions_set_updated_at();

-- ヘルパー: 現在のユーザーがプレミアムか判定
create or replace function public.is_current_user_premium()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
    select exists (
        select 1 from public.subscriptions s
        where s.user_id = auth.uid()
          and s.status in ('active','in_grace_period','in_billing_retry')
          and (s.expires_at is null or s.expires_at > now())
    );
$$;

revoke all on function public.is_current_user_premium() from public;
grant execute on function public.is_current_user_premium() to authenticated;
