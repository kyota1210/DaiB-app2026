-- post_visibility: 投稿の公開範囲を3段階に拡張する
-- 'public'   : 公開（スレッド画面に表示される）
-- 'friends'  : スレッド非公開（スレッドには出ないがフレンドは閲覧可）
-- 'private'  : 完全非公開（自分の投稿一覧にのみ表示）

-- 1. visibility 列を追加
alter table public.posts
  add column if not exists visibility text not null default 'public'
    check (visibility in ('public', 'friends', 'private'));

-- 2. 既存データのバックフィル
--    show_in_timeline=true → 'public'
--    show_in_timeline=false → 'friends'（フレンドには見せていたため）
update public.posts
  set visibility = case
    when show_in_timeline = true then 'public'
    else 'friends'
  end
  where visibility = 'public';

-- 3. RLS: posts_owner_or_friend_read
--    フレンドが閲覧できるのは visibility != 'private' の投稿のみ
drop policy if exists "posts_owner_or_friend_read" on public.posts;
create policy "posts_owner_or_friend_read"
  on public.posts for select
  to authenticated
  using (
    public.invalidation_flag_is_active(invalidation_flag)
    and (
      user_id = auth.uid()
      or (
        public.is_friend(auth.uid(), user_id)
        and visibility != 'private'
      )
    )
  );

-- 4. RLS: post_categories_select_friend_posts
drop policy if exists "post_categories_select_friend_posts" on public.post_categories;
create policy "post_categories_select_friend_posts"
  on public.post_categories for select
  to authenticated
  using (
    exists (
      select 1 from public.posts r
      where r.id = post_id
        and public.invalidation_flag_is_active(r.invalidation_flag)
        and (
          r.user_id = auth.uid()
          or (
            public.is_friend(auth.uid(), r.user_id)
            and r.visibility != 'private'
          )
        )
    )
  );

-- 5. get_timeline_posts RPC: visibility = 'public' のみ表示
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
    select blocked_user_id as blocked_id from public.user_blocks where user_id = auth.uid()
    union
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
    and r.visibility = 'public'
    and r.date_logged::date >= current_date - interval '7 days'
    and r.user_id not in (select blocked_id from blocked_ids)
  order by r.date_logged::date desc, r.id desc;
$$;

grant execute on function public.get_timeline_posts() to authenticated;
