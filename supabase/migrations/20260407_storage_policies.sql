insert into storage.buckets (id, name, public)
values
  ('avatars', 'avatars', true),
  ('posts', 'posts', true)
on conflict (id) do nothing;

create policy "avatars_public_read"
  on storage.objects for select
  to public
  using (bucket_id = 'avatars');

create policy "avatars_owner_write"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "avatars_owner_update"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "avatars_owner_delete"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "posts_public_read"
  on storage.objects for select
  to public
  using (bucket_id = 'posts');

create policy "posts_owner_write"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'posts'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "posts_owner_update"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'posts'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'posts'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "posts_owner_delete"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'posts'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
