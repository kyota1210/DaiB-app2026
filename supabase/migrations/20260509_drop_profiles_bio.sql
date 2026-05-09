-- アプリから自己紹介（bio）を廃止したため、profiles.bio を削除する。
-- ensure_my_profile は先行して差し替え（DROP COLUMN 後も returns public.profiles が正しい行型を指す）。

create or replace function public.ensure_my_profile()
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  result public.profiles;
  uname text;
begin
  select * into result from public.profiles where id = auth.uid();
  if found then
    return result;
  end if;

  select coalesce(
    nullif(trim(both from (raw_user_meta_data->>'user_name')), ''),
    nullif(trim(both from split_part(coalesce(email, ''), '@', 1)), ''),
    'user'
  )
  into uname
  from auth.users
  where id = auth.uid();

  if uname is null or length(trim(both from uname)) = 0 then
    uname := 'user';
  end if;
  uname := left(uname, 25);

  insert into public.profiles (id, user_name)
  values (auth.uid(), uname)
  on conflict (id) do nothing;

  select * into result from public.profiles where id = auth.uid();
  if not found then
    raise exception 'ensure_my_profile: could not read profile after insert';
  end if;
  return result;
end;
$$;

revoke all on function public.ensure_my_profile() from public;
grant execute on function public.ensure_my_profile() to authenticated;

alter table public.profiles drop column if exists bio;
