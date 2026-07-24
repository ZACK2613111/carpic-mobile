-- CarStudio - full database setup
-- Paste ALL of this into: Supabase dashboard -> SQL Editor -> New query -> Run
-- Safe to run once on a fresh project (creates tables, RLS, storage buckets).

-- ===================================================================
-- schema.sql
-- ===================================================================
-- ============================================================================
-- CarStudio — Supabase schema
-- Paste this whole file into the Supabase SQL Editor and run it once.
-- It is idempotent (safe to re-run).
--
-- Creates:
--   * profiles            (one row per user, auto-created on signup)
--   * projects            (one row per car photo project; hotspots live in doc jsonb)
--   * custom_backgrounds  (user-uploaded background images)
--   * a private Storage bucket "projects" with owner-only access
-- Everything is protected by Row Level Security so each user only sees their own data.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  created_at   timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles
  for select to authenticated using ((select auth.uid()) = id);

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own" on public.profiles
  for insert to authenticated with check ((select auth.uid()) = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update to authenticated
  using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

-- Auto-create a profile row whenever a new auth user signs up.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1))
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- shared updated_at trigger
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- projects
-- ---------------------------------------------------------------------------
create table if not exists public.projects (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users (id) on delete cascade default auth.uid(),
  name          text not null default 'Untitled',
  mode          text not null default 'marketing' check (mode in ('marketing', 'inspection')),
  background_id text not null default 'transparent',
  doc           jsonb not null default '{"hotspots": [], "version": 1}'::jsonb,
  original_path text,
  cutout_path   text,
  export_path   text,
  thumb_path    text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

alter table public.projects enable row level security;

create index if not exists projects_user_id_idx     on public.projects (user_id);
create index if not exists projects_user_updated_idx on public.projects (user_id, updated_at desc);

drop policy if exists "projects_select_own" on public.projects;
create policy "projects_select_own" on public.projects
  for select to authenticated using ((select auth.uid()) = user_id);

drop policy if exists "projects_insert_own" on public.projects;
create policy "projects_insert_own" on public.projects
  for insert to authenticated with check ((select auth.uid()) = user_id);

drop policy if exists "projects_update_own" on public.projects;
create policy "projects_update_own" on public.projects
  for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

drop policy if exists "projects_delete_own" on public.projects;
create policy "projects_delete_own" on public.projects
  for delete to authenticated using ((select auth.uid()) = user_id);

drop trigger if exists projects_set_updated_at on public.projects;
create trigger projects_set_updated_at
  before update on public.projects
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- custom_backgrounds
-- ---------------------------------------------------------------------------
create table if not exists public.custom_backgrounds (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users (id) on delete cascade default auth.uid(),
  name         text not null default 'Background',
  storage_path text not null,
  created_at   timestamptz not null default now()
);

alter table public.custom_backgrounds enable row level security;

create index if not exists custom_backgrounds_user_id_idx on public.custom_backgrounds (user_id);

drop policy if exists "cbg_select_own" on public.custom_backgrounds;
create policy "cbg_select_own" on public.custom_backgrounds
  for select to authenticated using ((select auth.uid()) = user_id);

drop policy if exists "cbg_insert_own" on public.custom_backgrounds;
create policy "cbg_insert_own" on public.custom_backgrounds
  for insert to authenticated with check ((select auth.uid()) = user_id);

drop policy if exists "cbg_delete_own" on public.custom_backgrounds;
create policy "cbg_delete_own" on public.custom_backgrounds
  for delete to authenticated using ((select auth.uid()) = user_id);

-- ---------------------------------------------------------------------------
-- Storage: private "projects" bucket, owner-only by folder = user id
-- Object keys look like:  <user_id>/<project_id>/{original|cutout|export|thumb}.{png|jpg}
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('projects', 'projects', false)
on conflict (id) do nothing;

drop policy if exists "projects_storage_select" on storage.objects;
create policy "projects_storage_select" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'projects'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists "projects_storage_insert" on storage.objects;
create policy "projects_storage_insert" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'projects'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists "projects_storage_update" on storage.objects;
create policy "projects_storage_update" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'projects'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists "projects_storage_delete" on storage.objects;
create policy "projects_storage_delete" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'projects'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

-- ===================================================================
-- schema_v2.sql
-- ===================================================================
-- ============================================================================
-- CarStudio v2 — multi-shot + 360 + publish
-- Run this AFTER schema.sql in the Supabase SQL Editor. Idempotent (safe to re-run).
-- Adds: shots table, projects spin/status/publish columns, and a PUBLIC "published"
-- bucket that backs the shareable web-viewer links.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- projects: new columns
-- ---------------------------------------------------------------------------
alter table public.projects add column if not exists status text not null default 'draft'
  check (status in ('draft', 'ready', 'published'));
alter table public.projects add column if not exists cover_slot text;
alter table public.projects add column if not exists spin jsonb not null default '{"frameCount":0,"hotspots":[]}'::jsonb;
alter table public.projects add column if not exists published_url text;
alter table public.projects add column if not exists published_at timestamptz;

-- ---------------------------------------------------------------------------
-- shots (one row per captured slot; a project has many)
-- ---------------------------------------------------------------------------
create table if not exists public.shots (
  id            uuid primary key default gen_random_uuid(),
  project_id    uuid not null references public.projects (id) on delete cascade,
  user_id       uuid not null references auth.users (id) on delete cascade default auth.uid(),
  slot          text not null,
  section       text not null,
  position      int  not null default 0,
  image_path    text,
  cutout_path   text,
  background_id text not null default 'transparent',
  doc           jsonb not null default '{"version":1,"hotspots":[]}'::jsonb,
  audio_path    text,
  captured      boolean not null default false,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (project_id, slot)
);

alter table public.shots enable row level security;
create index if not exists shots_project_idx on public.shots (project_id, position);
create index if not exists shots_user_idx on public.shots (user_id);

drop policy if exists "shots_select_own" on public.shots;
create policy "shots_select_own" on public.shots
  for select to authenticated using ((select auth.uid()) = user_id);

drop policy if exists "shots_insert_own" on public.shots;
create policy "shots_insert_own" on public.shots
  for insert to authenticated with check ((select auth.uid()) = user_id);

drop policy if exists "shots_update_own" on public.shots;
create policy "shots_update_own" on public.shots
  for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

drop policy if exists "shots_delete_own" on public.shots;
create policy "shots_delete_own" on public.shots
  for delete to authenticated using ((select auth.uid()) = user_id);

drop trigger if exists shots_set_updated_at on public.shots;
create trigger shots_set_updated_at
  before update on public.shots
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Storage: PUBLIC "published" bucket for the shareable web viewer.
-- Objects live under <user_id>/<project_id>/... ; owners write, everyone reads.
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('published', 'published', true)
on conflict (id) do nothing;

drop policy if exists "published_read_all" on storage.objects;
create policy "published_read_all" on storage.objects
  for select to public using (bucket_id = 'published');

drop policy if exists "published_insert_own" on storage.objects;
create policy "published_insert_own" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'published' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists "published_update_own" on storage.objects;
create policy "published_update_own" on storage.objects
  for update to authenticated
  using (bucket_id = 'published' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists "published_delete_own" on storage.objects;
create policy "published_delete_own" on storage.objects
  for delete to authenticated
  using (bucket_id = 'published' and (storage.foldername(name))[1] = (select auth.uid())::text);

-- ===================================================================
-- schema_v3.sql
-- ===================================================================
-- ============================================================================
-- CarStudio v3 — publish hardening
-- Run this AFTER schema_v2.sql in the Supabase SQL Editor. Idempotent (safe to re-run).
--
-- Why: v2 let any authenticated user upload ARBITRARY files — including HTML —
-- to the public "published" bucket, i.e. free page hosting on your Supabase
-- domain (a phishing vector). v3:
--   * locks "published" down to JSON manifests named manifest.json
--   * moves the web viewer to a read-only "viewer" bucket clients cannot write
--
-- !! ONE-TIME MANUAL STEP !!
-- After running this, upload web/viewer.html to the ROOT of the "viewer"
-- bucket (Dashboard -> Storage -> viewer -> Upload file). Publishing fails
-- with a clear in-app error until you do. Re-upload it whenever
-- web/viewer.html changes.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- published: only JSON manifests, named manifest.json, in the user's own folder
-- ---------------------------------------------------------------------------
update storage.buckets
  set allowed_mime_types = array['application/json'],
      file_size_limit    = 1048576  -- 1 MB is plenty for a manifest
  where id = 'published';

drop policy if exists "published_insert_own" on storage.objects;
create policy "published_insert_own" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'published'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and storage.filename(name) = 'manifest.json'
  );

drop policy if exists "published_update_own" on storage.objects;
create policy "published_update_own" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'published'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  )
  with check (
    bucket_id = 'published'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and storage.filename(name) = 'manifest.json'
  );

