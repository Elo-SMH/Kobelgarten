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
}

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
): PlantInstance {
  if (plant.dead) return plant;

  const water = Math.max(0, plant.water - species.waterDrainPerTick);
  // Der Buff läuft mit der Zeit ab, auch wenn die Pflanze gerade nicht wächst.
  const fertilizerTicks = Math.max(0, plant.fertilizerTicks - 1);
  let wilt = plant.wilt;
  let progress = plant.progress;

  if (water <= 0) {
    wilt = Math.min(1, wilt + config.wiltPerTick / plant.genome.hardiness);
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
            fertilizerFactor) /
            species.growthTicks,
      ),
    );
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
): PlantInstance {
  let current = plant;
  for (let i = 0; i < ticks && !current.dead; i++) {
    current = tickPlant(current, species, placement, config);
  }
  return current;
}

/** Gießkannen-Aktion: füllt den Wassertank der Pflanze. */
export function waterPlant(plant: PlantInstance): PlantInstance {
  if (plant.dead) return plant;
  return { ...plant, water: 1 };
}

/** Dünger-Aktion: startet den Wachstums-Buff für config.fertilizer.durationTicks. */
export function fertilizePlant(
  plant: PlantInstance,
  config: GrowthConfig,
): PlantInstance {
  if (plant.dead) return plant;
  return { ...plant, fertilizerTicks: config.fertilizer.durationTicks };
}
