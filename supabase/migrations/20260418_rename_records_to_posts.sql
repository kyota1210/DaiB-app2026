-- 既存DB（records / record_categories / reactions.record_id）から posts 構成へ移行する
-- 新規は 20260407_init_supabase_schema.sql の posts 版のみで足ります。

-- Storage: バケット records → posts
insert into storage.buckets (id, name, public)
values ('posts', 'posts', true)
on conflict (id) do nothing;

-- storage.objects / storage.buckets への直接 DML は Supabase がトリガーで禁止しているため
-- DO ブロックで例外を握りつぶす（対象行が既に無い場合も同様）。
do $$
begin
  update storage.objects set bucket_id = 'posts' where bucket_id = 'records';
exception when others then
  null;
end $$;

drop policy if exists "records_public_read" on storage.objects;
drop policy if exists "records_owner_write" on storage.objects;
drop policy if exists "records_owner_update" on storage.objects;
drop policy if exists "records_owner_delete" on storage.objects;

drop policy if exists "posts_public_read" on storage.objects;
drop policy if exists "posts_owner_write" on storage.objects;
drop policy if exists "posts_owner_update" on storage.objects;
drop policy if exists "posts_owner_delete" on storage.objects;

create policy "posts_public_read"
  on storage.objects for select
  to public
  using (bucket_id = 'posts');

create policy "posts_owner_write"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'posts'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "posts_owner_update"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'posts'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'posts'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "posts_owner_delete"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'posts'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- storage.buckets の直接 DELETE は禁止されているため DO ブロックで安全に試みる
do $$
begin
  delete from storage.buckets where id = 'records';
exception when others then
  null;
end $$;

-- RLS: 再作成のため一旦削除（旧テーブルが存在しない場合は握りつぶす）
do $$
begin
  drop policy if exists "record_categories_select_friend_records" on public.record_categories;
  drop policy if exists "record_categories_owner_write" on public.record_categories;
exception when undefined_table then null;
end $$;

do $$
begin
  drop policy if exists "reactions_read_friend_visible_records" on public.reactions;
  drop policy if exists "reactions_write_friend_visible_records" on public.reactions;
exception when undefined_table then null;
end $$;

do $$
begin
  drop policy if exists "records_owner_insert" on public.records;
  drop policy if exists "records_owner_update_delete" on public.records;
  drop policy if exists "records_owner_delete" on public.records;
  drop policy if exists "records_owner_or_friend_read" on public.records;
exception when undefined_table then null;
end $$;

alter table if exists public.records rename to posts;
alter index if exists public.records_user_date_idx rename to posts_user_date_idx;

drop trigger if exists records_set_updated_at on public.posts;
drop trigger if exists posts_set_updated_at on public.posts;
create trigger posts_set_updated_at
before update on public.posts
for each row execute procedure public.update_updated_at_column();

alter table if exists public.record_categories rename to post_categories;

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'post_categories' and column_name = 'record_id'
  ) then
    alter table public.post_categories rename column record_id to post_id;
  end if;
end $$;

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'reactions' and column_name = 'record_id'
  ) then
    alter table public.reactions rename column record_id to post_id;
  end if;
end $$;

drop function if exists public.get_timeline_records();
drop function if exists public.get_timeline_posts();

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

drop policy if exists "posts_owner_insert" on public.posts;
create policy "posts_owner_insert"
  on public.posts for insert
  to authenticated
  with check (user_id = auth.uid());

drop policy if exists "posts_owner_update_delete" on public.posts;
create policy "posts_owner_update_delete"
  on public.posts for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "posts_owner_delete" on public.posts;
create policy "posts_owner_delete"
  on public.posts for delete
  to authenticated
  using (user_id = auth.uid());

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

drop policy if exists "post_categories_select_friend_posts" on public.post_categories;
create policy "post_categories_select_friend_posts"
  on public.post_categories for select
  to authenticated
  using (
    exists (
      select 1 from public.posts r
      where r.id = post_id
        and public.invalidation_flag_is_active(r.invalidation_flag)
        and (r.user_id = auth.uid() or public.is_friend(auth.uid(), r.user_id))
    )
  );

drop policy if exists "post_categories_owner_write" on public.post_categories;
create policy "post_categories_owner_write"
  on public.post_categories for all
  to authenticated
  using (
    exists (
      select 1 from public.posts r
      where r.id = post_id
        and r.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.posts r
      where r.id = post_id
        and r.user_id = auth.uid()
    )
  );

drop policy if exists "reactions_read_friend_visible_posts" on public.reactions;
create policy "reactions_read_friend_visible_posts"
  on public.reactions for select
  to authenticated
  using (
    exists (
      select 1 from public.posts r
      where r.id = post_id
        and public.invalidation_flag_is_active(r.invalidation_flag)
        and (r.user_id = auth.uid() or public.is_friend(auth.uid(), r.user_id))
    )
  );

drop policy if exists "reactions_write_friend_visible_posts" on public.reactions;
create policy "reactions_write_friend_visible_posts"
  on public.reactions for insert
  to authenticated
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.posts r
      where r.id = post_id
        and public.invalidation_flag_is_active(r.invalidation_flag)
        and public.is_friend(auth.uid(), r.user_id)
    )
  );
