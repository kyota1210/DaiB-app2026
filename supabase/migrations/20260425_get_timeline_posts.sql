-- Thread 用 RPC。クライアントは supabase.rpc('get_timeline_posts') を呼ぶ。
-- 未適用のプロジェクト向けに create or replace で置く。

alter table public.profiles
  add column if not exists avatar_url text;

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

drop function if exists public.get_timeline_records();

create or replace function public.get_timeline_posts()
returns table (
  id bigint,
  author_id uuid,
  author_name text,
  author_avatar_url text,
  title text,
  description text,
  date_logged date,
  image_url text,
  my_reaction text
)
language sql
stable
security invoker
as $$
  with my_friends as (
    select f.following_id as friend_id
    from public.follows f
    join public.follows f2
      on f2.follower_id = f.following_id
     and f2.following_id = f.follower_id
     and public.invalidation_flag_is_active(f2.invalidation_flag)
    where f.follower_id = auth.uid()
      and public.invalidation_flag_is_active(f.invalidation_flag)
  )
  select
    r.id,
    r.user_id as author_id,
    p.user_name as author_name,
    p.avatar_url as author_avatar_url,
    r.title,
    r.description,
    r.date_logged::date,
    r.image_url,
    react.emoji as my_reaction
  from public.posts r
  join my_friends mf on mf.friend_id = r.user_id
  join public.profiles p on p.id = r.user_id
  left join public.reactions react
    on react.post_id = r.id
   and react.user_id = auth.uid()
  where public.invalidation_flag_is_active(r.invalidation_flag)
    and r.show_in_timeline = true
    and r.date_logged::date >= current_date - interval '7 days'
  order by r.date_logged::date desc, r.id desc;
$$;

grant execute on function public.get_timeline_posts() to authenticated;
