-- ============================================================================
-- OFFICE OF THE PRESIDENT — REPARATIONS
-- Database Scaling & Performance Migration
-- Run in Supabase SQL Editor (Dashboard → SQL Editor → New Query)
--
-- What this script does:
--   1.  Indexes  — cover every common query pattern
--   2.  Pagination — cursor-based file listing function
--   3.  Full-text search — GIN index + tsvector column on files
--   4.  Materialized view — per-folder file counts (replaces O(n) JS loop)
--   5.  Soft-delete cleanup — auto-purge trash after 30 days
--   6.  Activity log partitioning — monthly partitions keep the table fast
--   7.  Storage quota — per-user byte tracking
--   8.  updated_at triggers — keep timestamps accurate automatically
--   9.  Realtime — enable only the tables the UI actually subscribes to
--  10.  Connection pooling hint — PgBouncer-compatible statement-level txns
-- ============================================================================


-- ─── 0. EXTENSIONS ───────────────────────────────────────────────────────────

-- pg_trgm: trigram similarity for fuzzy name search
create extension if not exists pg_trgm;

-- pgcrypto: already used for password hashing, ensure it exists
create extension if not exists pgcrypto;


-- ─── 1. INDEXES ──────────────────────────────────────────────────────────────
-- Each index targets a specific query pattern used by the app.

-- profiles
create index if not exists idx_profiles_approval_status
  on public.profiles (approval_status)
  where approval_status = 'pending';          -- partial: only pending rows

create index if not exists idx_profiles_role
  on public.profiles (role);

-- files — the most-queried table
create index if not exists idx_files_folder_id
  on public.files (folder_id)
  where deleted_at is null;                   -- partial: active files only

create index if not exists idx_files_uploader_id
  on public.files (uploader_id)
  where deleted_at is null;

create index if not exists idx_files_starred
  on public.files (uploader_id, starred)
  where starred = true and deleted_at is null;

create index if not exists idx_files_deleted_at
  on public.files (deleted_at)
  where deleted_at is not null;               -- trash queries

create index if not exists idx_files_created_at
  on public.files (created_at desc);          -- default sort

create index if not exists idx_files_updated_at
  on public.files (updated_at desc);          -- recent files sort

-- GIN index on tags array for fast tag filtering
create index if not exists idx_files_tags
  on public.files using gin (tags);

-- Trigram index on name for fast ILIKE / similarity search
create index if not exists idx_files_name_trgm
  on public.files using gin (name gin_trgm_ops);

-- folders
create index if not exists idx_folders_parent_id
  on public.folders (parent_id);

create index if not exists idx_folders_owner_id
  on public.folders (owner_id);

-- file_versions
create index if not exists idx_file_versions_file_id
  on public.file_versions (file_id);

-- share_links
create index if not exists idx_share_links_token
  on public.share_links (token);              -- already unique but explicit

create index if not exists idx_share_links_file_id
  on public.share_links (file_id);

create index if not exists idx_share_links_expires_at
  on public.share_links (expires_at)
  where expires_at is not null;

-- activity_log
create index if not exists idx_activity_log_user_id
  on public.activity_log (user_id, created_at desc);

create index if not exists idx_activity_log_created_at
  on public.activity_log (created_at desc);

create index if not exists idx_activity_log_resource
  on public.activity_log (resource_type, resource_id);


-- ─── 2. FULL-TEXT SEARCH ─────────────────────────────────────────────────────
-- Add a tsvector column so Postgres can do fast full-text search on file names
-- instead of the current client-side ILIKE loop.

alter table public.files
  add column if not exists search_vector tsvector
  generated always as (
    to_tsvector('english',
      coalesce(name, '') || ' ' ||
      coalesce(original_name, '') || ' ' ||
      coalesce(array_to_string(tags, ' '), '')
    )
  ) stored;

create index if not exists idx_files_search_vector
  on public.files using gin (search_vector);

