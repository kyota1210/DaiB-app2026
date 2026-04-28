-- ユーザー通報・ブロック機能のためのテーブルと RLS。
-- Apple App Store Review Guideline 1.2 (Safety - User-Generated Content) 対応。

-- ============================================================================
-- 1. reports (通報)
-- ============================================================================
create table if not exists public.reports (
  id bigserial primary key,
  reporter_id uuid not null references auth.users(id) on delete cascade,
  target_type text not null check (target_type in ('post', 'user', 'comment')),
  target_id text not null,                -- post id (bigint) / user id (uuid) を文字列で受ける
  reason text not null,                   -- 'spam' | 'abuse' | 'illegal' | 'other'
  detail text,
  status text not null default 'open'
    check (status in ('open', 'reviewing', 'actioned', 'dismissed')),
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users(id) on delete set null
);

create index if not exists reports_reporter_idx on public.reports(reporter_id);
create index if not exists reports_target_idx on public.reports(target_type, target_id);
create index if not exists reports_status_idx on public.reports(status) where status = 'open';

alter table public.reports enable row level security;

-- 自分が通報した内容は閲覧できる
drop policy if exists "reports: own select" on public.reports;
create policy "reports: own select"
  on public.reports for select
  to authenticated
  using (reporter_id = auth.uid());

-- 認証ユーザーは reporter_id = self で挿入可能
drop policy if exists "reports: own insert" on public.reports;
create policy "reports: own insert"
  on public.reports for insert
  to authenticated
  with check (reporter_id = auth.uid());

-- 更新・削除は service_role のみ（運営側オペレーション）。authenticated には付与しない。

-- ============================================================================
-- 2. user_blocks (ブロック)
-- ============================================================================
create table if not exists public.user_blocks (
  user_id uuid not null references auth.users(id) on delete cascade,
  blocked_user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, blocked_user_id),
  check (user_id <> blocked_user_id)
);

create index if not exists user_blocks_user_idx on public.user_blocks(user_id);
create index if not exists user_blocks_blocked_idx on public.user_blocks(blocked_user_id);

alter table public.user_blocks enable row level security;

-- 自分のブロック関係のみ参照可
drop policy if exists "user_blocks: own select" on public.user_blocks;
create policy "user_blocks: own select"
  on public.user_blocks for select
  to authenticated
  using (user_id = auth.uid());

-- 自分のブロックのみ作成可
drop policy if exists "user_blocks: own insert" on public.user_blocks;
create policy "user_blocks: own insert"
  on public.user_blocks for insert
  to authenticated
  with check (user_id = auth.uid());

-- 自分のブロックのみ解除可（delete）
drop policy if exists "user_blocks: own delete" on public.user_blocks;
create policy "user_blocks: own delete"
  on public.user_blocks for delete
  to authenticated
  using (user_id = auth.uid());

grant select, insert, delete on public.user_blocks to authenticated;
grant select, insert on public.reports to authenticated;
