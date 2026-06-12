import type { EconomyConfig, ShelfSlotPricing } from "../engine/economy";
import type { GeneticsConfig } from "../engine/genetics";
import type { GrowthConfig } from "../engine/growth";
import type { LightPlacement, PotSize } from "../engine/schemas";

/**
 * Central tuning constants (game-design invariant: tune here, never inline
 * magic numbers elsewhere).
 */
export const CONFIG = {
  /** 1 tick = 1 real minute. */
  tickDurationMs: 60_000,
  /** Offline progress is capped at 48h of ticks. */
  offlineCapTicks: 48 * 60,
  /** Startkapital in Haselnüssen. */
  startHazelnuts: 50,

  genetics: {
    seedJitter: 0.1,
    seedHueJitter: 6,
  } satisfies GeneticsConfig,

  growth: {
    prachtProgress: 1.5,
    phaseThresholds: { seedling: 0.05, juvenile: 0.3, adult: 1 },
    lowWaterThreshold: 0.2,
    lowWaterGrowthFactor: 0.5,
    // trocken: Tod nach ~500 Ticks (≈ 8h) bei hardiness 1
    wiltPerTick: 0.002,
    wiltRecoveryPerTick: 0.004,
    lightFactors: {
      low: { window: 0.9, shade: 1 },
      medium: { window: 1, shade: 0.75 },
      bright: { window: 1, shade: 0.5 },
    },
    // Wachstumslimit je Topfgröße: klein → Jungpflanze, mittel → Adult,
    // groß → Prachtexemplar
    potCaps: { small: 0.6, medium: 1, large: 1.5 },
    // Dünger: +50 % Wachstum für 360 Ticks (≈ 6h)
    fertilizer: { growthFactor: 1.5, durationTicks: 360 },
  } satisfies GrowthConfig,

  economy: {
    // Adult ≈ 2× Samenpreis, damit der Kreislauf Kaufen→Ziehen→Verkaufen
    // profitabel ist (Samenpreis = species.basePrice)
    phaseValueFactors: {
      seed: 0.15,
      seedling: 0.5,
      juvenile: 1.2,
      adult: 2,
      pracht: 3,
    },
    variegationMultipliers: {
      none: 0,
      marginata: 0.5,
      sectoral: 1,
      splash: 1.5,
      halfmoon: 2.5,
      albo: 4,
    },
    variegationWeight: 8,
  } satisfies EconomyConfig,

  shop: {
    /** Kaufpreise; Samen kosten species.basePrice (PLAN 2.5). */
    potPrices: { small: 5, medium: 20, large: 80 } satisfies Record<
      PotSize,
      number
    >,
    fertilizerPrice: 25,
    wateringCanUpgradePrice: 150,
    shelfSlot: { basePrice: 100, growthFactor: 1.5 } satisfies ShelfSlotPricing,
    maxShelfSlots: 12,
    /** Verkäufe ab diesem Wert fragen nach (Fehlklick-Schutz). */
    sellConfirmThreshold: 500,
    dailyOfferDiscount: 0.3,
  },

  shelf: {
    slots: ["window", "window", "shade", "shade"] satisfies LightPlacement[],
    /** Stellplätze zugekaufter Slots, zyklisch. */
    extraSlotCycle: ["window", "shade"] satisfies LightPlacement[],
  },
};
