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
