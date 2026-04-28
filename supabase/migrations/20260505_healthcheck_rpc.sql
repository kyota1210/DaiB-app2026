-- Healthcheck RPC for external uptime monitoring (Better Stack Heartbeats etc.)
-- 認証不要で叩ける軽量 RPC。anon でも実行できるようにする。

create or replace function public.healthcheck()
returns text
language sql
stable
as $$ select 'ok'::text $$;

revoke all on function public.healthcheck() from public;
grant execute on function public.healthcheck() to anon, authenticated;

comment on function public.healthcheck() is
    'Lightweight uptime probe used by external monitors (Better Stack, etc.). Always returns ''ok''.';
