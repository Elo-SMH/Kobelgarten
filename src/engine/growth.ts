import type {
  Genome,
  LightNeed,
  LightPlacement,
  PlantSpecies,
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
}

export function createPlant(id: string, genome: Genome): PlantInstance {
  return { id, genome, progress: 0, water: 1, wilt: 0, dead: false };
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
  let wilt = plant.wilt;
  let progress = plant.progress;

  if (water <= 0) {
    wilt = Math.min(1, wilt + config.wiltPerTick / plant.genome.hardiness);
  } else {
    wilt = Math.max(0, wilt - config.wiltRecoveryPerTick);
    const waterFactor =
      water < config.lowWaterThreshold ? config.lowWaterGrowthFactor : 1;
    const lightFactor = config.lightFactors[species.lightNeed][placement];
    progress = Math.min(
      config.prachtProgress,
      progress +
        (plant.genome.growthRate * waterFactor * lightFactor) /
          species.growthTicks,
    );
  }

  return { ...plant, water, wilt, progress, dead: wilt >= 1 };
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
