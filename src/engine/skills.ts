import type {
  AddStat,
  EnableStat,
  MultiplyStat,
  Squirrel,
  Talent,
  TalentTree,
} from "./schemas";

/**
 * Talentbaum-Effekte als Modifikator-Pipeline (PLAN 2.4): Talente sind
 * Content-Daten, die Engine fragt nur die aggregierten Modifikatoren ab und
 * kennt keine einzelnen Talente.
 */
export interface Modifiers extends Record<MultiplyStat | AddStat, number>, Record<EnableStat, boolean> {
  /** × auf das Tick-Wachstum. */
  growthFactor: number;
  /** × auf die Welke-Zunahme pro trockenem Tick. */
  wiltFactor: number;
  /** × auf die Dünger-Wirkdauer. */
  fertilizerDurationFactor: number;
  /** × auf alle Variegations-Chancen der Würfeltabelle. */
  mutationChanceFactor: number;
  /** × auf den Verkaufspreis. */
  sellPriceFactor: number;
  /** × auf die Chance, dass ein Sammler-Eichhörnchen anklopft. */
  collectorChanceFactor: number;
  /** + auf die Füllmenge der Gießkanne (Wasser über 1 hinaus). */
  waterTankBonus: number;
  /** + auf die stability frisch gewürfelter Variegationen. */
  stabilityBonus: number;
  /** + Samen pro Kreuzung. */
  extraCrossSeeds: number;
  /** Rabatt 0–1 auf Shop-Käufe. */
  shopDiscount: number;
  /** Rabatt 0–1 auf Regal-Slots. */
  shelfSlotDiscount: number;
  /** Tier-3-Gärtner: Pflanzen gießen sich selbst. */
  autoWater: boolean;
  /** Geschultes Auge: UI zeigt Genwerte an. */
  revealGenes: boolean;
}

export const DEFAULT_MODIFIERS: Modifiers = {
  growthFactor: 1,
  wiltFactor: 1,
  fertilizerDurationFactor: 1,
  mutationChanceFactor: 1,
  sellPriceFactor: 1,
  collectorChanceFactor: 1,
  waterTankBonus: 0,
  stabilityBonus: 0,
  extraCrossSeeds: 0,
  shopDiscount: 0,
  shelfSlotDiscount: 0,
  autoWater: false,
  revealGenes: false,
};

/** Rabatte werden gedeckelt, damit gestapelte Talente nie verschenken. */
const DISCOUNT_CAP = 0.5;

/**
 * Aggregiert die Talent-Ränge zu Modifikatoren: multiply-Effekte stapeln
 * multiplikativ pro Rang, add-Effekte linear, enable schaltet Flags.
 */
export function computeModifiers(
  ranks: Record<string, number>,
  talents: readonly Talent[],
): Modifiers {
  const result: Modifiers = { ...DEFAULT_MODIFIERS };
  for (const talent of talents) {
    const rank = Math.min(ranks[talent.id] ?? 0, talent.maxRank);
    if (rank <= 0) continue;
    const effect = talent.effect;
    if (effect.kind === "multiply") {
      result[effect.stat] *= effect.value ** rank;
    } else if (effect.kind === "add") {
      result[effect.stat] += effect.value * rank;
    } else {
      result[effect.stat] = true;
    }
  }
  result.shopDiscount = Math.min(result.shopDiscount, DISCOUNT_CAP);
  result.shelfSlotDiscount = Math.min(result.shelfSlotDiscount, DISCOUNT_CAP);
  return result;
}

/**
 * Wendet den Mini-Startbonus des gewählten Eichhörnchens (PLAN 2.6) auf die
 * bereits aggregierten Talent-Modifikatoren an: ein Multiplikator auf genau
 * einen Stat. Ohne Eichhörnchen bleiben die Modifikatoren unverändert.
 */
export function withSquirrelBonus(
  mods: Modifiers,
  squirrel: Squirrel | null | undefined,
): Modifiers {
  if (!squirrel) return mods;
  const { stat, value } = squirrel.bonus;
  return { ...mods, [stat]: mods[stat] * value };
}

/** Summe aller investierten Punkte (= verbrauchte Skillpunkte). */
export function pointsSpent(ranks: Record<string, number>): number {
  return Object.values(ranks).reduce((sum, rank) => sum + Math.max(0, rank), 0);
}

/** Investierte Punkte in einem Baum (für Tier-Freischaltung). */
export function pointsInTree(
  ranks: Record<string, number>,
  talents: readonly Talent[],
  tree: TalentTree,
): number {
  return talents
    .filter((talent) => talent.tree === tree)
    .reduce((sum, talent) => sum + (ranks[talent.id] ?? 0), 0);
}

/** Tiers schalten sich per investierter Punkte im selben Baum frei. */
export function isTierUnlocked(
  tier: number,
  treePoints: number,
  tierThresholds: readonly number[],
): boolean {
  return treePoints >= (tierThresholds[tier - 1] ?? Infinity);
}

export interface XpCurve {
  /** XP von Level 1 auf 2; spätere Stufen wachsen geometrisch. */
  base: number;
  growth: number;
  maxLevel: number;
}

export interface ProgressionConfig {
  xpCurve: XpCurve;
  xp: {
    /** XP pro Verkauf = ceil(Erlös / saleDivisor). */
    saleDivisor: number;
    /** XP pro Erstzüchtung (neuer Lexikon-Eintrag). */
    discovery: number;
    /** Bonus-XP für eine erfüllte Sammler-Quest. */
    collectorBonus: number;
  };
  /** Nötige Punkte im Baum je Tier (Index 0 = Tier 1). */
  tierThresholds: readonly number[];
  /** Respec kostet Haselnüsse pro zurückgesetztem Punkt. */
  respecCostPerPoint: number;
}

/** XP, um von `level` auf `level + 1` zu kommen. */
export function xpForLevelUp(level: number, curve: XpCurve): number {
  return Math.round(curve.base * curve.growth ** (level - 1));
}

/** Level zu einem XP-Gesamtstand, beginnend bei 1, gedeckelt auf maxLevel. */
export function levelForXp(xp: number, curve: XpCurve): number {
  let level = 1;
  let remaining = xp;
  while (level < curve.maxLevel) {
    const needed = xpForLevelUp(level, curve);
    if (remaining < needed) break;
    remaining -= needed;
    level += 1;
  }
  return level;
}

export interface LevelProgress {
  level: number;
  /** XP innerhalb des aktuellen Levels. */
  into: number;
  /** XP bis zum nächsten Level; 0 auf maxLevel. */
  needed: number;
}

/** Fortschritts-Aufschlüsselung für die XP-Leiste der UI. */
export function levelProgress(xp: number, curve: XpCurve): LevelProgress {
  let level = 1;
  let remaining = xp;
  while (level < curve.maxLevel) {
    const needed = xpForLevelUp(level, curve);
    if (remaining < needed) {
      return { level, into: remaining, needed };
    }
    remaining -= needed;
    level += 1;
  }
  return { level, into: 0, needed: 0 };
}

/** Pro Level 1 Skillpunkt (PLAN 2.4) — Level 1 startet ohne Punkt. */
export function totalSkillPoints(level: number): number {
  return Math.max(0, level - 1);
}

/** Respec-Kosten in Haselnüssen für die aktuell investierten Punkte. */
export function respecCost(spent: number, config: ProgressionConfig): number {
  return spent * config.respecCostPerPoint;
}
