create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  user_name text not null check (char_length(user_name) <= 25),
  bio text,
  avatar_url text,
  default_view_mode text not null default 'grid',
  default_sort_order text not null default 'date_logged',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.categories (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(name) <= 25),
  sort_order integer not null default 0,
  invalidation_flag boolean not null default false,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists categories_user_name_unique_active
  on public.categories(user_id, lower(name))
  where invalidation_flag = false;

create table if not exists public.posts (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null default '',
  description text not null default '',
  date_logged date not null,
  image_url text,
  show_in_timeline boolean not null default true,
  invalidation_flag boolean not null default false,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists posts_user_date_idx
  on public.posts(user_id, date_logged desc)
  where invalidation_flag = false;

create table if not exists public.post_categories (
  post_id bigint not null references public.posts(id) on delete cascade,
  category_id bigint not null references public.categories(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, category_id)
);

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
  where invalidation_flag = false;

create table if not exists public.reactions (
  post_id bigint not null references public.posts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  emoji text not null check (emoji in ('❤️', '👍', '🌸', '🎉', '✨')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

create or replace function public.update_updated_at_column()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
before update on public.profiles
for each row execute procedure public.update_updated_at_column();

drop trigger if exists categories_set_updated_at on public.categories;
create trigger categories_set_updated_at
before update on public.categories
for each row execute procedure public.update_updated_at_column();

drop trigger if exists posts_set_updated_at on public.posts;
create trigger posts_set_updated_at
before update on public.posts
for each row execute procedure public.update_updated_at_column();

drop trigger if exists follows_set_updated_at on public.follows;
create trigger follows_set_updated_at
before update on public.follows
for each row execute procedure public.update_updated_at_column();

drop trigger if exists reactions_set_updated_at on public.reactions;
create trigger reactions_set_updated_at
before update on public.reactions
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
     and f1.invalidation_flag = false
     and f2.follower_id = user_b
     and f2.following_id = user_a
     and f2.invalidation_flag = false
  );
$$;

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
     and f2.invalidation_flag = false
    where f.follower_id = auth.uid()
      and f.invalidation_flag = false
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
  where r.invalidation_flag = false
    and r.show_in_timeline = true
    and r.date_logged::date >= current_date - interval '7 days'
  order by r.date_logged::date desc, r.id desc;
$$;

alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.posts enable row level security;
alter table public.post_categories enable row level security;
alter table public.follows enable row level security;
alter table public.reactions enable row level security;

create policy "profiles_select_all_authenticated"
  on public.profiles for select
  to authenticated
  using (true);

create policy "profiles_update_own"
  on public.profiles for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

create policy "profiles_insert_own"
  on public.profiles for insert
  to authenticated
  with check (id = auth.uid());

create policy "categories_owner_all"
  on public.categories for all
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "posts_owner_insert"
  on public.posts for insert
  to authenticated
  with check (user_id = auth.uid());

create policy "posts_owner_update_delete"
  on public.posts for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "posts_owner_delete"
  on public.posts for delete
  to authenticated
  using (user_id = auth.uid());

create policy "posts_owner_or_friend_read"
  on public.posts for select
  to authenticated
  using (
    invalidation_flag = false
    and (
      user_id = auth.uid()
      or public.is_friend(auth.uid(), user_id)
    )
  );

create policy "post_categories_select_friend_posts"
  on public.post_categories for select
  to authenticated
  using (
    exists (
      select 1 from public.posts r
      where r.id = post_id
        and r.invalidation_flag = false
        and (r.user_id = auth.uid() or public.is_friend(auth.uid(), r.user_id))
    )
  );

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

create policy "follows_read_related"
  on public.follows for select
  to authenticated
  using (follower_id = auth.uid() or following_id = auth.uid());

create policy "follows_write_self"
  on public.follows for all
  to authenticated
  using (follower_id = auth.uid())
  with check (follower_id = auth.uid());

create policy "reactions_read_friend_visible_posts"
  on public.reactions for select
  to authenticated
  using (
    exists (
      select 1 from public.posts r
      where r.id = post_id
        and r.invalidation_flag = false
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
        and r.invalidation_flag = false
        and public.is_friend(auth.uid(), r.user_id)
    )
  );

create policy "reactions_update_own"
  on public.reactions for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

grant execute on function public.get_timeline_posts() to authenticated;
