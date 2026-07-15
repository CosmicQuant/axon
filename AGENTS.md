# AGENTS.md

High-signal notes for working in this repo. Verified against config and source, not docs.

## Stack

React 19 SPA + Vite 6 + TypeScript, Firebase (Auth/Firestore/Storage/Functions), Capacitor 8 (Android/iOS), Tailwind 3, react-router-dom 7, TanStack Query, Google Maps via `@react-google-maps/api`. Entry: `index.tsx` -> `App.tsx` (all routes defined here, most components lazy-loaded).

## Environment (required, both gitignored)

Two local env files are needed and neither is committed. A fresh clone will fail to boot without them:

- `.env` — Firebase web config: `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_STORAGE_BUCKET`, `VITE_FIREBASE_MESSAGING_SENDER_ID`, `VITE_FIREBASE_APP_ID`. Read by `firebase.ts`. The README does **not** mention this file.
- `.env.local` — `GEMINI_API_KEY`, `VITE_GOOGLE_MAPS_API_KEY`. Read by `config.ts`.

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
- Pricing source of truth is `VEHICLE_RATES` in `functions/index.js` (KES, server-side). Client pricing must match it.
- Contexts live in `context/` (Auth, Map, Chat, Prompt); booking flow in `components/booking/` (wizard + `BookingContext`). Services in `services/` wrap Firebase/Gemini/Maps.
- Capacitor `appId` is `com.axon.kenya`, `webDir: dist`. Native Google Auth client ID is hardcoded in `capacitor.config.ts` and `App.tsx`.

## Repo hygiene gotchas

The repo root contains many one-off scratch scripts (`fix_*.cjs/js/py`, `temp*.js`, `do_*.js`, `*.jsnode`, `build_log*.txt`, `errors*.txt`) and backup files (`*.bak`, `*-backup.tsx`). These are not part of the build or app. Do not treat them as authoritative or edit them as a way to fix the app — edit the real source under `components/`, `context/`, `services/`, `functions/`.
