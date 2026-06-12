import type {
  Genome,
  LightNeed,
  LightPlacement,
  PlantSpecies,
  PotSize,
} from "./schemas";

/** Wachstumsphasen: Samen → Sämling → Jungpflanze → Adult → Prachtexemplar. */
export type GrowthPhase = "seed" | "seedling" | "juvenile" | "adult" | "pracht";

export interface PlantInstance {
  id: string;
  genome: Genome;
  /** 0..GrowthConfig.prachtProgress; 1.0 = Adult erreicht. */
  progress: number;
  /** Wassertank 0..1, sinkt pro Tick um species.waterDrainPerTick. */
  water: number;
  /** Welke-Schaden 0..1; bei 1 ist die Pflanze tot. */
  wilt: number;
  dead: boolean;
  /** Topf der Pflanze; deckelt progress auf GrowthConfig.potCaps[potSize]. */
  potSize: PotSize;
  /** Verbleibende Ticks des Dünger-Buffs (0 = kein Buff). */
  fertilizerTicks: number;
}

export interface GrowthConfig {
  /** progress-Wert des Prachtexemplars (Adult = 1). */
  prachtProgress: number;
  /** Untere progress-Schwellen der Phasen (seed beginnt bei 0). */
  phaseThresholds: { seedling: number; juvenile: number; adult: number };
  /** Unter diesem Wasserstand wächst die Pflanze nur gebremst. */
  lowWaterThreshold: number;
  lowWaterGrowthFactor: number;
  /** Welke-Zunahme pro trockenem Tick, geteilt durch genome.hardiness. */
  wiltPerTick: number;
  /** Welke-Erholung pro versorgtem Tick. */
  wiltRecoveryPerTick: number;
  /** Wachstumsfaktor je Lichtbedarf × Stellplatz. */
  lightFactors: Record<LightNeed, Record<LightPlacement, number>>;
  /** Wachstumslimit (max. progress) je Topfgröße. */
  potCaps: Record<PotSize, number>;
  /** Dünger-Buff: Wachstumsfaktor und Wirkdauer in Ticks. */
  fertilizer: { growthFactor: number; durationTicks: number };
  /** Auto-Gießen (Talent) füllt nach, sobald Wasser hierunter fällt. */
  autoWaterThreshold: number;
}

/**
 * Externe Tick-Modifikatoren aus Skill-Pipeline (engine/skills.ts) und
 * Ereignissen (engine/events.ts) — die Wachstums-Engine kennt weder Talente
 * noch Ereignis-Arten, nur diese aggregierten Stellschrauben.
 */
export interface TickModifiers {
  /** × auf das Wachstum (Talente × Trauermücken/Sonnenbrand). */
  growthFactor: number;
  /** × auf die Welke-Zunahme bei Trockenheit. */
  wiltFactor: number;
  /** + Welke pro Tick unabhängig vom Wasserstand (Sonnenbrand). */
  extraWiltPerTick: number;
  /** Tier-3-Gärtner: gießt automatisch nach. */
  autoWater: boolean;
}

export const NEUTRAL_TICK_MODIFIERS: TickModifiers = {
  growthFactor: 1,
  wiltFactor: 1,
  extraWiltPerTick: 0,
  autoWater: false,
};

export function createPlant(
  id: string,
  genome: Genome,
  potSize: PotSize,
  /** Stecklinge starten mit Vorsprung (CONFIG.genetics.cuttingStartProgress). */
  initialProgress = 0,
): PlantInstance {
  return {
    id,
    genome,
    progress: initialProgress,
    water: 1,
    wilt: 0,
    dead: false,
    potSize,
    fertilizerTicks: 0,
  };
}

export function phaseOf(progress: number, config: GrowthConfig): GrowthPhase {
  if (progress >= config.prachtProgress) return "pracht";
  if (progress >= config.phaseThresholds.adult) return "adult";
  if (progress >= config.phaseThresholds.juvenile) return "juvenile";
  if (progress >= config.phaseThresholds.seedling) return "seedling";
  return "seed";
}

