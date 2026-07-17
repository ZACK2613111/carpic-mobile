# 🚀 CarStudio — Getting Started (zero → running)

This guide takes you from **nothing** to the app **running on a real phone**, step by step.
No prior React Native experience assumed.

> **Why not just `npm run dev`?** CarStudio uses **native modules** (camera, on-device background
> removal, audio). Those cannot run in the "Expo Go" sandbox — you need a **development build**
> (a custom build of the app installed on a device). Once that's installed, the day-to-day command is
> `npx expo start --dev-client`. This guide walks you through building it (once), the easy way (in the
> cloud, no Android Studio / Xcode needed).

**Time:** ~30–45 min the first time (most of it is the cloud build running).
**You will need:** a computer, a **real phone** (Android is easiest & free), and internet.

---

## Overview of the steps
1. Install the base tools (Node, Git)
2. Get the code & install dependencies
3. Create a **Supabase** project (database + storage + auth) and run the SQL
4. Put your Supabase keys in `.env`
5. Create a free **Expo** account & install the EAS CLI
6. Build a **development build** (Android APK in the cloud) and install it on your phone
7. Start the dev server and open the app
8. First-run walkthrough (create a car → capture → 360 → publish link)

---

## 0. Prerequisites (install once)

| Tool | Why | Get it |
|---|---|---|
| **Node.js ≥ 20.19.4** (LTS) | runs the tooling | https://nodejs.org (LTS installer) |
| **Git** | get/manage the code | https://git-scm.com |
| A **real phone** | camera + on-device ML need a real device | Android = free path · iPhone = needs a paid Apple account (see §6b) |

Check they're installed (any terminal — PowerShell or Git Bash):
```bash
node --version   # should print v20.19.4 or higher
git --version
```

