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
