-- category_entities: authenticated / service_role にテーブル権限（20260432 適用済み環境向け）
do $$
begin
  if to_regclass('public.category_entities') is not null then
    execute 'grant select, insert, update, delete on table public.category_entities to authenticated';
    execute 'grant select, insert, update, delete on table public.category_entities to service_role';
  end if;
end $$;
