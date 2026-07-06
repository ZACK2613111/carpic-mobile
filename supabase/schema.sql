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