-- "published_delete_own" from v2 stays as-is so users can still clean up the
-- per-user viewer.html copies that v2 uploaded.

-- ---------------------------------------------------------------------------
-- viewer: public read, NO client writes. Only the dashboard / service role can
-- upload here (there are deliberately no insert/update/delete policies).
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('viewer', 'viewer', true)
on conflict (id) do nothing;

update storage.buckets
  set allowed_mime_types = array['text/html'],
      file_size_limit    = 5242880  -- 5 MB
  where id = 'viewer';

drop policy if exists "viewer_read_all" on storage.objects;
create policy "viewer_read_all" on storage.objects
  for select to public using (bucket_id = 'viewer');

-- ===================================================================
-- schema_v4.sql
-- ===================================================================
-- ============================================================================
-- CarStudio v4 — remote capture links
-- Run AFTER schema_v3.sql in the Supabase SQL Editor. Idempotent (safe to re-run).
--
-- "Send a link to the vehicle owner, they shoot the photos from their browser."
-- Anonymous visitors NEVER touch the database or storage directly: the token is
-- validated by the Edge Functions (capture-manifest / capture-upload), which
-- write with the service role into the owner's private folders.
--
-- !! ONE-TIME MANUAL STEPS (after this SQL) !!
-- 1. Deploy the two Edge Functions with the Supabase CLI, WITHOUT JWT
--    verification (the capture token IS the auth for anonymous visitors):
--      supabase functions deploy capture-manifest --no-verify-jwt
--      supabase functions deploy capture-upload  --no-verify-jwt
-- 2. Upload web/capture.html to the ROOT of the "viewer" bucket (next to
--    viewer.html) — it's the page the shared link opens.
-- ============================================================================

