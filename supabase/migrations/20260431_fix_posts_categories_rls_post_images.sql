-- Posts SELECT, optional post_categories policies, daib-dev-post-images storage RLS.
-- invalidation_flag: boolean or smallint via invalidation_flag_is_active().

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

create or replace function public.is_friend(user_a uuid, user_b uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.follows f1
    join public.follows f2
      on f1.follower_id = user_a
     and f1.following_id = user_b
     and public.invalidation_flag_is_active(f1.invalidation_flag)
     and f2.follower_id = user_b
     and f2.following_id = user_a
     and public.invalidation_flag_is_active(f2.invalidation_flag)
  );
$$;

create or replace function public.user_owns_post(p_post_id bigint)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.posts p
    where p.id = p_post_id
      and p.user_id = auth.uid()
  );
$$;

revoke all on function public.user_owns_post(bigint) from public;
grant execute on function public.user_owns_post(bigint) to authenticated;

create or replace function public.can_view_post_for_post_categories(p_post_id bigint)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.posts r
    where r.id = p_post_id
      and public.invalidation_flag_is_active(r.invalidation_flag)
      and (
        r.user_id = auth.uid()
        or public.is_friend(auth.uid(), r.user_id)
      )
  );
$$;

revoke all on function public.can_view_post_for_post_categories(bigint) from public;
grant execute on function public.can_view_post_for_post_categories(bigint) to authenticated;

-- posts: owner/friend read
drop policy if exists "posts_owner_or_friend_read" on public.posts;

create policy "posts_owner_or_friend_read"
  on public.posts for select
  to authenticated
  using (
    public.invalidation_flag_is_active(invalidation_flag)
    and (
      user_id = auth.uid()
      or public.is_friend(auth.uid(), user_id)
    )
  );

-- post_categories: テーブルがあるプロジェクトのみ
do $$
begin
  if to_regclass('public.post_categories') is not null then
    execute 'drop policy if exists "post_categories_owner_write" on public.post_categories';
    execute $p$
      create policy "post_categories_owner_write"
        on public.post_categories for all
        to authenticated
        using (public.user_owns_post(post_id))
        with check (public.user_owns_post(post_id))
    $p$;
    execute 'drop policy if exists "post_categories_select_friend_posts" on public.post_categories';
    execute $p$
      create policy "post_categories_select_friend_posts"
        on public.post_categories for select
        to authenticated
        using (public.can_view_post_for_post_categories(post_id))
    $p$;
  end if;
end $$;

-- Storage: daib-dev-post-images
drop policy if exists "daib_post_images_public_read" on storage.objects;
drop policy if exists "daib_post_images_owner_write" on storage.objects;
drop policy if exists "daib_post_images_owner_update" on storage.objects;
drop policy if exists "daib_post_images_owner_delete" on storage.objects;

create policy "daib_post_images_public_read"
  on storage.objects for select
  to public
  using (bucket_id = 'daib-dev-post-images');

create policy "daib_post_images_owner_write"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'daib-dev-post-images'
    and split_part(name, '/', 1) = (select auth.uid()::text)
  );

create policy "daib_post_images_owner_update"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'daib-dev-post-images'
    and split_part(name, '/', 1) = (select auth.uid()::text)
  )
  with check (
    bucket_id = 'daib-dev-post-images'
    and split_part(name, '/', 1) = (select auth.uid()::text)
  );

create policy "daib_post_images_owner_delete"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'daib-dev-post-images'
    and split_part(name, '/', 1) = (select auth.uid()::text)
  );
