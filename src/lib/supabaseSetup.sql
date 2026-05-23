-- ============================================================================
-- OFFICE OF THE PRESIDENT — REPARATIONS
-- Supabase Database Setup
-- Run this in Supabase SQL Editor (Dashboard → SQL Editor → New Query)
-- ============================================================================

-- 1. PROFILES TABLE (extends Supabase Auth users)
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  name text not null,
  email text not null,
  role text not null default 'staff' check (role in ('admin','manager','staff','guest')),
  approved boolean not null default false,
  approval_status text not null default 'pending' check (approval_status in ('pending','approved','rejected')),
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Public profiles are viewable by authenticated users"
  on public.profiles for select
  using (auth.role() = 'authenticated');

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

create policy "Admins can update any profile"
  on public.profiles for update
  using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

create policy "Allow insert during registration"
  on public.profiles for insert
  with check (auth.uid() = id);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
declare
  user_count int;
begin
  select count(*) into user_count from public.profiles;
  
  insert into public.profiles (id, name, email, role, approved, approval_status)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    new.email,
    case when user_count = 0 then 'admin' else 'staff' end,
    case when user_count = 0 then true else false end,
    case when user_count = 0 then 'approved' else 'pending' end
  );
  return new;
end;
$$ language plpgsql security definer;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 2. FOLDERS TABLE
create table if not exists public.folders (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  parent_id uuid references public.folders(id) on delete cascade,
  owner_id uuid references public.profiles(id) not null,
  path text not null,
  color text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.folders enable row level security;

create policy "Folders viewable by authenticated users"
  on public.folders for select using (auth.role() = 'authenticated');

create policy "Authenticated users can create folders"
  on public.folders for insert with check (auth.role() = 'authenticated');

create policy "Folder owners can update"
  on public.folders for update using (owner_id = auth.uid());

create policy "Folder owners can delete"
  on public.folders for delete using (owner_id = auth.uid());

-- 3. FILES TABLE
create table if not exists public.files (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  original_name text not null,
  mime_type text not null,
  size bigint not null,
  storage_path text not null,
  folder_id uuid references public.folders(id) on delete set null,
  uploader_id uuid references public.profiles(id) not null,
  starred boolean not null default false,
  tags text[] not null default '{}',
  content text,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.files enable row level security;

create policy "Files viewable by authenticated users"
  on public.files for select using (auth.role() = 'authenticated');

create policy "Authenticated users can upload files"
  on public.files for insert with check (auth.role() = 'authenticated');

create policy "File uploaders can update"
  on public.files for update using (uploader_id = auth.uid());

create policy "File uploaders can delete"
  on public.files for delete using (uploader_id = auth.uid());

-- 4. FILE VERSIONS
create table if not exists public.file_versions (
  id uuid primary key default gen_random_uuid(),
  file_id uuid references public.files(id) on delete cascade not null,
  version int not null,
  size bigint not null,
  storage_path text not null,
  uploader_id uuid references public.profiles(id) not null,
  comment text,
  created_at timestamptz not null default now(),
  unique(file_id, version)
);

alter table public.file_versions enable row level security;

create policy "Versions viewable by authenticated" on public.file_versions
  for select using (auth.role() = 'authenticated');
create policy "Versions insertable by authenticated" on public.file_versions
  for insert with check (auth.role() = 'authenticated');

-- 5. SHARE LINKS
create table if not exists public.share_links (
  id uuid primary key default gen_random_uuid(),
  file_id uuid references public.files(id) on delete cascade not null,
  token text unique not null default replace(gen_random_uuid()::text, '-', ''),
  password text,
  expires_at timestamptz,
  max_access int,
  access_count int not null default 0,
  created_by uuid references public.profiles(id) not null,
  created_at timestamptz not null default now()
);

alter table public.share_links enable row level security;

create policy "Share links viewable by authenticated" on public.share_links
  for select using (auth.role() = 'authenticated');
create policy "Authenticated can create share links" on public.share_links
  for insert with check (auth.role() = 'authenticated');
create policy "Creator can delete share links" on public.share_links
  for delete using (created_by = auth.uid());

-- Public access to share links by token (for unauthenticated share page)
create policy "Anyone can view share link by token" on public.share_links
  for select using (true);

-- 6. ACTIVITY LOG
create table if not exists public.activity_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) not null,
  user_name text not null,
  action text not null,
  resource_type text not null,
  resource_id text not null,
  resource_name text not null,
  metadata jsonb,
  created_at timestamptz not null default now()
);

alter table public.activity_log enable row level security;

create policy "Activity viewable by authenticated" on public.activity_log
  for select using (auth.role() = 'authenticated');
create policy "Authenticated can log activity" on public.activity_log
  for insert with check (auth.role() = 'authenticated');

-- 7. TAGS TABLE
create table if not exists public.tags (
  id uuid primary key default gen_random_uuid(),
  name text unique not null,
  color text not null default '#6366f1',
  created_at timestamptz not null default now()
);

alter table public.tags enable row level security;

create policy "Tags viewable by authenticated" on public.tags
  for select using (auth.role() = 'authenticated');
create policy "Authenticated can create tags" on public.tags
  for insert with check (auth.role() = 'authenticated');

-- Insert default tags
insert into public.tags (name, color) values
  ('Important', '#ef4444'),
  ('Research', '#3b82f6'),
  ('Legal', '#8b5cf6'),
  ('Financial', '#10b981'),
  ('Historical', '#f59e0b'),
  ('Confidential', '#ec4899')
on conflict (name) do nothing;

-- 8. STORAGE BUCKET
-- Run this separately or create via Dashboard → Storage → New Bucket
-- Name: "files"  |  Public: false
insert into storage.buckets (id, name, public) values ('files', 'files', false)
on conflict (id) do nothing;

create policy "Authenticated users can upload to files bucket"
  on storage.objects for insert
  with check (bucket_id = 'files' and auth.role() = 'authenticated');

create policy "Authenticated users can read files bucket"
  on storage.objects for select
  using (bucket_id = 'files' and auth.role() = 'authenticated');

create policy "Users can delete own files"
  on storage.objects for delete
  using (bucket_id = 'files' and auth.uid()::text = (storage.foldername(name))[1]);
