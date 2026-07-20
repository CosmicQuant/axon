# AGENTS.md

High-signal notes for working in this repo. Verified against config and source, not docs.

## Stack

React 19 SPA + Vite 6 + TypeScript, Firebase (Auth/Firestore/Storage/Functions), Capacitor 8 (Android/iOS), Tailwind 3, react-router-dom 7, TanStack Query, Google Maps via `@react-google-maps/api`. Entry: `index.tsx` -> `App.tsx` (all routes defined here, most components lazy-loaded).

## Environment (required, both gitignored)

Two local env files are needed and neither is committed. A fresh clone will fail to boot without them:

- `.env` — Firebase web config: `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_STORAGE_BUCKET`, `VITE_FIREBASE_MESSAGING_SENDER_ID`, `VITE_FIREBASE_APP_ID`. Read by `firebase.ts`. The README does **not** mention this file.
- `.env.local` — `GEMINI_API_KEY`, `VITE_GOOGLE_MAPS_API_KEY`, `VITE_FCM_VAPID_KEY` (Firebase web push VAPID public key from Console → Project settings → Cloud Messaging → Web Push certificates). Read by `config.ts` and `services/pushNotificationService.ts`. Without `VITE_FCM_VAPID_KEY`, FCM silently skips (no crashes) but push notifications won't work.

`vite.config.ts` also exposes `GEMINI_API_KEY` to client code as `process.env.API_KEY` / `process.env.GEMINI_API_KEY` via `define`. Firebase project is `axon-8b0a8` (functions in `us-central1`).

`.npmrc` sets `legacy-peer-deps=true` — keep it; Capacitor + React 19 peer deps conflict otherwise.

## Commands

- `npm run dev` — Vite dev server on port 3000, host `0.0.0.0`.
- `npm run build` — production build to `dist/`. `base: './'` is critical for Capacitor asset loading; do not change.
- `npm run build:apk` — full Android debug APK pipeline: `build` -> `cap sync` -> `tools/fix_cordova.cjs` (downgrades Cordova plugin `JavaVersion.VERSION_21` -> `17`) -> `gradlew assembleDebug`. Requires JDK 17 (bundled at `tools/jdk-17.0.9+8`).
- `npm run deploy:preview` / `deploy:live` — Firebase Hosting deploy (live deploys hosting only). Functions deploy separately from `functions/` (`npm run deploy` there, Node 20).

No `lint`, `test`, or `typecheck` scripts exist. No ESLint/Prettier/CI config. To typecheck manually: `npx tsc --noEmit` (tsconfig already sets `noEmit`). There is no test framework.

## Architecture notes

- Path alias `@/*` -> repo root (configured in both `tsconfig.json` and `vite.config.ts`). Code mostly uses relative imports anyway.
- `config.ts` `USE_MOCK_BACKEND` toggles simulated M-Pesa vs real STK Push via Firebase Functions.
- Firestore is initialized with `experimentalForceLongPolling: true` (`firebase.ts`) — do not remove without testing on the target network.
- Pricing source of truth is `functions/lib/pricing.js` (`VEHICLE_RATES`, `computePrice`, KES, server-side). There is intentionally **no client-side pricing table** — `services/orderApi.ts` `calculateQuote` is the only quote path.
- Contexts live in `context/` (Auth, Map, Chat, Prompt); booking flow in `components/booking/` (wizard + `BookingContext`). Services in `services/` wrap Firebase/Gemini/Maps.
- Capacitor `appId` is `com.axon.kenya`, `webDir: dist`. Native Google Auth client ID is hardcoded in `capacitor.config.ts` and `App.tsx`.

## Order lifecycle (server-authoritative)

- **Cloud Functions are the only authority for order mutations.** All client order mutations go through `services/orderApi.ts` (typed CF wrappers, no Firestore fallbacks). Do not add client-side `updateDoc` paths to orders outside the Firestore-rules allowlist.
- Status machine (forward-only, driver-only, in `functions/lib/orders.js`): `driver_assigned → arriving_pickup → in_transit → delivered`. Side transitions each have a single authority: `cancelOrder` (pre-transit only), `raiseDispute` (in_transit/delivered), `submitReview` (delivered → reviewed), `expirePendingOrders` (pending → expired, 1-min cron).
- **Orders are locked once a driver accepts.** Customers can edit route/package/receiver/vehicle only while `status === 'pending'`; after acceptance the only options are cancel or dispute. The old `proposeOrderEdit`/`respondToEdit` CFs and price-adjustment payment flow were removed (pendingEdit type is deprecated, kept for historical docs).
- **Delivery verification codes live in `orders/{id}/private/codes`** (Firestore rules: customer-only read/write; drivers cannot read them). `verifyDeliveryCode` CF checks the PIN server-side. `createOrder` strips codes from the public doc automatically. Legacy orders still carry codes on the main doc — all readers fall back gracefully.
- Firestore rules (`firestore.rules`) use a **field allowlist** for order updates: customer draft edits (pending only), driver self-assign (pending only), driver telemetry (`driverLocation`/`stops`/route fields only). Everything else is CF-only.
- Cloud Functions are split into `functions/lib/`: `admin.js` (shared init), `pricing.js` (rates + geo + Routes API), `notifications.js` (FCM + stale-token pruning), `quotes.js`, `orders.js`, `reviews.js`, `disputes.js`, `tokens.js`, `scheduled.js`. `functions/index.js` only wires exports — export names are deployed endpoints, do not rename. `functions/v1/api.js` is the separate business API (API-key auth).
- Push notifications: FCM tokens registered via `registerFcmToken` CF (called from `AuthContext` after login); stale tokens pruned automatically on send failures.

## Repo hygiene gotchas

The repo root contains many one-off scratch scripts (`fix_*.cjs/js/py`, `temp*.js`, `do_*.js`, `*.jsnode`, `build_log*.txt`, `errors*.txt`) and backup files (`*.bak`, `*-backup.tsx`). These are not part of the build or app. Do not treat them as authoritative or edit them as a way to fix the app — edit the real source under `components/`, `context/`, `services/`, `functions/`.
