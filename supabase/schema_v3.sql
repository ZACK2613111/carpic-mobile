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