/**
 * Simulate one tick (= 1 minute): water drains; a supplied plant grows and
 * recovers from wilt, a dry plant stops growing and wilts — buffered by
 * hardiness — until it dies.
 */
export function tickPlant(
  plant: PlantInstance,
  species: PlantSpecies,
  placement: LightPlacement,
  config: GrowthConfig,
  mods: TickModifiers = NEUTRAL_TICK_MODIFIERS,
): PlantInstance {
  if (plant.dead) return plant;

  // Auto-Gießen (Talent): das Eichhörnchen füllt nach, bevor es kritisch wird.
  const tank =
    mods.autoWater && plant.water <= config.autoWaterThreshold ? 1 : plant.water;
  const water = Math.max(0, tank - species.waterDrainPerTick);
  // Der Buff läuft mit der Zeit ab, auch wenn die Pflanze gerade nicht wächst.
  const fertilizerTicks = Math.max(0, plant.fertilizerTicks - 1);
  let wilt = plant.wilt;
  let progress = plant.progress;

  if (water <= 0) {
    wilt = Math.min(
      1,
      wilt + (config.wiltPerTick * mods.wiltFactor) / plant.genome.hardiness,
    );
  } else {
    wilt = Math.max(0, wilt - config.wiltRecoveryPerTick);
    const waterFactor =
      water < config.lowWaterThreshold ? config.lowWaterGrowthFactor : 1;
    const lightFactor = config.lightFactors[species.lightNeed][placement];
    const fertilizerFactor =
      plant.fertilizerTicks > 0 ? config.fertilizer.growthFactor : 1;
    const cap = Math.min(config.prachtProgress, config.potCaps[plant.potSize]);
    // max(): ein bereits über dem Topf-Limit stehender progress (z.B. nach
    // einer Migration) wird nie rückwirkend gekürzt.
    progress = Math.max(
      progress,
      Math.min(
        cap,
        progress +
          (plant.genome.growthRate *
            waterFactor *
            lightFactor *
            fertilizerFactor *
            mods.growthFactor) /
            species.growthTicks,
      ),
    );
  }

  // Sonnenbrand welkt unabhängig vom Gießen — hardiness puffert auch hier.
  if (mods.extraWiltPerTick > 0) {
    wilt = Math.min(1, wilt + mods.extraWiltPerTick / plant.genome.hardiness);
  }

  return { ...plant, water, wilt, progress, fertilizerTicks, dead: wilt >= 1 };
}

/** Catch-up helper for offline progress: apply many ticks at once. */
export function tickPlantMany(
  plant: PlantInstance,
  species: PlantSpecies,
  placement: LightPlacement,
  ticks: number,
  config: GrowthConfig,
  mods: TickModifiers = NEUTRAL_TICK_MODIFIERS,
): PlantInstance {
  let current = plant;
  for (let i = 0; i < ticks && !current.dead; i++) {
    current = tickPlant(current, species, placement, config, mods);
  }
  return current;
}

/** Gießkannen-Aktion: füllt den Wassertank (Talent-Tank kann über 1 gehen). */
export function waterPlant(plant: PlantInstance, fillTo = 1): PlantInstance {
  if (plant.dead) return plant;
  return { ...plant, water: Math.max(plant.water, fillTo) };
}

/**
 * Dünger-Aktion: startet den Wachstums-Buff; Talente können die Wirkdauer
 * strecken (durationFactor).
 */
export function fertilizePlant(
  plant: PlantInstance,
  config: GrowthConfig,
  durationFactor = 1,
): PlantInstance {
  if (plant.dead) return plant;
  return {
    ...plant,
    fertilizerTicks: Math.round(config.fertilizer.durationTicks * durationFactor),
  };
}
