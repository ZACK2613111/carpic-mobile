# 🚗 CarStudio

A CarCutter-style **automotive photo studio** for mobile. Shoot or import a car photo →
**remove the background on-device (offline, free)** → drop it on a **transparent cutout or a
branded studio background** → add **interactive marketing / inspection hotspots** →
**export & share**. Projects sync to your account across devices.

Built with **Expo SDK 57 + React Native + TypeScript**.

> 📖 **New here? Start with the full step-by-step guide:** [docs/GETTING_STARTED.md](docs/GETTING_STARTED.md)
> — from creating the Supabase account to running the app on your phone.
> 🗺️ **Planning to deploy?** See the [production & scaling roadmap](docs/ROADMAP.md).

---

## Features

A car = a **project** made of many guided shots + a 360° spin, published as a shareable link.

- 🧭 **Guided multi-shot capture** — an in-app camera walks a dealership shot list with per-angle
  "stand here" overlays, progress, retake & auto-advance:
  - **Exterior** (8 walk-around angles) · **Wheels ×4** · **Interior** (dashboard, cluster,
    boîte de vitesse, sièges, coffre, infotainment, odometer) · **Documents** (VIN, carte grise, keys)
    · **Engine** (photo **+ engine-sound recording** 🔊)
- 🔄 **360° spin** — capture ~24 frames, remove the background on all of them, drag to rotate,
  and pin **hotspots to specific angles**
- ✂️ **On-device background removal** — offline, no per-image cost (iOS 17+ Vision · Android ML Kit)
- 🎨 **Backgrounds** — transparent cutout, colors, gradients, procedural **studio/showroom** scenes
- 📍 **Hotspots** — ✨ Marketing callouts + 🔧 Inspection points (with severity); pinch-zoom, drag, nudge
- 🔗 **Shareable web link** — publish a project to an interactive page (360 + gallery + hotspots +
  engine sound) that your client forwards to the buyer; opens in any browser
- ⬆️ **Export** flattened per-shot images (share sheet / save to Photos)
- ☁️ **Accounts + cloud sync** via Supabase (per-user, Row-Level-Security protected)

---

## Tech stack

| Concern | Package |
|---|---|
| Framework | `expo` (SDK 57), `react-native` 0.86, `expo-router` |
| Background removal | `@six33/react-native-bg-removal` (swappable — see below) |
| Compositing + export | `@shopify/react-native-skia` |
| Gestures / animation | `react-native-gesture-handler`, `react-native-reanimated` |
| Backend | `@supabase/supabase-js` (auth, Postgres, Storage) |
| Server state | `@tanstack/react-query` + `react-query-persist-client` (offline cache → instant loads) |
| Editor state | `zustand` (with undo/redo history) |
| UI / icons / feedback | `react-native-svg` (icons), `expo-linear-gradient`, `expo-haptics` |
| Media | `expo-image`, `expo-image-picker`, `expo-image-manipulator`, `expo-file-system`, `expo-media-library`, `expo-sharing` |

**Design & UX:** a small in-house design system (`src/theme.ts` + `src/components/*`) — typed `Text`,
SVG `Icon` set, animated `Button`/`PressableScale`, `SegmentedControl`, `Skeleton` loaders, `Toast`,
`BottomSheet`, haptic feedback, and reanimated transitions throughout.

**Editor precision:** pinch-to-zoom + two-finger pan for precise placement, drag or nudge-arrow
hotspots, alignment crosshair, undo/redo, first-run coach marks, and a live cut-out progress overlay.

> ⚠️ **This app uses native modules, so it does not run in Expo Go.** You need a
> **development build** (`expo-dev-client`). See *Running the app*.

---

## 1. Install

```bash
npm install
```

Node ≥ 20.19.4 is required (Expo SDK 57).

## 2. Configure Supabase