> The camera + background removal **do not work in an emulator/simulator** (the iOS simulator returns
> the photo unchanged; there's no real camera). Use a **physical phone**.

---

## 1. Get the code & install dependencies

```bash
cd C:/Users/b.zakaria/Documents/Work/car-studio
npm install
```
This installs everything in `package.json` (takes a couple of minutes).

Sanity-check the project is healthy:
```bash
npx tsc --noEmit      # typecheck — should print nothing / no errors
npx expo-doctor       # should say "20/20 checks passed"
```

---

## 2. Create your Supabase project

Supabase is the backend: **auth** (accounts), **Postgres** (your data), and **Storage** (the photos).

1. Go to **https://supabase.com** → **Sign up** (GitHub or email) — free tier is fine.
2. Click **New project**.
   - **Name:** `carstudio`
   - **Database password:** generate one and save it somewhere (you won't need it in the app).
   - **Region:** pick the one closest to you (e.g. *West EU (Paris)*).
   - Click **Create new project** and wait ~2 min for it to provision.
3. In the left sidebar open **SQL Editor** → **+ New query**. Run **all three** files, in order:
   - Open [`supabase/schema.sql`](../supabase/schema.sql) from this repo, copy all of it, paste, click **Run**.
   - Open [`supabase/schema_v2.sql`](../supabase/schema_v2.sql), copy all, paste into a new query, click **Run**.
   - Open [`supabase/schema_v3.sql`](../supabase/schema_v3.sql), copy all, paste into a new query, click **Run**.

   Together these create the tables (`profiles`, `projects`, `shots`, `custom_backgrounds`), the private
   `projects` storage bucket, and the public `published` + `viewer` buckets for shareable links — all with
   Row-Level Security so each user only sees their own data.
4. **One-time viewer upload** (needed for the Publish feature): in the sidebar open
   **Storage** → **viewer** → **Upload file**, and upload [`web/viewer.html`](../web/viewer.html) from
   this repo to the bucket **root**. The app deliberately can't upload it for you — clients are only
   allowed to write JSON manifests, so nobody can host arbitrary HTML on your Supabase domain.
5. **(Recommended for testing)** Turn off email confirmation so you can sign in immediately:
   **Authentication → Sign In / Providers → Email** → toggle **Confirm email** *off* → Save.
   (Turn it back on before going live.)
6. Get your two keys: **Project Settings → API**
   - copy the **Project URL** (looks like `https://abcd1234.supabase.co`)
   - copy the **publishable key** (a long string; in some dashboards it's labelled "anon/public").

---

## 3. Configure the app (`.env`)

In the project folder, create a file named **`.env`** (copy the example):

```bash
cp .env.example .env
```

Open `.env` and paste your two values:
```env
EXPO_PUBLIC_SUPABASE_URL=https://YOUR-PROJECT-REF.supabase.co
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_xxxxxxxxxxxxxxxx
```
Save. (These `EXPO_PUBLIC_*` values are safe in a client app — Row-Level Security protects the data.
**Never** put the `service_role` secret key here.)

---

## 4. Create an Expo account + install EAS CLI

EAS = Expo Application Services — it builds the app **in the cloud** so you don't need Android Studio / Xcode.

1. Create a free account at **https://expo.dev/signup**.
2. Install the CLI and log in:
   ```bash
   npm install --global eas-cli
   eas login
   ```
3. Link the project (creates/uses `eas.json`, already in the repo):
   ```bash
   eas build:configure
   ```
   Choose **All** (or Android) when asked which platforms.

---

## 5. Build the app & install it on your phone

### 5a. Android (recommended — free, ~10–15 min)
```bash
eas build --profile development --platform android
```
- It uploads the project and builds in the cloud. When done it prints a **URL / QR code**.
- On your **Android phone**, open that link and download the **APK**, then install it
  (you'll have to allow "install from unknown sources" once).
- You now have a **CarStudio** app icon on your phone (this is your dev build).

### 5b. iPhone (optional — needs a paid Apple Developer account, $99/yr)
```bash
eas device:create        # follow the link on the iPhone to register it (one time)
eas build --profile development --platform ios
```
- Scan the resulting QR with the iPhone camera to install.
- There is **no free way** to run a custom build on a physical iPhone — Apple requires the paid account.
  (Start with Android to try everything for free.)

> You only rebuild (step 5) when you **add/change a native module** or app permissions. Day-to-day JS
> changes are instant via step 6.

---

## 6. Run the dev server & open the app

Back on your computer:
```bash
npx expo start --dev-client
```
- A QR code appears in the terminal.
- Open the **CarStudio** dev build on your phone (the one you installed in step 5 — **not** "Expo Go").
- It connects to your computer and loads the app. Edit any file → it hot-reloads instantly.

> Phone and computer must be on the **same Wi-Fi**. If it won't connect, run
> `npx expo start --dev-client --tunnel`.

---

## 7. First-run walkthrough (what to click)

1. **Sign up** with any email + password (email confirmation is off if you did step 2.4).
2. Tap **＋** → **New car** → give it a name → **Create & capture**.
3. **Guided capture:** the camera walks you through Exterior → Wheels → Interior → Docs → Engine, with a
   "stand here" guide for each angle. Shoot → **Use photo** (or **Retake**) → it auto-advances. Tap **Skip**
   to jump any shot; **✕** to stop early.
4. On the **dashboard**, tap any captured shot to open the **editor** → **Cut out** (removes the
   background on-device) → pick a **background** → tap the photo to drop **hotspots** (pinch to zoom for
   precision) → **Export** to share/save.
5. Tap **360° spin** → **Capture 360°** → walk around the car shooting ~24 frames → **Cut out 360°** →
   drag to rotate, add hotspots.
6. On the **Engine** shot, tap **Record engine sound** 🔊.
7. Back on the dashboard → **Publish link** → the share sheet opens with a URL. Open that URL in any
   **web browser** (even on a desktop) — you'll see the interactive 360 + gallery + hotspots + engine sound.
   That's the link your client forwards to the buyer.

---

## Command cheat-sheet
```bash
npm install                         # install deps
npx expo start --dev-client         # run the app (the "dev" command)
eas build -p android --profile development   # (re)build the Android dev app
npx tsc --noEmit                    # typecheck
npm run lint                        # lint
npx expo-doctor                     # verify config & native deps
```

---

## Troubleshooting

| Problem | Fix |
|---|---|
| App shows **"Supabase not configured"** | `.env` is missing/empty or you didn't rebuild after adding it. Fill `.env`, then restart `npx expo start --dev-client` (JS-only) — no native rebuild needed for env. |
| **Cut out** returns the original photo | You're on an iOS **simulator** or the photo has no clear subject — use a real device and a clear car photo. |
| `REQUIRES_API_FALLBACK` error | The iPhone is older than iOS 17 — on-device cutout needs iOS 17+ (Android is fine via ML Kit). |
| Android cut-out does nothing on a brand-new phone with no internet | ML Kit downloads its model once via Play Services — connect to the internet once, then it's offline. |
| Phone can't connect to Metro | Same Wi-Fi, or use `npx expo start --dev-client --tunnel`. |
| Can't sign in / "email not confirmed" | Turn off **Confirm email** in Supabase (step 2.4), or confirm via the email. |
| Publish link shows "Could not load" | Make sure `schema_v2.sql` **and** `schema_v3.sql` ran (they create the public `published`/`viewer` buckets). |
| Publish fails with "Web viewer not installed" | Upload `web/viewer.html` to the root of the `viewer` bucket (one-time step — see section 2). |
| Build fails on EAS | Run `npx expo-doctor` and `eas build --profile development -p android` again; check the build logs link EAS prints. |

---

## FAQ
- **Do I need a Mac?** No, for Android. iOS builds run on Apple's cloud but require a paid Apple account.
- **Do I need Android Studio / Xcode?** No — EAS builds in the cloud.
- **Why a real phone?** Camera + on-device ML don't exist in emulators.
- **Is the publish link private?** It's public-but-unguessable (a random project id). Anyone with the link
  can view it — that's the point (you send it to a client). Don't post it publicly.
