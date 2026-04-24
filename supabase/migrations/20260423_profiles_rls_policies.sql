-- profiles: 初回登録時の INSERT が RLS で弾かれる環境向け（INSERT ポリシー欠落・定義ずれの修復）
-- 20260407_init_supabase_schema.sql と同じ内容に揃える

alter table public.profiles enable row level security;

drop policy if exists "profiles_select_all_authenticated" on public.profiles;
drop policy if exists "profiles_update_own" on public.profiles;
drop policy if exists "profiles_insert_own" on public.profiles;

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