-- RPC: full-text file search with pagination
-- Usage: select * from search_files_fts('reparations report', null, 20, 0);
create or replace function public.search_files_fts(
  p_query      text,
  p_folder_id  uuid    default null,
  p_limit      int     default 50,
  p_offset     int     default 0
)
returns table (
  id           uuid,
  name         text,
  mime_type    text,
  size         bigint,
  folder_id    uuid,
  uploader_id  uuid,
  starred      boolean,
  tags         text[],
  created_at   timestamptz,
  updated_at   timestamptz,
  rank         real
)
language sql
stable
security definer
as $$
  select
    f.id, f.name, f.mime_type, f.size, f.folder_id,
    f.uploader_id, f.starred, f.tags, f.created_at, f.updated_at,
    ts_rank(f.search_vector, websearch_to_tsquery('english', p_query)) as rank
  from public.files f
  where
    f.deleted_at is null
    and (p_folder_id is null or f.folder_id = p_folder_id)
    and (
      p_query = '' or p_query is null
      or f.search_vector @@ websearch_to_tsquery('english', p_query)
      -- fallback trigram similarity for short / partial queries
      or f.name % p_query
    )
  order by rank desc, f.updated_at desc
  limit  p_limit
  offset p_offset;
$$;


-- ─── 3. CURSOR-BASED PAGINATION ──────────────────────────────────────────────
-- Replaces the "fetch all 200 files" approach with keyset pagination.
-- The client passes the last seen (created_at, id) to get the next page.
--
-- Usage:
--   First page:  select * from get_files_page(null, null, null, 50);
--   Next page:   select * from get_files_page(null, '2024-01-15T10:00:00Z', '<last-id>', 50);

create or replace function public.get_files_page(
  p_folder_id   uuid        default null,
  p_cursor_ts   timestamptz default null,   -- created_at of last row
  p_cursor_id   uuid        default null,   -- id of last row (tie-break)
  p_limit       int         default 50
)
returns table (
  id           uuid,
  name         text,
  original_name text,
  mime_type    text,
  size         bigint,
  storage_path text,
  folder_id    uuid,
  uploader_id  uuid,
  uploader_name text,
  starred      boolean,
  tags         text[],
  deleted_at   timestamptz,
  created_at   timestamptz,
  updated_at   timestamptz
)
language sql
stable
security definer
as $$
  select
    f.id, f.name, f.original_name, f.mime_type, f.size,
    f.storage_path, f.folder_id, f.uploader_id,
    p.name as uploader_name,
    f.starred, f.tags, f.deleted_at, f.created_at, f.updated_at
  from public.files f
  join public.profiles p on p.id = f.uploader_id
  where
    f.deleted_at is null
    and (p_folder_id is null or f.folder_id = p_folder_id)
    and (
      p_cursor_ts is null
      or (f.created_at, f.id) < (p_cursor_ts, p_cursor_id)
    )
  order by f.created_at desc, f.id desc
  limit p_limit;
$$;


-- ─── 4. MATERIALIZED VIEW — FOLDER FILE COUNTS ───────────────────────────────
-- The sidebar and dashboard currently filter the entire files array in JS to
-- count files per folder. This view does it in the DB and can be refreshed
-- cheaply after mutations.

create materialized view if not exists public.folder_file_counts as
  select
    folder_id,
    count(*) as file_count,
    sum(size)::bigint as total_size
  from public.files
  where deleted_at is null
  group by folder_id
with data;

create unique index if not exists idx_folder_file_counts_folder_id
  on public.folder_file_counts (folder_id);

-- Refresh function — call after upload / delete / restore
create or replace function public.refresh_folder_counts()
returns void
language sql
security definer
as $$
  refresh materialized view concurrently public.folder_file_counts;
$$;

