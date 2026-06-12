Run an economy balance check: $ARGUMENTS

1. Run the headless simulation script (`npm run sim` — if it doesn't exist yet, create `scripts/simulate.ts` that plays N=200 simulated hours using only engine functions with a seeded RNG: buy cheapest seed → care optimally → propagate → sell adults).
2. Report: hazelnut balance over time, time-to-first-variegation (median), time until the player can afford each species tier, and income per hour at early/mid/late game.
3. Flag anything outside these targets: first variegation within 1–3 play hours; Monstera affordable after ~2 hours; no exponential runaway income before the skill trees are maxed.
4. Propose concrete constant changes in `src/content/config.ts` (as a diff), but do NOT apply them without confirmation.
