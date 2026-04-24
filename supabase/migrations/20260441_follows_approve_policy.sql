-- follows テーブルの RLS ポリシーを修正
-- 自分宛ての申請（following_id = auth.uid()）も approved を更新できるようにする

drop policy if exists "follows_write_self" on public.follows;

-- 自分が送った申請（follower_id）は全操作可能
create policy "follows_write_as_follower"
  on public.follows for all
  to authenticated
  using (follower_id = auth.uid())
  with check (follower_id = auth.uid());

-- 自分宛ての申請（following_id）は approved のみ更新可能
create policy "follows_approve_as_following"
  on public.follows for update
  to authenticated
  using (following_id = auth.uid())
  with check (following_id = auth.uid());