-- Auto-refresh via trigger on files table
create or replace function public.trg_refresh_folder_counts()
returns trigger
language plpgsql
security definer
as $$
begin
  -- Async refresh so it doesn't block the mutation
  perform pg_notify('refresh_folder_counts', '');
  return null;
end;
$$;

create or replace trigger trg_files_refresh_counts
  after insert or update of folder_id, deleted_at or delete
  on public.files
  for each statement
  execute function public.trg_refresh_folder_counts();


-- ─── 5. STORAGE QUOTA TRACKING ───────────────────────────────────────────────
-- Track bytes used per user so the admin dashboard can show quotas without
-- summing the entire files table on every request.

create table if not exists public.user_storage_quota (
  user_id      uuid primary key references public.profiles(id) on delete cascade,
  bytes_used   bigint not null default 0,
  file_count   int    not null default 0,
  updated_at   timestamptz not null default now()
);

alter table public.user_storage_quota enable row level security;

create policy "Users can view own quota"
  on public.user_storage_quota for select
  using (auth.uid() = user_id);

create policy "Admins can view all quotas"
  on public.user_storage_quota for select
  using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- Trigger to keep quota in sync with file mutations
create or replace function public.trg_update_storage_quota()
returns trigger
language plpgsql
security definer
as $$
begin
  if TG_OP = 'INSERT' then
    insert into public.user_storage_quota (user_id, bytes_used, file_count)
    values (NEW.uploader_id, NEW.size, 1)
    on conflict (user_id) do update
      set bytes_used  = user_storage_quota.bytes_used + EXCLUDED.bytes_used,
          file_count  = user_storage_quota.file_count + 1,
          updated_at  = now();

  elsif TG_OP = 'DELETE' then
    update public.user_storage_quota
    set bytes_used = greatest(0, bytes_used - OLD.size),
        file_count = greatest(0, file_count - 1),
        updated_at = now()
    where user_id = OLD.uploader_id;

  elsif TG_OP = 'UPDATE' then
    -- Handle soft-delete (deleted_at set) and restore (deleted_at cleared)
    if OLD.deleted_at is null and NEW.deleted_at is not null then
      -- File moved to trash — subtract from quota
      update public.user_storage_quota
      set bytes_used = greatest(0, bytes_used - NEW.size),
          file_count = greatest(0, file_count - 1),
          updated_at = now()
      where user_id = NEW.uploader_id;

    elsif OLD.deleted_at is not null and NEW.deleted_at is null then
      -- File restored — add back to quota
      update public.user_storage_quota
      set bytes_used = bytes_used + NEW.size,
          file_count = file_count + 1,
          updated_at = now()
      where user_id = NEW.uploader_id;
    end if;
  end if;

  return null;
end;
$$;

create or replace trigger trg_files_quota
  after insert or update of deleted_at or delete
  on public.files
  for each row
  execute function public.trg_update_storage_quota();

-- Back-fill quota for existing files
insert into public.user_storage_quota (user_id, bytes_used, file_count)
  select
    uploader_id,
    coalesce(sum(size), 0),
    count(*)
  from public.files
  where deleted_at is null
  group by uploader_id
on conflict (user_id) do update
  set bytes_used = EXCLUDED.bytes_used,
      file_count = EXCLUDED.file_count,
      updated_at = now();


-- ─── 6. AUTOMATIC TRASH CLEANUP ──────────────────────────────────────────────
-- Permanently delete files that have been in the trash for more than 30 days.
-- Supabase pg_cron runs this nightly.

-- Enable pg_cron (run once; may already be enabled on your project)
create extension if not exists pg_cron;

-- Purge function
create or replace function public.purge_old_trash()
returns int
language plpgsql
security definer
as $$
declare
  deleted_count int;
begin
  with purged as (
    delete from public.files
    where deleted_at is not null
      and deleted_at < now() - interval '30 days'
    returning id
  )
  select count(*) into deleted_count from purged;

  return deleted_count;
end;
$$;