create table if not exists public.capture_links (
  id         uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  user_id    uuid not null references auth.users (id) on delete cascade default auth.uid(),
  -- 32 hex chars of server-side randomness: unguessable, URL-safe.
  token      text not null unique default encode(gen_random_bytes(16), 'hex'),
  expires_at timestamptz not null default now() + interval '7 days',
  used_at    timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.capture_links enable row level security;

create index if not exists capture_links_project_idx on public.capture_links (project_id);
-- token lookups come from the Edge Functions (service role), but index it anyway
create index if not exists capture_links_token_idx on public.capture_links (token);

-- Owners manage their own links; anonymous visitors have NO direct access.
drop policy if exists "capture_links_select_own" on public.capture_links;
create policy "capture_links_select_own" on public.capture_links
  for select to authenticated using ((select auth.uid()) = user_id);

drop policy if exists "capture_links_insert_own" on public.capture_links;
create policy "capture_links_insert_own" on public.capture_links
  for insert to authenticated with check ((select auth.uid()) = user_id);

drop policy if exists "capture_links_update_own" on public.capture_links;
create policy "capture_links_update_own" on public.capture_links
  for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

drop policy if exists "capture_links_delete_own" on public.capture_links;
create policy "capture_links_delete_own" on public.capture_links
  for delete to authenticated using ((select auth.uid()) = user_id);

-- ===================================================================
-- schema_v5.sql
-- ===================================================================
-- ============================================================================
-- CarStudio v5 — vehicle VIN
-- Run AFTER schema_v4.sql in the Supabase SQL Editor. Idempotent (safe to re-run).
--
-- The VIN is the only structured vehicle data we can rely on (no marketplace
-- API, no catalogue). Stored as-is; make/year/region are decoded on-device from
-- it (see src/features/vehicle/vin.ts), so no extra columns are needed.
-- Existing RLS on `projects` already scopes it to the owner.
-- ============================================================================

alter table public.projects
  add column if not exists vin text;

-- ===================================================================
-- schema_v6.sql
-- ===================================================================
-- schema_v6.sql — atomic spin.frameCount raise
-- Run AFTER schema_v5.sql. Idempotent (create or replace).
--
-- Why: the upload queue converges spin.frameCount as offline frames sync. Doing
-- that as a read-modify-write of the whole `spin` jsonb (getProject → saveSpin)
-- raced the spin editor's autosave and could clobber freshly-saved hotspots or
-- the chosen background. This function raises ONLY the frameCount key in place,
-- server-side and atomically, so concurrent edits to the other spin fields are
-- preserved. `greatest(...)` guarantees the count is only ever raised.
--
-- SECURITY INVOKER (default for SQL functions): runs as the caller, so the
-- projects Row-Level Security policy still gates which row can be updated.

create or replace function public.raise_spin_frame_count(p_project_id uuid, p_min int)
returns void
language sql
as $$
  update public.projects
     set spin = jsonb_set(
       coalesce(spin, '{}'::jsonb),
       '{frameCount}',
       to_jsonb(greatest(coalesce((spin ->> 'frameCount')::int, 0), p_min)),
       true
     )
   where id = p_project_id;
$$;

grant execute on function public.raise_spin_frame_count(uuid, int) to authenticated;
