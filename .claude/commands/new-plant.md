Add a new plant species to the game: $ARGUMENTS

Follow these steps exactly:
1. Read `src/engine/schemas.ts` (PlantSpecies schema) and one existing file in `src/content/plants/` as a reference.
2. Create `src/content/plants/<id>.ts` with sensible, balanced values. Compare basePrice/growthTicks/mutability against the table in PLAN.md section 2.8 so the new species fits the existing economy curve (price roughly proportional to growth time and risk).
3. Register the species in `src/content/plants/index.ts`.
4. Add the German display name and codex description to `src/i18n/de.json`.
5. If the species needs a new `leafShape`, extend the SVG renderer in `src/ui/components/PlantSVG.tsx` minimally.
6. Run `npm run test` — the content contract test must pass.
7. Briefly state the balancing rationale (why this price/growth/mutability).

Do NOT add species-specific if/else logic anywhere in `src/engine/`.
