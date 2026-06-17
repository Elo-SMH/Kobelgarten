import { describe, expect, it } from "vitest";
import type { Squirrel, Talent } from "./schemas";
import {
  computeModifiers,
  DEFAULT_MODIFIERS,
  isTierUnlocked,
  levelForXp,
  levelProgress,
  pointsInTree,
  pointsSpent,
  respecCost,
  totalSkillPoints,
  withSquirrelBonus,
  xpForLevelUp,
  type ProgressionConfig,
  type XpCurve,
} from "./skills";

const talents: Talent[] = [
  {
    id: "wachstum",
    tree: "gaertner",
    tier: 1,
    name: "Grüner Daumen",
    emoji: "🌱",
    maxRank: 3,
    effect: { kind: "multiply", stat: "growthFactor", value: 1.1 },
  },
  {
    id: "tank",
    tree: "gaertner",
    tier: 1,
    name: "Großer Tank",
    emoji: "🫗",
    maxRank: 2,
    effect: { kind: "add", stat: "waterTankBonus", value: 0.25 },
  },
  {
    id: "auto",
    tree: "gaertner",
    tier: 3,
    name: "Auto-Gießen",
    emoji: "💧",
    maxRank: 1,
    effect: { kind: "enable", stat: "autoWater" },
  },
  {
    id: "rabatt",
    tree: "haendler",
    tier: 1,
    name: "Stammkunde",
    emoji: "🤝",
    maxRank: 5,
    effect: { kind: "add", stat: "shopDiscount", value: 0.2 },
  },
];

describe("withSquirrelBonus — Eichhörnchen-Startbonus (PLAN 2.6)", () => {
  const hasel: Squirrel = {
    id: "hasel",
    name: "Hasel",
    emoji: "🐿️",
    color: "#c1440e",
    bonus: { stat: "sellPriceFactor", value: 1.05 },
  };

  it("multipliziert genau den Bonus-Stat auf den Talent-Modifikatoren", () => {
    const base = { ...DEFAULT_MODIFIERS, sellPriceFactor: 1.2 };
    const mods = withSquirrelBonus(base, hasel);
    expect(mods.sellPriceFactor).toBeCloseTo(1.2 * 1.05);
    // alle anderen Stats bleiben unangetastet
    expect(mods.growthFactor).toBe(1);
  });

  it("ohne Eichhörnchen bleiben die Modifikatoren unverändert (edge case)", () => {
    expect(withSquirrelBonus(DEFAULT_MODIFIERS, null)).toEqual(DEFAULT_MODIFIERS);
    expect(withSquirrelBonus(DEFAULT_MODIFIERS, undefined)).toEqual(
      DEFAULT_MODIFIERS,
    );
  });
});

describe("computeModifiers — Modifikator-Pipeline (PLAN 2.4)", () => {
  it("ohne Ränge gelten die neutralen Defaults", () => {
    expect(computeModifiers({}, talents)).toEqual(DEFAULT_MODIFIERS);
  });

  it("multiply stapelt multiplikativ pro Rang, add linear, enable schaltet", () => {
    const mods = computeModifiers(
      { wachstum: 2, tank: 1, auto: 1 },
      talents,
    );
    expect(mods.growthFactor).toBeCloseTo(1.1 ** 2);
    expect(mods.waterTankBonus).toBeCloseTo(0.25);
    expect(mods.autoWater).toBe(true);
    expect(mods.revealGenes).toBe(false);
  });

  it("Ränge über maxRank und unbekannte Talente werden ignoriert (edge case)", () => {
    const mods = computeModifiers({ wachstum: 99, geist: 3 }, talents);
    expect(mods.growthFactor).toBeCloseTo(1.1 ** 3);
  });

  it("Rabatte sind auf 50 % gedeckelt", () => {
    const mods = computeModifiers({ rabatt: 5 }, talents);
    expect(mods.shopDiscount).toBe(0.5);
  });
});

describe("Punkte & Tiers", () => {
  it("pointsSpent summiert alle Ränge, pointsInTree nur den Baum", () => {
    const ranks = { wachstum: 2, tank: 1, rabatt: 3 };
    expect(pointsSpent(ranks)).toBe(6);
    expect(pointsInTree(ranks, talents, "gaertner")).toBe(3);
    expect(pointsInTree(ranks, talents, "haendler")).toBe(3);
    expect(pointsInTree(ranks, talents, "zuechter")).toBe(0);
  });

  it("Tiers schalten per investierter Punkte im Baum frei", () => {
    const thresholds = [0, 3, 6];
    expect(isTierUnlocked(1, 0, thresholds)).toBe(true);
    expect(isTierUnlocked(2, 2, thresholds)).toBe(false);
    expect(isTierUnlocked(2, 3, thresholds)).toBe(true);
    expect(isTierUnlocked(3, 5, thresholds)).toBe(false);
    expect(isTierUnlocked(3, 6, thresholds)).toBe(true);
  });
});

const curve: XpCurve = { base: 100, growth: 1.25, maxLevel: 5 };

describe("XP & Level (PLAN 2.4: pro Level 1 Skillpunkt)", () => {
  it("xpForLevelUp wächst geometrisch", () => {
    expect(xpForLevelUp(1, curve)).toBe(100);
    expect(xpForLevelUp(2, curve)).toBe(125);
    expect(xpForLevelUp(3, curve)).toBe(156);
  });

  it("levelForXp zählt kumulativ und startet bei 1", () => {
    expect(levelForXp(0, curve)).toBe(1);
    expect(levelForXp(99, curve)).toBe(1);
    expect(levelForXp(100, curve)).toBe(2);
    expect(levelForXp(100 + 125, curve)).toBe(3);
  });

  it("levelForXp ist auf maxLevel gedeckelt (edge case)", () => {
    expect(levelForXp(1_000_000, curve)).toBe(curve.maxLevel);
  });

  it("levelProgress liefert die XP-Leiste, needed=0 auf maxLevel", () => {
    expect(levelProgress(150, curve)).toEqual({ level: 2, into: 50, needed: 125 });
    expect(levelProgress(1_000_000, curve)).toEqual({
      level: curve.maxLevel,
      into: 0,
      needed: 0,
    });
  });

  it("totalSkillPoints = Level − 1", () => {
    expect(totalSkillPoints(1)).toBe(0);
    expect(totalSkillPoints(7)).toBe(6);
  });
});

describe("respecCost", () => {
  const config: ProgressionConfig = {
    xpCurve: curve,
    xp: { saleDivisor: 10, discovery: 25, collectorBonus: 40 },
    tierThresholds: [0, 3, 6],
    respecCostPerPoint: 25,
  };

  it("kostet pro investiertem Punkt", () => {
    expect(respecCost(0, config)).toBe(0);
    expect(respecCost(4, config)).toBe(100);
  });
});
