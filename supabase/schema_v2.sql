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
