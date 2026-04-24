-- 20260407 を未適用のプロジェクトでも avatars バケットを確保（Bucket not found 対策）
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do update set public = excluded.public;
