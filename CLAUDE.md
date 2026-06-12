# CLAUDE.md — Kobelgarten

Cozy browser game about breeding houseplants, played by squirrels. German UI. No backend, no real-money purchases, deployed for free on GitHub Pages.

## Commands
- `npm run dev` — Vite dev server
- `npm run build` — production build (must pass before any commit)
- `npm run test` — Vitest (run after every change to `src/engine/` or `src/content/`)
- `npm run lint` — ESLint + tsc --noEmit

## Architecture rules (non-negotiable)
1. **`src/engine/` is pure TypeScript.** No React, no DOM, no Date.now()/Math.random() calls inside engine functions — time and RNG are always passed in as parameters (`tick: number`, `rng: Rng`). This keeps the whole game logic unit-testable and deterministic.
2. **`src/content/` is data, not behavior.** New plants/items/skills are added as data files validated by zod schemas in `src/engine/schemas.ts`. Never hardcode species-specific logic in the engine; use data fields (e.g. `mutability`, `crossGroup`) instead.
3. **UI (`src/ui/`) never mutates state directly.** It dispatches actions on the Zustand store; the store calls engine functions.
4. **Saves are versioned.** Any change to the save shape requires bumping `SAVE_VERSION` and adding a migration in `src/state/migrations.ts`. Never break existing saves.
5. **Seeded RNG only** (`src/engine/rng.ts`, mulberry32). Daily shop offers derive their seed from the calendar date.

## Game-design invariants
- Currency is Haselnüsse (🌰). There is NO real-money system — never add payment code, ads, or tracking.
- Variegation odds, prices and growth constants live in `src/content/config.ts` — tune there, never inline magic numbers.
- Plant value formula: `basePrice × sizeFactor × (1 + coverage × typeMultiplier × 8)`.
- Offline progress is capped at 48h of ticks (1 tick = 1 real minute).

## Conventions
- TypeScript strict mode; no `any`. Prefer discriminated unions for game events.
- Components: function components, props typed, one component per file.
- All user-facing strings go through `src/i18n/de.json` (key-based, English keys).
- Tailwind for styling; shared design tokens in `tailwind.config.js` (warm/cozy palette: greens, cream, hazel brown).
- Tests: every engine module gets a `.test.ts` neighbor. The content contract test (`src/content/content.test.ts`) must validate ALL plant/item files against the zod schemas.
- Commits: conventional commits (`feat:`, `fix:`, `balance:`, `content:`).

## Definition of Done for any task
1. `npm run lint && npm run test && npm run build` all pass
2. New engine logic has tests (happy path + 1 edge case minimum)
3. New content validates against schemas
4. Save compatibility preserved or migration added
