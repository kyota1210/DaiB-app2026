-- show_in_timeline を boolean に揃える（MySQL 由来の smallint/integer 0/1 のままだと = true 比較で不整合になりうる）

do $$
begin
  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'posts'
      and column_name = 'show_in_timeline'
  ) then
    alter table public.posts
      add column show_in_timeline boolean not null default true;
  elsif exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'posts'
      and column_name = 'show_in_timeline'
      and udt_name <> 'bool'
  ) then
    alter table public.posts alter column show_in_timeline drop default;
    alter table public.posts
      alter column show_in_timeline type boolean
      using (
        case lower(trim(both from coalesce(show_in_timeline::text, 'true')))
          when '0' then false
          when 'false' then false
          when 'f' then false
          when 'no' then false
          else true
        end
      );
    alter table public.posts alter column show_in_timeline set default true;
    alter table public.posts alter column show_in_timeline set not null;
  end if;
end $$;
