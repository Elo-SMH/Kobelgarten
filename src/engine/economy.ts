import {
  phaseOf,
  type GrowthConfig,
  type GrowthPhase,
  type PlantInstance,
} from "./growth";
import { createRng, hashSeed } from "./rng";
import type { PlantSpecies, VariegationType } from "./schemas";

export interface EconomyConfig {
  /**
   * Phasen-Anteil des sizeFactor der Wertformel: eine adulte Pflanze muss
   * deutlich mehr wert sein als ihr Samen, sonst trägt sich der Geldkreislauf
   * nicht (Samenpreis = basePrice).
   */
  phaseValueFactors: Record<GrowthPhase, number>;
  /**
   * Wert-Multiplikator je Variegations-Typ (PLAN 2.2: Albo/Halfmoon =
   * Jackpot). Greift ab M4, wenn Vermehrung Variegationen würfelt.
   */
  variegationMultipliers: Record<VariegationType, number>;
  /** Gewicht der coverage in der Wertformel (PLAN 2.2: 8). */
  variegationWeight: number;
}

/**
 * Wertformel (PLAN 2.2):
 * `basePrice × sizeFactor × (1 + coverage × typMultiplikator × weight)`
 * mit sizeFactor = Gen `size` × Phasenfaktor. Tote Pflanzen sind wertlos.
 */
export function plantValue(
  plant: PlantInstance,
  species: PlantSpecies,
  growth: GrowthConfig,
  economy: EconomyConfig,
): number {
  if (plant.dead) return 0;
  const phase = phaseOf(plant.progress, growth);
  const sizeFactor = plant.genome.size * economy.phaseValueFactors[phase];
  const { type, coverage } = plant.genome.variegation;
  const variegationFactor =
    1 + coverage * economy.variegationMultipliers[type] * economy.variegationWeight;
  return Math.max(1, Math.round(species.basePrice * sizeFactor * variegationFactor));
}

/**
 * Tatsächlicher Verkaufserlös: Grundwert aus der Wertformel × Händler-Talente
 * × Sammler-Quest (PLAN 2.3: zahlt 2× für die gewünschte Variegation).
 */
export function effectiveSellPrice(
  baseValue: number,
  sellPriceFactor: number,
  collectorFactor = 1,
): number {
  if (baseValue <= 0) return 0;
  return Math.max(1, Math.round(baseValue * sellPriceFactor * collectorFactor));
}

export interface ShelfSlotPricing {
  basePrice: number;
  /** Preis-Faktor pro bereits gekauftem Zusatz-Slot. */
  growthFactor: number;
}

/** Preis des nächsten Regal-Slots, steigt exponentiell mit jedem Zukauf. */
export function shelfSlotPrice(
  extraSlotsBought: number,
  pricing: ShelfSlotPricing,
): number {
  return Math.round(pricing.basePrice * pricing.growthFactor ** extraSlotsBought);
}

export interface DailyOffer {
  itemId: string;
  /** Rabatt 0–1. */
  discount: number;
}

/**
 * Angebot des Tages: deterministisch aus dem Kalenderdatum-Seed (kein
 * Server nötig) — gleicher Tag, gleiches Angebot.
 */
export function dailyOffer(
  dateKey: string,
  itemPool: readonly string[],
  discount: number,
): DailyOffer | null {
  if (itemPool.length === 0) return null;
  const rng = createRng(hashSeed(`daily-offer:${dateKey}`));
  return { itemId: rng.pick(itemPool), discount };
}

/** Rabattierter Preis, auf ganze Haselnüsse gerundet, nie unter 1. */
export function discountedPrice(price: number, discount: number): number {
  return Math.max(1, Math.round(price * (1 - discount)));
}

/** Lokaler Kalendertag als Seed-Schlüssel, z.B. "2026-06-12". */
export function dateKey(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}
