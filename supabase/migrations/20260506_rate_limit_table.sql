-- Generic rate limit counter table for Edge Functions.
-- 1 行 = (キー, バケット時刻) の組み合わせの回数。
-- service_role からのみ書き換え可能（RLS 厳格）。

create table if not exists public.rate_limit_buckets (
    key text not null,
    bucket_started_at timestamptz not null,
    count integer not null default 0,
    updated_at timestamptz not null default now(),
    primary key (key, bucket_started_at)
);

create index if not exists rate_limit_buckets_updated_at_idx
    on public.rate_limit_buckets (updated_at);

alter table public.rate_limit_buckets enable row level security;

drop policy if exists "rate_limit_service_role_all" on public.rate_limit_buckets;
create policy "rate_limit_service_role_all"
    on public.rate_limit_buckets
    for all
    to service_role
    using (true)
    with check (true);

-- Atomic increment + check. window_seconds 内の合計が limit を超えたら超過とみなす。
-- 戻り値: (allowed boolean, current_count integer)
create or replace function public.rate_limit_check(
    p_key text,
    p_window_seconds integer,
    p_limit integer
)
returns table (allowed boolean, current_count integer)
language plpgsql
security definer
set search_path = public
as $$
declare
    v_bucket_start timestamptz;
    v_count integer;
begin
    -- バケットの開始時刻を window_seconds 単位で丸める
    v_bucket_start := to_timestamp(
        floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds
    );

    insert into public.rate_limit_buckets as rb (key, bucket_started_at, count, updated_at)
        values (p_key, v_bucket_start, 1, now())
        on conflict (key, bucket_started_at)
        do update set count = rb.count + 1, updated_at = now()
        returning count into v_count;

    return query select (v_count <= p_limit) as allowed, v_count as current_count;
end;
$$;

revoke all on function public.rate_limit_check(text, integer, integer) from public;
grant execute on function public.rate_limit_check(text, integer, integer) to service_role;

-- 古いバケットの掃除（実行は手動 or cron）
create or replace function public.rate_limit_cleanup(p_keep_seconds integer default 86400)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
    v_deleted integer;
begin
    delete from public.rate_limit_buckets
    where updated_at < now() - make_interval(secs => p_keep_seconds);
    get diagnostics v_deleted = row_count;
    return v_deleted;
end;
$$;

revoke all on function public.rate_limit_cleanup(integer) from public;
grant execute on function public.rate_limit_cleanup(integer) to service_role;

comment on table public.rate_limit_buckets is
    'Edge Functions 用の汎用レート制限カウンター。 service_role からのみ書き換え可能。';
