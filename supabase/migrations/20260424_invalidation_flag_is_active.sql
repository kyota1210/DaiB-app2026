-- invalidation_flag が boolean でも smallint / integer (0/1) でも比較できるようにする
-- （= false だと smallint 列で operator does not exist になる）
-- 20260425_get_timeline_posts / 20260426_follows_table より先に適用されること

create or replace function public.invalidation_flag_is_active(flag boolean)
returns boolean
language sql
immutable
parallel safe
as $$
  select coalesce(flag, false) = false;
$$;

create or replace function public.invalidation_flag_is_active(flag smallint)
returns boolean
language sql
immutable
parallel safe
as $$
  select coalesce(flag, 0::smallint) = 0::smallint;
$$;

create or replace function public.invalidation_flag_is_active(flag integer)
returns boolean
language sql
immutable
parallel safe
as $$
  select coalesce(flag, 0) = 0;
$$;
