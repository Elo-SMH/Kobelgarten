import { squirrelSchema, type Squirrel } from "../engine/schemas";

/**
 * Die drei Spieler-Eichhörnchen (PLAN 2.6). Bonus als Daten: jeder wirkt über
 * einen Multiplikator-Stat der Skill-Pipeline (engine/skills.ts) — ein neues
 * Eichhörnchen = ein Eintrag hier + Beschreibung in de.json, null
 * Engine-Änderungen.
 *
 * - Hasel (rot):  +5 % Verkaufspreis
 * - Fips (grau):  +5 % Wachstum
 * - Nuka (schwarz): +10 % Variegations-Chancen (das „grüne Pfötchen“ des
 *   Züchters; PLAN nennt es Mini-Mutationsbonus)
 */
const rawSquirrels: Squirrel[] = [
  {
    id: "hasel",
    name: "Hasel",
    emoji: "🐿️",
    color: "#c1440e",
    bonus: { stat: "sellPriceFactor", value: 1.05 },
  },
  {
    id: "fips",
    name: "Fips",
    emoji: "🐿️",
    color: "#9a9a9a",
    bonus: { stat: "growthFactor", value: 1.05 },
  },
  {
    id: "nuka",
    name: "Nuka",
    emoji: "🐿️",
    color: "#3a3a3a",
    bonus: { stat: "mutationChanceFactor", value: 1.1 },
  },
];

export const allSquirrels: Squirrel[] = rawSquirrels.map((squirrel) =>
  squirrelSchema.parse(squirrel),
);

export const squirrelById: Record<string, Squirrel> = Object.fromEntries(
  allSquirrels.map((squirrel) => [squirrel.id, squirrel]),
);
