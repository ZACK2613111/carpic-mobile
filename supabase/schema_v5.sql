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
