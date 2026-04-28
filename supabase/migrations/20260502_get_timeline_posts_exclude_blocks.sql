-- get_timeline_posts: ブロック関係（双方向）を除外する形に改修。
-- Apple App Store Review Guideline 1.2 対応の一部。
-- 1) 自分がブロックしたユーザーの投稿はタイムラインに出さない
-- 2) 自分をブロックしたユーザーの投稿もタイムラインに出さない（相互不可視）

drop function if exists public.get_timeline_posts();

create or replace function public.get_timeline_posts()
returns table (
  id bigint,
  author_id uuid,
  author_name text,
  author_avatar_url text,
  author_profile_updated_at timestamptz,
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
  ),
  blocked_ids as (
    -- 自分がブロックした相手
    select blocked_user_id as blocked_id from public.user_blocks where user_id = auth.uid()
    union
    -- 自分をブロックした相手
    select user_id as blocked_id from public.user_blocks where blocked_user_id = auth.uid()
  )
  select
    r.id,
    r.user_id as author_id,
    p.user_name as author_name,
    p.avatar_url as author_avatar_url,
    p.updated_at as author_profile_updated_at,
    r.title,
    r.description,
    r.date_logged::date,
    r.image_url,
    react.emoji as my_reaction
  from public.posts r
  join my_friends mf on mf.friend_id = r.user_id
  join public.profiles p on p.id = r.user_id
  left join public.reactions react
    on react.post_id = r.id and react.user_id = auth.uid()
  where public.invalidation_flag_is_active(r.invalidation_flag)
    and r.show_in_timeline = true
    and r.date_logged::date >= current_date - interval '7 days'
    and r.user_id not in (select blocked_id from blocked_ids)
  order by r.date_logged::date desc, r.id desc;
$$;

grant execute on function public.get_timeline_posts() to authenticated;
