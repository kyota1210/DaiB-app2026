-- 古い profiles 定義に default_view_mode / default_sort_order / avatar_url が無い場合の追補
alter table public.profiles
  add column if not exists avatar_url text;

alter table public.profiles
  add column if not exists default_view_mode text not null default 'grid';

alter table public.profiles
  add column if not exists default_sort_order text not null default 'date_logged';
