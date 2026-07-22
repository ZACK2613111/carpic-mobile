# Supabase plan — September → December 2026 (bridge before the custom backend)

Supabase (Auth + Postgres + Storage + Edge Functions) is CarStudio's **launch
backend**. The intent is to migrate to a custom backend later. This plan runs
Supabase reliably and cheaply through the launch window **while keeping the
migration cheap** — every month also pays down migration risk.

## The migration seam (already in place — protect it)
The app never touches the Supabase client from screens/components: everything
goes through feature `*.api.ts` modules (`projects.api`, `shots.api`, `spin.api`,
`uploads`, `publish`, `captureLinks.api`), enforced by the `no-restricted-imports`
ESLint rule. **This is the swap point.** When the custom backend arrives, only
these ~7 files change; the UI doesn't. Rule: keep new backend calls inside
`*.api.ts`, keep storage paths portable (`{uid}/{projectId}/…` — already are),
and don't leak Supabase-specific types into the UI.

---

## September — Launch-ready
- **Provision & verify:** create the project, run `schema.sql … schema_v6.sql` in
  order, create buckets `projects` (private), `published` (public read),
  `viewer` (public, holds viewer.html + capture.html). Turn email confirmation
  ON (auth hardening) with a working reset redirect, or keep OFF for a soft launch.
- **Prove it works:** `npm run smoke` green end-to-end (auth, project, upload,
  signed URL, shots, spin + RPC, publish, cleanup).
- **Plan tier:** move to **Pro ($25/mo)** before launch — free projects pause on
  inactivity and have no daily backups. Pro gives daily backups + PITR + higher
  egress/storage.
- **Ops baseline:** Sentry wired (crash reporting), EAS Secrets for env (not
  committed), signed-URL TTL sane (1h for viewing; publish re-signing is October).
- **Edge Functions:** `capture-manifest`, `capture-upload` (remote capture) +
  **`delete-account`** (Play requirement). Deploy `--no-verify-jwt` per schema_v4.
- **Storage lifecycle:** confirm project-delete removes `projects/*` + `published/*`
  (already in `deleteProject`); add the same on account delete.

## October — Harden & observe
- **RLS tests** — a seeded script asserting cross-user access fails on every table
  (projects, shots) + storage. The single most important security check.
- **Publish-link strategy** — today the manifest embeds **1-year signed URLs**.
  Replace with a small Edge Function that re-signs on demand (or snapshot to the
  public bucket) + an "unpublish" that revokes.
- **Cost control** — server-side image transforms / thumbnails to cut egress
  (photos are the cost driver on 3G); confirm the ≤2000px client downscale;
  cache signed URLs. Set a **weekly Supabase usage check** (egress + storage).
- **Pagination** — `range()` on the projects list (a dealer may have hundreds).

## November — Scale & measure
- **Analytics funnel** (PostHog/Amplitude, vendor-swappable behind a small module):
  capture-completion → publish → viewer-opens. These numbers drive the launch.
- **Load/soak test** the publish + upload paths; review DB indexes (projects.user_id,
  shots.project_id, updated_at).
- **Storage projection** — model growth (photos/car × cars) and set a cleanup/TTL
  policy for orphaned/old assets.
- **Freeze the data model** and write the **backend API contract** derived from the
  `*.api.ts` surface (the exact endpoints the custom backend must implement).

## December — Migration prep (build the exit, don't cut over yet)
- **API contract doc** finalized: for each `*.api.ts` function, the request/response
  the custom backend must serve (projects CRUD, shots upsert/list, spin save +
  raise-frame-count, storage upload/sign, publish, capture links).
- **Config the base** — make the backend endpoint(s) env-configurable so a build
  can point at Supabase or the new backend (feature-flagged).
- **Data export dry-run** — `pg_dump` + a storage export; verify round-trip.
- **Auth is the hard part** — plan it explicitly: either export users into the new
  system (password hashes are not exportable from Supabase → forces a reset flow),
  or run your own auth from day one of the new backend and migrate sessions. Decide
  early; it gates the cutover.
- **Cutover plan** — dual-run/shadow reads, a switch date, and a rollback path.

---

## Cost & risk notes (Algeria context)
- **Cost drivers = storage + egress** (photos), not compute. Mitigations already in:
  ≤2000px downscale before upload, per-image on-device background removal (no cloud
  per-image cost). Add: server thumbnails, signed-URL caching, lifecycle cleanup.
- **Free tier pauses** on inactivity and lacks backups → be on **Pro** at launch.
- **Biggest migration risk = auth** (no password-hash export). Everything else
  (Postgres rows, storage objects, the `*.api.ts` seam) is portable.
- **Keep Edge Function logic thin & documented** — it's the least portable piece;
  the custom backend will re-implement it.

## Decision gate — when to actually migrate
Migrate when one is true: (a) Supabase cost outgrows a self-hosted equivalent at
your volume, (b) you need backend features Supabase can't serve, or (c) you want
full control of auth/data residency. Until then, Supabase + the `*.api.ts` seam is
the pragmatic launch stack. Don't pre-build the custom backend before the gate.
