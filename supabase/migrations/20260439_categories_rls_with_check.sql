-- categories テーブルの RLS ポリシーを修正
-- INSERT には with check 句が必要

drop policy if exists "categories_owner_all" on public.categories;

create policy "categories_owner_all"
  on public.categories for all
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
