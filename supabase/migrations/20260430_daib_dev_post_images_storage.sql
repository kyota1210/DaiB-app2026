-- 投稿画像バケット（ダッシュボードで作成済みの場合も id を揃える）
insert into storage.buckets (id, name, public)
values ('daib-dev-post-images', 'daib-dev-post-images', true)
on conflict (id) do update set public = excluded.public;

-- オブジェクトパス先頭フォルダ = auth.uid()（{userId}/{postId}/{timestamp}.jpg）
create policy "daib_post_images_public_read"
  on storage.objects for select
  to public
  using (bucket_id = 'daib-dev-post-images');

create policy "daib_post_images_owner_write"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'daib-dev-post-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "daib_post_images_owner_update"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'daib-dev-post-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'daib-dev-post-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "daib_post_images_owner_delete"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'daib-dev-post-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
