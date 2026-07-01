# Nutrino — iOS Migration Architecture Decision Record

Nutrino is migrating from a React PWA to a **native iOS app built with OnSpace**
(an AI app builder that commits generated code in-place to whatever GitHub
repo/branch is active — it does not sandbox). This document records how the two
codebases and the shared backend are kept isolated so the native build cannot
contaminate the existing PWA or its live data.

## Repository layout

| Repo | Owns | Deploy | OnSpace? |
|------|------|--------|----------|
| `chrisrey001/nutrino` (this repo) | The **React PWA** | Netlify, auto-deploy from `main` | **Never.** OnSpace must not be pointed here. |
| `chrisrey001/nutrino-mobile` (the OnSpace-created repo) | The **native / React Native app** | Expo / OnSpace | Yes — OnSpace's active repo. |

> OnSpace auto-created its own repo (originally named
> `Nutrino-9biunc-20776-20260701`). Renaming it to `nutrino-mobile` is
> recommended for clarity; OnSpace stays connected through a GitHub rename.

### Why a separate repo (not a shared branch)
OnSpace's own written suggestion was to add a long-lived `native` branch inside
this repo. We rejected that:

- **Not a monorepo.** Real monorepos share **one branch, separate folders**
  (`apps/web`, `apps/mobile`) — not two permanently-divergent branches, which is
  a fork-in-place with no shared history and meaningless diffs.
- **A branch is a pointer, not a wall.** A stray `merge`/`checkout`, a PR opened
  against the wrong base, or OnSpace being mis-pointed at `main` would collide RN
  root configs (`package.json`, `babel.config.js`, `tsconfig.json`) across the
  whole tree — and the PWA auto-deploys from `main`, so a slip breaks the live
  site.

Separate repos make cross-contamination **physically impossible**.

### Guardrails on this repo
- Tag `pwa-v1` marks the pre-migration PWA baseline (rollback point).
- Recommended: enable branch protection on `main` (block force-push + direct
  pushes, require PRs).
- Confirm the Netlify site's production branch is pinned to `main`.

## Shared backend (Supabase)

Both apps use the **same** Supabase project `qiznldtchxpiihcuydzn` — this is
intentional. The native app must show the real meal history logged in the PWA,
so a migration means *same data, new UI*, not a fresh database.

The real contamination risk is not sharing data — it is **destructive schema
changes**. Guardrails:

1. **Back up before OnSpace writes** — export `profiles`, `meals`, `favorites`
   and note the `meal-photos` storage bucket.
2. **`migrations/` is the schema source of truth** (`001_initial_schema.sql`,
   `002_favorites.sql`). Review any OnSpace-proposed schema change before it hits
   prod. Use a Supabase branch for schema experiments if needed.
3. **Reuse the existing schema** in the native app: tables `profiles` / `meals`
   (`items jsonb`, `ai_raw_response jsonb`) / `favorites`, hardcoded
   `user_id 00000000-0000-0000-0000-000000000001`, public bucket `meal-photos`,
   open RLS (single-user, no auth).

## Notes for the native build (in `nutrino-mobile`, not here)

- Move the Gemini API key off web `localStorage` to secure device storage
  (Keychain / `expo-secure-store`).
- Portable core worth porting from this repo: `src/lib/utils.js` (macro/date/note
  math), `src/lib/gemini.js` (fetch-based Gemini calls), and the Supabase query
  bodies in `src/hooks/*.js`.
- Browser-coupled helpers that need native replacements: `compressImageFile`,
  `fileToBase64` (canvas/FileReader), and `src/lib/pdf.js` image loading +
  `navigator.share`.