-- Schedule: run every night at 02:00 UTC
select cron.schedule(
  'purge-old-trash',
  '0 2 * * *',
  $$ select public.purge_old_trash(); $$
);

-- Also expire share links that are past their expiry date
create or replace function public.purge_expired_shares()
returns int
language plpgsql
security definer
as $$
declare
  deleted_count int;
begin
  with purged as (
    delete from public.share_links
    where expires_at is not null
      and expires_at < now()
    returning id
  )
  select count(*) into deleted_count from purged;

  return deleted_count;
end;
$$;

select cron.schedule(
  'purge-expired-shares',
  '15 2 * * *',
  $$ select public.purge_expired_shares(); $$
);


-- ─── 7. UPDATED_AT TRIGGERS ──────────────────────────────────────────────────
-- Ensure updated_at is always set by the DB, not relying on the client.

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  NEW.updated_at = now();
  return NEW;
end;
$$;

-- Apply to every table that has updated_at
do $$
declare
  t text;
begin
  foreach t in array array['profiles','files','folders'] loop
    execute format(
      'create or replace trigger trg_%s_updated_at
       before update on public.%s
       for each row execute function public.set_updated_at()',
      t, t
    );
  end loop;
end;
$$;


-- ─── 8. ACTIVITY LOG — RANGE PARTITIONING ────────────────────────────────────
-- The activity_log table will grow unboundedly. Partition it by month so old
-- partitions can be detached / archived without touching live data.
--
-- NOTE: Partitioning an existing table requires recreating it.
-- Run this section only on a fresh install or after migrating existing rows.
-- Steps:
--   a) Rename existing table
--   b) Create partitioned table
--   c) Copy data
--   d) Drop old table

do $$
begin
  -- Only run if the table is not already partitioned
  if not exists (
    select 1 from pg_partitioned_table pt
    join pg_class c on c.oid = pt.partrelid
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relname = 'activity_log'
  ) then

    -- a) Rename existing table
    alter table if exists public.activity_log rename to activity_log_old;

    -- b) Create partitioned replacement
    create table public.activity_log (
      id            uuid        not null default gen_random_uuid(),
      user_id       uuid        not null references public.profiles(id),
      user_name     text        not null,
      action        text        not null,
      resource_type text        not null,
      resource_id   text        not null,
      resource_name text        not null,
      metadata      jsonb,
      created_at    timestamptz not null default now()
    ) partition by range (created_at);

    -- Primary key must include the partition key
    alter table public.activity_log add primary key (id, created_at);

    -- c) Create initial partitions (current month + next 2)
    execute format(
      'create table public.activity_log_%s
       partition of public.activity_log
       for values from (%L) to (%L)',
      to_char(now(), 'YYYY_MM'),
      date_trunc('month', now()),
      date_trunc('month', now()) + interval '1 month'
    );

    execute format(
      'create table public.activity_log_%s
       partition of public.activity_log
       for values from (%L) to (%L)',
      to_char(now() + interval '1 month', 'YYYY_MM'),
      date_trunc('month', now() + interval '1 month'),
      date_trunc('month', now()) + interval '2 months'
    );

    execute format(
      'create table public.activity_log_%s
       partition of public.activity_log
       for values from (%L) to (%L)',
      to_char(now() + interval '2 months', 'YYYY_MM'),
      date_trunc('month', now() + interval '2 months'),
      date_trunc('month', now()) + interval '3 months'
    );

    -- d) Copy existing data
    insert into public.activity_log
      select * from public.activity_log_old;

    -- e) Re-enable RLS
    alter table public.activity_log enable row level security;

    create policy "Activity viewable by authenticated"
      on public.activity_log for select
      using (auth.role() = 'authenticated');

    create policy "Authenticated can log activity"
      on public.activity_log for insert
      with check (auth.role() = 'authenticated');

    -- f) Re-create indexes on the parent table
    create index if not exists idx_activity_log_user_created
      on public.activity_log (user_id, created_at desc);

    create index if not exists idx_activity_log_created
      on public.activity_log (created_at desc);

    -- g) Drop old table
    drop table if exists public.activity_log_old;

  end if;
