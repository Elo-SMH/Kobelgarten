import type { EconomyConfig, ShelfSlotPricing } from "../engine/economy";
import type { EventsConfig } from "../engine/events";
import type { GeneticsConfig } from "../engine/genetics";
import type { GrowthConfig } from "../engine/growth";
import type { LexiconReward } from "../engine/lexicon";
import type { LightPlacement, PotSize } from "../engine/schemas";
import type { ProgressionConfig } from "../engine/skills";

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
  /**
   * Wasserstand frisch eingepflanzter Pflanzen (Samen wie Stecklinge): bei
   * 50 % kann der Spieler sofort gießen, statt auf einen vollen Tank zu warten.
   */
  plantingWaterLevel: 0.5,

  /**
   * Stecklinge schneiden ist nicht mehr gratis & unbegrenzt: eine Pflanze
   * muss ein Mindest-Wachstum erreicht haben, und jeder Schnitt kostet sie
   * Wachstum (art-spezifisch, species.cuttingCost). Das wirkt als natürlicher
   * Cooldown — die Mutterpflanze muss nachwachsen, bevor sie wieder hergibt.
   */
  cutting: {
    /** Mindest-progress, um überhaupt einen Steckling schneiden zu können. */
    minProgress: 0.5,
    /** Schnittkosten, falls eine Art keinen eigenen Wert setzt. */
    defaultCost: 0.25,
  },

  genetics: {
    seedJitter: 0.1,
    seedHueJitter: 6,
    geneDrift: 0.05,
    hueDrift: 2,
    seedsPerCross: [1, 3],
    // Steckling startet als Sämling, nicht als Samen
    cuttingStartProgress: 0.05,
    // Würfeltabelle PLAN 2.2; Basischancen gelten bei mutability 0.02
    variegation: {
      baselineMutability: 0.02,
      // PLAN 2.2: 2 % Basischance. Die erste Variegation fällt jetzt schon in
      // die erste Spielstunde, weil growthSpeed Stecklinge ~8× früher reif
      // macht (scripts/simulate.ts) — kein künstlicher Chance-Bump nötig.
      spontaneousChance: 0.02,
      spontaneousCoverage: [0.05, 0.15],
      freshStability: [0.3, 0.8],
      intensifyChance: 0.1,
      intensifyGain: [0.05, 0.15],
      typeJumpChance: 0.03,
      reversionFactor: 0.25,
    },
  } satisfies GeneticsConfig,

  growth: {
    prachtProgress: 1.5,
    // M6-Pacing: globaler Wachstums-Tempo-Faktor, damit eine aktive Session
    // nicht stundenlang im Leerlauf hängt. Mit 8 sprießt eine Efeutute in
    // ~4 min, ist ab ~22 min kreuzbar (Jungpflanze) und nach ~75 min adult.
    // Reskaliert ALLE Pro-Art-growthTicks — die „~Xh“-Kommentare in
    // content/plants/* sind Rohwerte vor diesem Faktor.
    growthSpeed: 8,
    // M6-Pacing: schnellerer Wasserverbrauch macht Gießen zur regelmäßigen
    // Aufgabe (statt einmal alle ~11h). Pflegeintensive Arten (Calathea,
    // Alocasia) wollen jetzt spürbar öfter Wasser.
    waterDrainMultiplier: 12,
    phaseThresholds: { seedling: 0.05, juvenile: 0.3, adult: 1 },
    lowWaterThreshold: 0.2,
    lowWaterGrowthFactor: 0.5,
    // trocken: Tod nach ~1000 Ticks (≈ 16h) bei hardiness 1. Bewusst träge,
    // damit der schnellere Wasserverbrauch (s.o.) einen Offline-Tag nicht
    // direkt tödlich macht — Gießen optimiert das Wachstum, Vernachlässigung
    // bremst und tötet erst nach Stunden.
    wiltPerTick: 0.001,
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
    // Auto-Gießen (Tier-3-Talent) füllt unter 10 % Wasserstand nach
    autoWaterThreshold: 0.1,
  } satisfies GrowthConfig,

  progression: {
    // Level 2 nach einem guten Verkaufstag, Level 30 als Langzeitziel
    xpCurve: { base: 100, growth: 1.25, maxLevel: 30 },
    xp: {
      // XP pro Verkauf = ceil(Erlös / saleDivisor)
      saleDivisor: 10,
      discovery: 25,
      collectorBonus: 40,
    },
    // Nötige Punkte im Baum je Tier (Tier 1 sofort)
    tierThresholds: [0, 3, 6],
    respecCostPerPoint: 25,
  } satisfies ProgressionConfig,

  events: {
    // Ereignis-Würfe jede Stunde (60 Ticks)
    checkIntervalTicks: 60,
    // Trauermücken: −50 % Wachstum bis Gelbtafeln helfen (oder nach 24h weg)
    gnats: { chance: 0.06, durationTicks: 1440, growthFactor: 0.5 },
    // Sonnenbrand: 3h Wachstumsstopp + Welke, heilt von selbst
    sunburn: {
      chance: 0.05,
      durationTicks: 180,
      growthFactor: 0,
      extraWiltPerTick: 0.003,
    },
    // Sammler-Eichhörnchen: zahlt 2× für die gewünschte Variegation (24h)
    collector: { chance: 0.08, durationTicks: 1440, priceFactor: 2 },
  } satisfies EventsConfig,

  lexicon: {
    /** Komplettierungs-Belohnungen, in Schwellen-Reihenfolge. */
    rewards: [
      { completion: 0.25, hazelnuts: 150, xp: 50 },
      { completion: 0.5, hazelnuts: 400, xp: 120 },
      { completion: 0.75, hazelnuts: 1000, xp: 250 },
      { completion: 1, hazelnuts: 2500, xp: 600 },
    ] satisfies LexiconReward[],
  },

  economy: {
    // Adult deutlich über Samenpreis, damit der Kreislauf Kaufen→Ziehen→
    // Verkaufen früh Kapital aufbaut (Samenpreis = species.basePrice).
    // Balance-Pass M6: adult 2 → 2.5, pracht 3 → 4 — fettet die dünne
    // Früh-Marge, ohne ein Einkommens-Runaway auszulösen (scripts/simulate.ts).
    phaseValueFactors: {
      seed: 0.15,
      seedling: 0.5,
      juvenile: 1.2,
      adult: 2.5,
      pracht: 4,
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
    /**
     * Kaufpreise; Samen kosten species.basePrice (PLAN 2.5). Balance-Pass M6:
     * medium 20 → 12, large 80 → 60 — der mittlere Topf war so teuer, dass mit
     * dem 50-🌰-Start nur eine Pflanze gleichzeitig lief (scripts/simulate.ts).
     */
    potPrices: { small: 5, medium: 12, large: 60 } satisfies Record<
      PotSize,
      number
    >,
    fertilizerPrice: 25,
    gelbtafelnPrice: 30,
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
