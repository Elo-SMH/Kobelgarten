import { squirrelSchema, type Squirrel } from "../engine/schemas";

/**
 * Die drei Spieler-Eichhörnchen (PLAN 2.6). Bonus als Daten: jeder wirkt über
 * einen Multiplikator-Stat der Skill-Pipeline (engine/skills.ts) — ein neues
 * Eichhörnchen = ein Eintrag hier + Beschreibung in de.json, null
 * Engine-Änderungen.
 *
 * - Hasel (rot):  10 % Chance auf doppelten Verkaufserlös
 * - Fips (grau):  10 % Chance, dass ein Steckling kein Wachstum kostet
 * - Nuka (schwarz): +10 % Variegations-Chancen (das „grüne Pfötchen“ des
 *   Züchters; PLAN nennt es Mini-Mutationsbonus)
 */
const rawSquirrels: Squirrel[] = [
  {
    id: "hasel",
    name: "Hasel",
    emoji: "🐿️",
    color: "#c1440e",
    bonus: { kind: "doubleSaleChance", chance: 0.1 },
  },
  {
    id: "fips",
    name: "Fips",
    emoji: "🐿️",
    color: "#9a9a9a",
    bonus: { kind: "freeCuttingChance", chance: 0.1 },
  },
  {
    id: "nuka",
    name: "Nuka",
    emoji: "🐿️",
    color: "#3a3a3a",
    bonus: { kind: "modifier", stat: "mutationChanceFactor", value: 1.1 },
  },
];

export const allSquirrels: Squirrel[] = rawSquirrels.map((squirrel) =>
  squirrelSchema.parse(squirrel),
);

export const squirrelById: Record<string, Squirrel> = Object.fromEntries(
  allSquirrels.map((squirrel) => [squirrel.id, squirrel]),
);
