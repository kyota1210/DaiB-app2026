-- public.posts が前提。get_timeline_posts / クライアントの post_id・emoji と整合
-- RLS が is_friend を参照するため、20260426 未適用でも通るよう follows + is_friend を冪等で含める

create or replace function public.update_updated_at_column()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

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

grant usage on schema public to authenticated;

create table if not exists public.follows (
  follower_id uuid not null references auth.users(id) on delete cascade,
  following_id uuid not null references auth.users(id) on delete cascade,
  invalidation_flag boolean not null default false,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (follower_id, following_id),
  check (follower_id <> following_id)
);

create index if not exists follows_following_idx
  on public.follows(following_id)
  where public.invalidation_flag_is_active(invalidation_flag);

drop trigger if exists follows_set_updated_at on public.follows;
create trigger follows_set_updated_at
before update on public.follows
for each row execute procedure public.update_updated_at_column();

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

alter table public.follows enable row level security;

drop policy if exists "follows_read_related" on public.follows;
drop policy if exists "follows_write_self" on public.follows;

create policy "follows_read_related"
  on public.follows for select
  to authenticated
  using (follower_id = auth.uid() or following_id = auth.uid());

create policy "follows_write_self"
  on public.follows for all
  to authenticated
  using (follower_id = auth.uid())
  with check (follower_id = auth.uid());

grant select, insert, update, delete on table public.follows to authenticated;

create table if not exists public.reactions (
  post_id bigint not null references public.posts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  emoji text not null check (emoji in ('❤️', '👍', '🌸', '🎉', '✨')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

drop trigger if exists reactions_set_updated_at on public.reactions;
create trigger reactions_set_updated_at
before update on public.reactions
for each row execute procedure public.update_updated_at_column();

alter table public.reactions enable row level security;

drop policy if exists "reactions_read_friend_visible_posts" on public.reactions;
drop policy if exists "reactions_write_friend_visible_posts" on public.reactions;
drop policy if exists "reactions_update_own" on public.reactions;

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

create policy "reactions_update_own"
  on public.reactions for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

grant select, insert, update, delete on table public.reactions to authenticated;
