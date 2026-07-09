# CLAUDE.md — Nutrino

## What is this project?
A mobile-first PWA for personal food logging. User photographs meals, Gemini 3.5 Flash estimates calories/macros, data is stored in Supabase, and weekly PDF reports are generated for a dietician.

## Tech stack
- **Frontend:** React 18 + Vite + Tailwind CSS
- **Backend:** Supabase (Postgres + Storage) — project ID: `qiznldtchxpiihcuydzn`
- **AI:** Google Gemini 3.5 Flash (free tier, vision API)
- **PDF:** html2pdf.js (client-side generation)
- **Hosting:** Netlify (auto-deploy from GitHub main branch)

## Architecture rules
- Single-user personal app. Hardcoded user_id: `00000000-0000-0000-0000-000000000001`
- Gemini API key stored in localStorage, entered by user in Settings
- Supabase credentials in VITE_ env vars (.env file, not committed)
- All data writes go through Supabase JS client
- Images upload to Supabase Storage bucket `meal-photos` as public files
- PDF generation is client-side only

## Key files
- `src/lib/supabase.js` — Supabase client
- `src/lib/gemini.js` — Gemini API call + JSON parsing
- `src/lib/pdf.js` — full weekly PDF generation
- `src/lib/utils.js` — HARDCODED_USER_ID, MEAL_TYPES, sumMacros, date helpers, analysis text generation
- `src/hooks/useProfile.js` — fetch/save the single profiles row
- `src/hooks/useMeals.js` — fetch meals for a date; useMealsRange for a week
- `src/pages/` — Dashboard, LogMeal, WeekView, DayDetail, Settings
- `src/components/` — Layout, NavBar, MealCard, MacroBar

## Netlify setup
1. Connect `chrisrey001/nutrino` repo in Netlify dashboard
2. Build command: `npm run build` | Publish dir: `dist`
3. Set env vars: `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`

## Code style
- Functional components + hooks only
- Tailwind utility classes only (no CSS modules)
- Async/await for all API calls
- Error states handled at component level with try/catch
- Components under 150 lines; extract hooks to src/hooks/ if needed
