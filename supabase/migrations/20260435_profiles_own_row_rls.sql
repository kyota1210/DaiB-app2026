-- profiles: ログイン済みユーザーは id = auth.uid() の行のみ INSERT / UPDATE 可能
-- （20260423 と同一定義。未適用環境やポリシー欠落の再修復用）

alter table public.profiles enable row level security;

grant select, insert, update, delete on table public.profiles to authenticated;

drop policy if exists "profiles_select_all_authenticated" on public.profiles;
drop policy if exists "profiles_update_own" on public.profiles;
drop policy if exists "profiles_insert_own" on public.profiles;

-- タイムライン等で他ユーザーの表示名・アバター参照に必要
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
