@AGENTS.md

# CarStudio — guidance for Claude Code

CarCutter-style automotive photo studio. Expo SDK 57 + React Native 0.86 + TypeScript,
`expo-router` (file-based, routes under `src/app`). New Architecture is mandatory in SDK 57.

> Expo changed a lot in SDK 56/57 — read the versioned docs at
> https://docs.expo.dev/versions/v57.0.0/ before using an Expo API from memory.

## What it does
Photo → **on-device background removal** (offline) → transparent/branded background → **hotspots**
(marketing feature callouts + inspection damage pins, switchable) → export/share. Accounts +
per-user cloud sync via Supabase.

## Run / verify
- `npx tsc --noEmit` — typecheck (keep green)
- `npm run lint` — ESLint (React Compiler is ON: **no reading/writing refs during render** —
  use a reanimated shared value for gesture state, and write "latest" refs in a `useEffect`).
  The compiler rules `react-hooks/immutability` and `react-hooks/refs` are **turned off** in
  `eslint.config.js` because they false-positive on reanimated shared-value mutation (`sv.value = x`).
- `npx expo-doctor` — validate config + native deps
- **Cannot run in Expo Go** (native modules). Needs an EAS dev build; iOS cutout needs iOS 17 + a
  real device. This repo can't be launched on a plain dev box without a device/emulator.

## Architecture map
- `src/app/` — routes. Route groups `(auth)`/`(tabs)` are URL-transparent, so there is **no root
  `index.tsx`** (`/` = `(tabs)/index`). Guards live in the group `_layout.tsx` files.
- `src/features/background-removal/` — `BgRemovalEngine` interface + `registry.ts` (`activeEngine`).
  Primary = `@six33/react-native-bg-removal`; fallback `executorchEngine` is a stub (uninstalled).
- `src/features/editor/` — `StudioCanvas.tsx` is **presentational** (Skia: background + cutout +
  crosshair + hotspot pins; the `makeImageSnapshot` export target). The **editor screen owns all
  gestures**: pinch-zoom + two-finger pan (worklets) and single-finger tap/drag for pins
  (`runOnJS(true)`), plus `toNorm()` which inverse-maps viewport→normalized coords through the zoom
  transform. `editorStore.ts` (zustand) has **undo/redo history** (`past`/`future`, `beginInteraction`
  snapshots at drag start). `backgrounds.ts`, `exportImage.ts`, `CoachMarks.tsx`, `HotspotSheet.tsx`.
- `src/components/` — in-house design system: `Text` (typography variants), `Icon` (SVG set),
  `Button`/`PressableScale`/`IconButton` (animated + haptic), `SegmentedControl`, `Card`, `Chip`,
  `Skeleton`, `EmptyState`, `Checkerboard` (SVG pattern), `Toast` (`ToastProvider` + `useToast`).
- `src/lib/` — `supabase.ts`, `queryClient.ts` (+ AsyncStorage persister → instant loads),
  `haptics.ts`, `onboarding.ts`, `env.ts`.
- `src/features/projects/` — Supabase CRUD + Storage (`projects.api.ts`) + React Query hooks.
- `src/lib/supabase.ts` — client; `react-native-url-polyfill/auto` MUST be imported first.

## Key conventions / gotchas
- Path alias `@/*` → `src/*`.
- Hotspots store **normalized 0..1** coords so they survive export scaling; pins are drawn **inside
  Skia** so `makeImageSnapshot` flattens them (no view-shot needed).
- Storage objects: `<user_id>/<project_id>/{original|cutout|export|thumb}.{png|jpg}`; private bucket,
  read via `createSignedUrl`. Uploads = base64 → `base64-arraybuffer` `decode()` → ArrayBuffer with
  explicit `contentType` (never upload a Blob in RN).
- `expo-file-system` is class-based in SDK 57; this app uses the legacy submodule
  (`expo-file-system/legacy`) for `readAsStringAsync`/`writeAsStringAsync`/`cacheDirectory`.
- `expo-image-manipulator` uses the context API: `ImageManipulator.manipulate(uri).resize(...).renderAsync()` → `.saveAsync()`.
- Env: `EXPO_PUBLIC_SUPABASE_URL` / `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` in `.env`. Never add the
  service_role key. `isSupabaseConfigured` gates the UI when unset.
- Android ML Kit needs the local config plugin `plugins/withMlKitSubjectSegmentation.js`
  (install-time model download). Regenerate native dirs after config/plugin changes (new build).

## Data
`projects.doc` is JSONB holding `{ version, hotspots[] }`. Schema + RLS + bucket live in
`supabase/schema.sql`. **v2 adds `supabase/schema_v2.sql`** — run it too.

## v2 — multi-shot, 360, publish, engine
A project = many **shots** + a **360 spin**. Flow: Projects list → **project dashboard**
(`src/app/project/[id].tsx`) → **guided capture** (`src/app/capture/[id].tsx`, expo-camera +
`src/features/capture/{shotTemplate.ts,GuideOverlay.tsx}`) → per-shot **editor** (reused
`src/app/editor/[id].tsx`, now targets a **shot** id).
- **Shots:** `src/features/shots/*` (table has a `section` column — NOT the reserved word `group`;
  upsert on `(project_id, slot)`). Storage under `<uid>/<projectId>/shots/<slot>/<kind>.<ext>`.
- **360:** `src/features/spin/*` — frames at `<uid>/<projectId>/spin/frame_NNN(.jpg|_cutout.png)`,
  count+hotspots in `projects.spin` (jsonb). `SpinViewer` drag-rotates; `batch.ts` cuts out all frames.
- **Publish:** `src/features/publish/publish.ts` → builds a manifest with **1-year signed URLs** to the
  private bucket, uploads `manifest.json` + the bundled `web/viewer.html` (via `metro.config.js`
  assetExts `html`) to the **public `published` bucket**; link = `viewer.html?d=<manifestUrl>`.
  Keep the manifest field names in sync with `web/viewer.html`.
- **Engine sound:** `src/features/editor/EngineAudio.tsx` (expo-audio) shows only for the engine slot
  (`getSlot(shot.slot)?.audio`); records → `shots.audio_path`; surfaces in the web viewer.
- **Shared storage helper:** `src/lib/storage.ts` (`uploadFile`, `signedUrlFor`, `publicUrlFor`).
- Native deps added in v2: `expo-camera`, `expo-audio`, `react-native-svg`, `expo-linear-gradient`,
  `expo-asset` → **a new dev build is required**.