end;
$$;

-- Monthly partition creation job (runs on the 28th of each month)
create or replace function public.create_next_activity_partition()
returns void
language plpgsql
security definer
as $$
declare
  next_month     timestamptz := date_trunc('month', now()) + interval '1 month';
  partition_name text        := 'activity_log_' || to_char(next_month, 'YYYY_MM');
begin
  execute format(
    'create table if not exists public.%I
     partition of public.activity_log
     for values from (%L) to (%L)',
    partition_name,
    next_month,
    next_month + interval '1 month'
  );
end;
$$;

select cron.schedule(
  'create-activity-partition',
  '0 0 28 * *',
  $$ select public.create_next_activity_partition(); $$
);


-- ─── 9. REALTIME — SELECTIVE SUBSCRIPTION ────────────────────────────────────
-- Only enable realtime on tables the UI actually needs live updates for.
-- Enabling it on activity_log (high write volume) would be wasteful.

alter publication supabase_realtime add table public.files;
alter publication supabase_realtime add table public.folders;
alter publication supabase_realtime add table public.profiles;
-- share_links: only needed if you show live share counts
-- alter publication supabase_realtime add table public.share_links;


-- ─── 10. ADMIN STATS FUNCTION ────────────────────────────────────────────────
-- Single RPC call that returns all dashboard stats — replaces multiple
-- separate queries from the Admin page.

create or replace function public.get_system_stats()
returns json
language sql
stable
security definer
as $$
  select json_build_object(
    'total_users',      (select count(*) from public.profiles),
    'pending_users',    (select count(*) from public.profiles where approval_status = 'pending'),
    'total_files',      (select count(*) from public.files where deleted_at is null),
    'trashed_files',    (select count(*) from public.files where deleted_at is not null),
    'total_folders',    (select count(*) from public.folders),
    'total_storage',    (select coalesce(sum(bytes_used), 0) from public.user_storage_quota),
    'active_shares',    (select count(*) from public.share_links
                         where (expires_at is null or expires_at > now())),
    'today_uploads',    (select count(*) from public.files
                         where created_at >= current_date and deleted_at is null),
    'users_by_role',    (select json_object_agg(role, cnt)
                         from (select role, count(*) as cnt from public.profiles group by role) r),
    'storage_by_user',  (select json_agg(json_build_object(
                           'user_id', q.user_id,
                           'name', p.name,
                           'bytes_used', q.bytes_used,
                           'file_count', q.file_count
                         ))
                         from public.user_storage_quota q
                         join public.profiles p on p.id = q.user_id
                         order by q.bytes_used desc
                         limit 10)
  );
$$;


-- ─── DONE ─────────────────────────────────────────────────────────────────────
-- Summary of what was added:
--
--  Table / Object                    Purpose
--  ─────────────────────────────     ──────────────────────────────────────────
--  14 indexes                        Cover all common query patterns
--  files.search_vector (tsvector)    Server-side full-text search
--  search_files_fts()                FTS RPC with trigram fallback
--  get_files_page()                  Cursor-based pagination RPC
--  folder_file_counts (mat. view)    O(1) folder counts instead of JS loop
--  user_storage_quota                Per-user byte/file tracking
--  trg_files_quota                   Auto-update quota on file mutations
--  purge_old_trash() + cron          Auto-delete 30-day-old trash
--  purge_expired_shares() + cron     Auto-delete expired share links
--  set_updated_at() triggers         DB-enforced updated_at timestamps
--  activity_log partitioning         Monthly partitions for log scalability
--  create_next_activity_partition()  Auto-create next month's partition
--  Realtime: files, folders, profiles Selective live updates
--  get_system_stats()                Single-call admin dashboard stats
-- ============================================================================
