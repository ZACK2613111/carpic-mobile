# 🗺️ CarStudio — Production & Scaling Roadmap

Where the app is today and what to add to make it **deployable, robust, and scalable**.
Prioritized: **P0** = do before any public/store deploy · **P1** = scale & robustness · **P2** = growth & polish.

---

## Where we are today (solid foundation)
- ✅ Clean feature-folder architecture (`src/features/*`, `src/lib/*`, `src/components/*`) + design system
- ✅ Supabase auth + Postgres + Storage, **Row-Level Security on every table**
- ✅ On-device (offline) background removal, guided multi-shot capture, 360° spin, hotspots, engine audio
- ✅ Shareable web viewer (XSS-safe), React Query cache **persisted** for instant loads
- ✅ New Architecture + Hermes (defaults), typecheck + lint + expo-doctor all green, two adversarial review passes applied

---

## P0 — Before you deploy (must-have)

| Item | Why | What to add |
|---|---|---|
| **CI pipeline** | catch breakage before ship | GitHub Actions: `tsc --noEmit`, `expo lint`, `expo-doctor` on every PR |
| **OTA + build/submit pipeline** | ship JS fixes without a store review; automate builds | `eas update` (channels: preview/production) + `eas build`/`eas submit` profiles |
| **Crash & error reporting** | you can't fix what you can't see | Sentry (`@sentry/react-native` + `sentry-expo`) + a top-level React error boundary |
| **App identity & assets** | store requirement | real app icon + splash, correct `version`/`buildNumber` (`autoIncrement` is set for prod), bundle ids |
| **Auth hardening** | security | re-enable **email confirmation**, password rules, add **Sign in with Apple/Google** (Apple sign-in is required by App Store if you offer any social login) |
| **Store compliance** | approval | privacy policy URL, data-deletion path, accurate camera/mic/photo usage strings (present), age rating |
| **Storage lifecycle** | cost + privacy | on project delete, remove `shots/*`, `spin/*`, and `published/*` objects (project row delete cascades DB, **not** Storage) |
| **Publish-link strategy** | links currently embed **1-year signed URLs** | decide: (a) an **Edge Function** that re-signs on demand, or (b) copy a snapshot into the public bucket; add an "unpublish" that revokes |
| **Smoke tests** | confidence | a few unit tests (validators, coordinate math) + 1 Maestro E2E happy-path (sign-in → new car → capture → publish) |

---

## P1 — Scale & robustness

| Item | Why | Approach |
|---|---|---|
| **Offline-first sync** | dealers shoot in basements/lots with no signal | today = React Query cache + best-effort writes. Add **PowerSync** (paid, batteries-included) or **WatermelonDB** (free, DIY) for a local SQLite mirror that syncs |
| **Background upload queue** | uploads currently fire inline and are best-effort | a persistent queue (e.g. `expo-task-manager` / a small retry queue in SQLite) that retries failed shot/frame uploads |
| **Projects list pagination** | a dealer may have hundreds of cars | `range()` pagination / infinite scroll on the projects query (currently loads all) |
| **Image pipeline** | bandwidth, storage cost, speed | resize/compress **before** upload (expo-image-manipulator); generate server thumbnails via **Supabase image transforms**; cap max dimension |
| **Server-side publish** | offload work, enable real 360 video | a **Supabase Edge Function** composites shots on the chosen background, builds the manifest, and (optionally) renders an **MP4/GIF spin** with server ffmpeg — removes the on-device video-encoder limitation |
| **Batch cut-out throughput** | 24-frame 360 is sequential (~10–40s) | bounded parallelism + cancellation UI (queue with N-at-a-time), or move to the Edge Function |
| **Migrations** | raw `schema.sql` files drift | adopt the **Supabase CLI** (`supabase/migrations/`) for versioned, reviewable DB changes |
| **Observability** | ops | structured logging, Supabase logs/alerts, uptime check on the viewer host |
| **i18n** | FR + EN audience | full i18n (labels already carry FR); `expo-localization` + a strings layer |

---

## P2 — Growth & product polish

- **Custom branded backgrounds uploader** — the `custom_backgrounds` table exists but has no UI yet; let dealers upload their showroom/brand backdrop.
- **Dealer logo / watermark** on exports; **license-plate blur** (an ML pass) — a signature CarCutter feature.
- **Lead capture on the viewer page** — a "Contact / I'm interested" form on the shared link → notifies the dealer (turns the link into a sales tool).
- **Push notifications** (`expo-notifications`) — "your listing was viewed", capture reminders.
- **Deep links / universal links** — open a specific project from a link.
- **Teams / roles** — dealership accounts with multiple photographers (RLS by org, not just user).
- **Analytics** — PostHog/Amplitude funnels (capture completion rate, publish rate, viewer opens).
- **Web viewer on your own domain/CDN** — brand it (`studio.auto-declic.fr`) instead of the raw Supabase URL.
- **MP4/GIF spin download** — via the server-side publish (see P1).

---

## Optimization checklist (ongoing)
- [x] New Architecture + Hermes (on) · [x] expo-image memory-disk cache · [x] React Query cache persistence
- [ ] `FlatList` tuning on large lists (`windowSize`, `removeClippedSubviews`, stable `keyExtractor`)
- [ ] memoize expensive renders (Skia canvas, spin frames) + `React.memo` on list rows
- [ ] client-side image downscale before upload (biggest bandwidth win)
- [ ] Android release: R8/Proguard shrink; audit bundle size (`npx expo export` + source-map explorer)
- [ ] EAS build caching; split `development`/`preview`/`production` clearly (done)

## Security checklist
- [x] RLS on every table · [x] no `service_role` key in the client · [x] viewer XSS-safe (textContent)
- [ ] add **RLS tests** (pgTAP or a seeded test that asserts cross-user access fails)
- [ ] shorten/rotate published signed-URL TTL (or move to Edge-Function re-signing)
- [ ] keys/secrets via **EAS Secrets**, not committed
- [ ] server-side validation for anything user-published

---

## Architecture principles to keep
- **One source of truth** per concern (shot template, design tokens, storage helper) — already followed.
- **Features own their data + UI** (`features/<x>/{api,hooks,components}`) — keep new work in this shape.
- **Talk to interfaces, not implementations** (e.g. the swappable `BgRemovalEngine`) — do the same for sync/analytics so vendors can be swapped.
- **Thin screens, logic in hooks/api** — screens compose; they don't hold business logic.
