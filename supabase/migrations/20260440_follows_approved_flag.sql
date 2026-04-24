-- follows テーブルに approved フラグを追加
-- false: 申請中（相手の承認待ち）
-- true: 承認済み（相手が承認した）

-- 1. approved 列を追加（既存は true = 承認済みとして扱う）
alter table public.follows
  add column if not exists approved boolean not null default false;

-- 2. 既存のフォロー関係は承認済みとして扱う
update public.follows
set approved = true
where approved = false and invalidation_flag = 0;

-- 3. is_friend 関数を更新（両方向が approved = true の場合のみフレンド）
create or replace function public.is_friend(user_a uuid, user_b uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1 from public.follows f1
    join public.follows f2
      on f1.follower_id = f2.following_id
     and f1.following_id = f2.follower_id
    where f1.follower_id = user_a
      and f1.following_id = user_b
      and f1.invalidation_flag = 0
      and f2.invalidation_flag = 0
      and f1.approved = true
      and f2.approved = true
  );
$$;

-- 4. get_timeline_posts を更新（approved = true のフレンドのみ）
drop function if exists public.get_timeline_posts();

create or replace function public.get_timeline_posts()
returns table (
  id bigint,
  user_id uuid,
  title text,
  description text,
  date_logged date,
  image_url text,
  my_reaction text,
  author_name text,
  author_avatar_url text,
  author_profile_updated_at timestamptz
)
language sql
stable
security definer
as $$
  with my_friends as (
    select f1.following_id as friend_id
    from public.follows f1
    join public.follows f2
      on f1.follower_id = f2.following_id
     and f1.following_id = f2.follower_id
    where f1.follower_id = auth.uid()
      and f1.invalidation_flag = 0
      and f2.invalidation_flag = 0
      and f1.approved = true
      and f2.approved = true
  )
  select
    r.id,
    r.user_id,
    r.title,
    r.description,
    r.date_logged::date,
    r.image_url,
    react.emoji as my_reaction,
    p.user_name as author_name,
    p.avatar_url as author_avatar_url,
    p.updated_at as author_profile_updated_at
  from public.posts r
  join my_friends mf on mf.friend_id = r.user_id
  join public.profiles p on p.id = r.user_id
  left join public.reactions react
    on react.post_id = r.id
   and react.user_id = auth.uid()
  where r.invalidation_flag = 0
    and r.show_in_timeline = true
    and r.date_logged::date >= current_date - interval '7 days'
  order by r.date_logged::date desc, r.id desc;
$$;
