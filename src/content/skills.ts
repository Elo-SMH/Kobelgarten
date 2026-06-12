import { talentSchema, type Talent, type TalentTree } from "../engine/schemas";

/**
 * Die 3 Talentbäume (PLAN 2.4) als Daten, kein Verhalten: jedes Talent wirkt
 * über einen Modifikator-Stat der Skill-Pipeline (engine/skills.ts). Ein
 * neues Talent = ein Eintrag hier + Beschreibung in de.json — null
 * Engine-Änderungen.
 */
const rawTalents: Talent[] = [
  // 🌱 Gärtner
  {
    id: "gruener-daumen",
    tree: "gaertner",
    tier: 1,
    name: "Grüner Daumen",
    emoji: "🌱",
    maxRank: 3,
    effect: { kind: "multiply", stat: "growthFactor", value: 1.08 },
  },
  {
    id: "grosser-tank",
    tree: "gaertner",
    tier: 1,
    name: "Großer Tank",
    emoji: "🫗",
    maxRank: 2,
    effect: { kind: "add", stat: "waterTankBonus", value: 0.25 },
  },
  {
    id: "zaehe-blaetter",
    tree: "gaertner",
    tier: 2,
    name: "Zähe Blätter",
    emoji: "🍃",
    maxRank: 2,
    effect: { kind: "multiply", stat: "wiltFactor", value: 0.75 },
  },
  {
    id: "duenger-profi",
    tree: "gaertner",
    tier: 2,
    name: "Dünger-Profi",
    emoji: "🧪",
    maxRank: 2,
    effect: { kind: "multiply", stat: "fertilizerDurationFactor", value: 1.3 },
  },
  {
    id: "auto-giessen",
    tree: "gaertner",
    tier: 3,
    name: "Auto-Gießen",
    emoji: "💧",
    maxRank: 1,
    effect: { kind: "enable", stat: "autoWater" },
  },
  {
    id: "welke-schutz",
    tree: "gaertner",
    tier: 3,
    name: "Welke-Schutz",
    emoji: "🛡️",
    maxRank: 1,
    effect: { kind: "multiply", stat: "wiltFactor", value: 0.5 },
  },

  // 🧬 Züchter
  {
    id: "mutationsfreude",
    tree: "zuechter",
    tier: 1,
    name: "Mutationsfreude",
    emoji: "🎲",
    maxRank: 3,
    effect: { kind: "multiply", stat: "mutationChanceFactor", value: 1.15 },
  },
  {
    id: "ruhige-hand",
    tree: "zuechter",
    tier: 1,
    name: "Ruhige Hand",
    emoji: "✂️",
    maxRank: 2,
    effect: { kind: "add", stat: "stabilityBonus", value: 0.1 },
  },
  {
    id: "samenfuelle",
    tree: "zuechter",
    tier: 2,
    name: "Samenfülle",
    emoji: "🌾",
    maxRank: 1,
    effect: { kind: "add", stat: "extraCrossSeeds", value: 1 },
  },
  {
    id: "geschultes-auge",
    tree: "zuechter",
    tier: 2,
    name: "Geschultes Auge",
    emoji: "🔍",
    maxRank: 1,
    effect: { kind: "enable", stat: "revealGenes" },
  },
  {
    id: "gen-fluesterer",
    tree: "zuechter",
    tier: 3,
    name: "Gen-Flüsterer",
    emoji: "🧬",
    maxRank: 1,
    effect: { kind: "multiply", stat: "mutationChanceFactor", value: 1.5 },
  },
  {
    id: "fester-griff",
    tree: "zuechter",
    tier: 3,
    name: "Fester Griff",
    emoji: "🪢",
    maxRank: 1,
    effect: { kind: "add", stat: "stabilityBonus", value: 0.15 },
  },

  // 🛒 Händler
  {
    id: "feilschen",
    tree: "haendler",
    tier: 1,
    name: "Feilschen",
    emoji: "🪙",
    maxRank: 3,
    effect: { kind: "multiply", stat: "sellPriceFactor", value: 1.05 },
  },
  {
    id: "stammkunde",
    tree: "haendler",
    tier: 1,
    name: "Stammkunde",
    emoji: "🤝",
    maxRank: 2,
    effect: { kind: "add", stat: "shopDiscount", value: 0.05 },
  },
  {
    id: "regal-schreiner",
    tree: "haendler",
    tier: 2,
    name: "Regal-Schreiner",
    emoji: "🪚",
    maxRank: 1,
    effect: { kind: "add", stat: "shelfSlotDiscount", value: 0.2 },
  },
  {
    id: "sonderkunde",
    tree: "haendler",
    tier: 2,
    name: "Sonderkunde",
    emoji: "🐿️",
    maxRank: 1,
    effect: { kind: "multiply", stat: "collectorChanceFactor", value: 2 },
  },
  {
    id: "nussbaron",
    tree: "haendler",
    tier: 3,
    name: "Nussbaron",
    emoji: "👑",
    maxRank: 1,
    effect: { kind: "multiply", stat: "sellPriceFactor", value: 1.15 },
  },
  {
    id: "grosshandel",
    tree: "haendler",
    tier: 3,
    name: "Großhandel",
    emoji: "📦",
    maxRank: 1,
    effect: { kind: "add", stat: "shopDiscount", value: 0.1 },
  },
];

export const allTalents: Talent[] = rawTalents.map((talent) =>
  talentSchema.parse(talent),
);

export const talentById: Record<string, Talent> = Object.fromEntries(
  allTalents.map((talent) => [talent.id, talent]),
);

export const talentTrees: TalentTree[] = ["gaertner", "zuechter", "haendler"];