1. Create a free project at [supabase.com](https://supabase.com).
2. Open the **SQL Editor** and run **both** files in order:
   - [`supabase/schema.sql`](supabase/schema.sql) — `profiles`, `projects`, `custom_backgrounds` +
     the private `projects` Storage bucket, all with RLS.
   - [`supabase/schema_v2.sql`](supabase/schema_v2.sql) — the `shots` table, the `projects` spin/
     status/publish columns, and the **public `published` bucket** that backs shareable links.
3. In **Project Settings → API**, copy your **Project URL** and **publishable key**.
4. Create your env file:

   ```bash
   cp .env.example .env
   ```

   ```env
   EXPO_PUBLIC_SUPABASE_URL=https://YOUR-PROJECT-REF.supabase.co
   EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_xxxxxxxx
   ```

   > These `EXPO_PUBLIC_*` values are inlined into the app bundle. The publishable key is safe
   > to ship — RLS is what protects your data. **Never put the service_role key in the app.**

   *(Optional)* For testing without friction, disable "Confirm email" under
   **Authentication → Providers → Email**.

## 3. Running the app (development build)

You need a **dev build** on a real device. From Windows (no Mac needed) the easiest path is
**EAS cloud builds**.

```bash
npm install --global eas-cli
eas login                      # free Expo account
eas build:configure            # eas.json is already committed; this links the project
```

### Android (free, recommended first)

```bash
eas build --profile development --platform android
```

EAS builds an **APK** in the cloud and gives you a QR/link. Install it on any Android phone
(allow "install from unknown sources"). Then start the bundler:

```bash
npx expo start --dev-client
```

Open the installed **CarStudio** dev build (not Expo Go) and it connects to Metro.

### iOS (needs a paid Apple Developer account — $99/yr)

```bash
eas device:create      # register your iPhone's UDID (opens a profile to install on the phone)
eas build --profile development --platform ios
```

Install via the build's QR code, then `npx expo start --dev-client`.

> If you have Android Studio / Xcode installed locally you can instead run
> `npx expo run:android` / `npx expo run:ios` to build on your machine.

---

## On-device background removal — important notes

- **iOS:** requires **iOS 17+** and a **real device**. The iOS *simulator* returns the original
  image unchanged (Apple Vision limitation). The iOS deployment target is pinned to 17.0 in
  `app.json` via `expo-build-properties`.
- **Android:** ML Kit's Subject Segmentation model downloads **once** via Google Play Services,
  then works fully offline. The custom config plugin
  [`plugins/withMlKitSubjectSegmentation.js`](plugins/withMlKitSubjectSegmentation.js) declares an
  install-time download so it also works offline on a fresh device.
- Native permission changes (camera / photos / this plugin) only take effect in a **new build**,
  never via an OTA update.

---

## Project structure

```
src/
├── app/                         # expo-router routes (file-based)
│   ├── _layout.tsx              # providers (Query, Auth, Gesture root) + root Stack
│   ├── (auth)/                  # sign-in / sign-up (+ guard)
│   ├── (tabs)/                  # Projects gallery + Settings (guarded)
│   ├── new.tsx                  # pick/capture → create project → open editor
│   └── editor/[id].tsx          # THE studio editor
├── features/
│   ├── background-removal/      # swappable engine interface + engines + hook
│   ├── editor/                  # StudioCanvas (Skia), backgrounds, export, hotspot sheet, store
│   └── projects/               # Supabase CRUD + Storage + React Query hooks + types
├── providers/AuthProvider.tsx
├── lib/                         # supabase client, query client, env
├── components/                  # Button, TextField, ScreenContainer, Checkerboard, ConfigNotice
└── theme.ts                     # design tokens
plugins/withMlKitSubjectSegmentation.js   # Android ML Kit install-time model download
supabase/schema.sql                       # run this in the Supabase SQL editor
```

Data model: each **project** row stores its hotspots + layout in a `doc` JSONB column; the
original photo, cutout PNG, export, and thumbnail live in the private `projects` Storage bucket
under `<user_id>/<project_id>/…`.

---

## Swapping the background-removal engine

The app talks to a single `BgRemovalEngine` interface
([`src/features/background-removal/types.ts`](src/features/background-removal/types.ts)); the active
engine is chosen in [`registry.ts`](src/features/background-removal/registry.ts).

The bundled fallback is **`react-native-executorch`** (a DeepLabV3 model whose classes include
`car`), left uninstalled to keep the build lean. To enable it:

```bash
npx expo install react-native-executorch
```

then implement `removeBackground()` in
[`engines/executorchEngine.ts`](src/features/background-removal/engines/executorchEngine.ts) and point
`activeEngine` at it. A cloud engine (e.g. Photoroom/CarCutter) could be added behind the same
interface later.

---

## Offline & sync

Reads are cached by React Query and mutations retry on reconnect (the pragmatic offline story).
Supabase has no built-in offline write sync; for a full local-first experience, **PowerSync**
(paid) or **WatermelonDB** (free, DIY) can be layered on later — both need a dev build.

---

## Troubleshooting

| Symptom | Fix |
|---|---|
| "Supabase not configured" banner | Fill in `.env` and rebuild the dev client |
| Cut-out returns the original image | You're on an iOS simulator — use a real device |
| `REQUIRES_API_FALLBACK` error | iOS device is < 17 — on-device cutout needs iOS 17+ |
| Cut-out does nothing on a fresh Android phone offline | ML Kit model still downloading; connect once |
| Gestures do nothing | App root must be wrapped in `GestureHandlerRootView` (it is, in `_layout.tsx`) |
| Crash on launch after config change | Config-plugin/permission changes require a **new native build** |

---

## Scripts

```bash
npm start            # metro bundler (use --dev-client for the dev build)
npm run android      # expo start --android
npm run ios          # expo start --ios (Mac)
npm run lint         # eslint
npx tsc --noEmit     # typecheck
npx expo-doctor      # validate config + deps
```
