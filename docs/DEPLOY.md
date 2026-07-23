# Getting CarStudio onto a real device (Android APK / iPhone)

The GitHub side is done: code is on `main`, green (tsc + lint + 137 tests), EAS
profiles + app identity are set. What's left to actually install the app is
account setup + a build — steps that need your credentials, so they're yours to
run. Here is the exact, honest path.

## Prerequisites (in order — don't skip #2)
1. **EAS CLI + account** (free): `npm i -g eas-cli`, then `eas login`.
2. **Supabase project + `.env`** — *without this the installed app is a shell*
   (it stops at sign-in and shows "not configured"). This is "Jour 1":
   - Create the project at supabase.com.
   - SQL editor: run `supabase/schema.sql` → `schema_v2` → `v3` → `v4` → `v5` →
     `schema_v6.sql`, in order.
   - Create the storage buckets: `projects` (private), `published` (public read),
     `viewer` (public). Upload `web/viewer.html` + `web/capture.html` into `viewer`.
   - Deploy the Edge Functions:
     `supabase functions deploy capture-manifest --no-verify-jwt`,
     `capture-upload --no-verify-jwt`, and `delete-account` (WITH jwt — default).
   - Copy `.env.example` to `.env`, fill `EXPO_PUBLIC_SUPABASE_URL` +
     `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
   - Then verify the backend end-to-end: `npm run smoke`.
3. **iOS only:** an **Apple Developer account ($99/year)**.

## Android — simplest, free, and it's your launch platform (recommended)
No store, no fee, no Mac:
```bash
eas build -p android --profile preview
```
EAS builds an **APK** in the cloud and returns a URL / QR. Open it on the Android,
allow "install unknown apps", install. That's it — a real on-device test.
Rebuild after native changes (new deps, splash/icon, `app.json`); JS-only tweaks
can later ship over-the-air with `eas update` if you wire a channel.

## iPhone — works, but needs the Apple account
EAS builds iOS **in the cloud (no Mac needed)**. Two install routes:
- **Ad-hoc / internal (fastest):**
  ```bash
  eas build -p ios --profile preview
  ```
  The first time, EAS registers your iPhone (UDID) and returns an install URL/QR
  → install directly on the device.
- **TestFlight (better for sharing):**
  ```bash
  eas build -p ios --profile production
  eas submit -p ios
  ```
  Then install the app from TestFlight on the iPhone.
- EAS manages the signing certificate/profile interactively. The on-device
  cut-out uses iOS 17+ native subject segmentation — test on **iOS 17+**.

## What I can / can't do here
- **Done by me:** all the code, the merges to `main`, the EAS build profiles, the
  app config (bundle id `com.autodeclic.carstudio`, versions), and this guide.
- **Yours (credentials/payment/interactive):** creating the EAS / Supabase /
  Apple accounts, and running `eas login` + `eas build` (they prompt for your
  logins and signing). I'll walk you through each command when you're ready.

## My recommendation for you
Given Algeria + Android-first + cost: **test via the free Android APK** once you
have the Android phone and Supabase set up — it's the simplest real-device test
and it's your launch platform. Add the iPhone/TestFlight later, when the $99
Apple account is worth it.
