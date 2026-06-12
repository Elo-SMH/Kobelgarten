import type { Rng } from "./rng";
import { genomeSchema, type Genome, type PlantSpecies } from "./schemas";

/** Variegations-Zustand eines Genoms (PLAN 2.1). */
export type Variegation = Genome["variegation"];

/**
 * Würfeltabelle der Vermehrung (PLAN 2.2). Alle Chancen außer der Reversion
 * skalieren mit species.mutability / baselineMutability sowie einem externen
 * Multiplikator (Talente, Dünger — ab M5).
 */
export interface VariegationConfig {
  /** mutability-Wert, bei dem die Basischancen der Tabelle 1:1 gelten. */
  baselineMutability: number;
  /** Spontane Variegation: none → zufälliger Typ. */
  spontaneousChance: number;
  /** coverage-Spanne einer frischen Variegation. */
  spontaneousCoverage: [number, number];
  /** stability-Spanne einer frischen Variegation (Mutationen sind wackelig). */
  freshStability: [number, number];
  /** Verstärkung: coverage legt zu (nur wenn variegiert). */
  intensifyChance: number;
  intensifyGain: [number, number];
  /** Typ-Sprung: z.B. splash → halfmoon (nur wenn variegiert). */
  typeJumpChance: number;
  /** Reversion: Chance = (1 − stability) × reversionFactor. */
  reversionFactor: number;
}

export interface GeneticsConfig {
  /** Relative jitter (±) on growthRate, size and hardiness of a fresh seed. */
  seedJitter: number;
  /** Absolute jitter (± degrees) on hueShift of a fresh seed. */
  seedHueJitter: number;
  /** Relative Drift (±) pro Gen bei jeder Vermehrung (PLAN 2.1: ±5 %). */
  geneDrift: number;
  /** Absolute Drift (± Grad) auf hueShift pro Vermehrung. */
  hueDrift: number;
  /** Samen pro Kreuzung, [min, max] einschließlich (PLAN 2.1: 1–3). */
  seedsPerCross: [number, number];
  /** Start-progress eines eingepflanzten Stecklings (Vorsprung vor Samen). */
  cuttingStartProgress: number;
  variegation: VariegationConfig;
}

const COVERAGE_MAX = 0.6;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function uniform(rng: Rng, [min, max]: [number, number]): number {
  return min + rng.next() * (max - min);
}

/**
 * Base genome for a store-bought seed: neutral genes with a small random
 * variation so no two plants feel identical.
 */
export function createSeedGenome(
  speciesId: string,
  rng: Rng,
  config: GeneticsConfig,
): Genome {
  const jitter = () => 1 + (rng.next() * 2 - 1) * config.seedJitter;
  const genome: Genome = {
    speciesId,
    growthRate: clamp(jitter(), 0.5, 1.5),
    size: clamp(jitter(), 0.7, 1.3),
    hueShift: clamp((rng.next() * 2 - 1) * config.seedHueJitter, -20, 20),
    hardiness: clamp(jitter(), 0.5, 1.5),
    variegation: { type: "none", coverage: 0, stability: 1 },
  };
  return genomeSchema.parse(genome);
}

/**
 * Ein Wurf der Variegations-Tabelle (PLAN 2.2), bei JEDER Vermehrung:
 *
 * | Ereignis             | Basischance              | Effekt                              |
 * |----------------------|--------------------------|-------------------------------------|
 * | Spontane Variegation | 2 %                      | none → zufälliger Typ, cov 0.05–0.15|
 * | Reversion            | (1 − stability) × 25 %   | zurück zu none                      |
 * | Verstärkung          | 10 % (wenn variegiert)   | coverage +0.05–0.15                 |
 * | Typ-Sprung           | 3 %                      | z.B. splash → halfmoon              |
 *
 * Reihenfolge: ohne Variegation wird nur spontan gewürfelt; mit Variegation
 * erst Reversion (beendet alles), dann Verstärkung, dann Typ-Sprung.
 * Die Reversion skaliert NICHT mit mutability — sie hängt nur an stability.
 */
export function rollVariegation(
  variegation: Variegation,
  species: PlantSpecies,
  rng: Rng,
  config: VariegationConfig,
  chanceMultiplier = 1,
): Variegation {
  const factor =
    (species.mutability / config.baselineMutability) * chanceMultiplier;

  if (variegation.type === "none") {
    if (!rng.chance(clamp(config.spontaneousChance * factor, 0, 1))) {
      return { ...variegation };
    }
    return {
      type: rng.pick(species.allowedVariegations),
      coverage: clamp(uniform(rng, config.spontaneousCoverage), 0, COVERAGE_MAX),
      stability: clamp(uniform(rng, config.freshStability), 0, 1),
    };
  }

  const reversionChance = (1 - variegation.stability) * config.reversionFactor;
  if (rng.chance(clamp(reversionChance, 0, 1))) {
    return { type: "none", coverage: 0, stability: 1 };
  }

  let { type, coverage } = variegation;
  if (rng.chance(clamp(config.intensifyChance * factor, 0, 1))) {
    coverage = clamp(coverage + uniform(rng, config.intensifyGain), 0, COVERAGE_MAX);
  }
  if (rng.chance(clamp(config.typeJumpChance * factor, 0, 1))) {
    const otherTypes = species.allowedVariegations.filter((t) => t !== type);
    if (otherTypes.length > 0) type = rng.pick(otherTypes);
  }
  return { type, coverage, stability: variegation.stability };
}

/** Ein Gen driftet relativ um ±geneDrift und bleibt in seinen Schranken. */
function drift(
  value: number,
  rng: Rng,
  config: GeneticsConfig,
  min: number,
  max: number,
): number {
  return clamp(value * (1 + (rng.next() * 2 - 1) * config.geneDrift), min, max);
}

/**
 * Steckling (PLAN 2.1): Klon des Genoms, jedes Gen driftet leicht (±5 %),
 * danach würfelt die Variegations-Tabelle (Reversion/Verstärkung/…).
 */
export function mutate(
  genome: Genome,
  species: PlantSpecies,
  rng: Rng,
  config: GeneticsConfig,
  chanceMultiplier = 1,
): Genome {
  const result: Genome = {
    speciesId: genome.speciesId,
    growthRate: drift(genome.growthRate, rng, config, 0.5, 1.5),
    size: drift(genome.size, rng, config, 0.7, 1.3),
    hueShift: clamp(
      genome.hueShift + (rng.next() * 2 - 1) * config.hueDrift,
      -20,
      20,
    ),
    hardiness: drift(genome.hardiness, rng, config, 0.5, 1.5),
    variegation: rollVariegation(
      genome.variegation,
      species,
      rng,
      config.variegation,
      chanceMultiplier,
    ),
  };
  return genomeSchema.parse(result);
}

/** Kreuz-Kompatibilität: gleiche crossGroup (PLAN: Daten, kein Sonderfall). */
export function canCross(a: PlantSpecies, b: PlantSpecies): boolean {
  return a.crossGroup === b.crossGroup;
}

/**
 * Kreuzung (PLAN 2.1): zwei adulte Pflanzen kompatibler Arten → 1–3 Samen.
 * Pro Samen: Art 50/50 von A/B, pro Gen 50/50 von A/B (Variegation als
 * Ganzes), anschließend die volle Mutations-Runde (Drift + Würfeltabelle).
 * Ein geerbter Variegations-Typ bleibt erhalten, auch wenn die Kind-Art ihn
 * nicht selbst auswürfeln könnte — so wandern Variegationen über Arten.
 */
export function cross(
  genomeA: Genome,
  speciesA: PlantSpecies,
  genomeB: Genome,
  speciesB: PlantSpecies,
  rng: Rng,
  config: GeneticsConfig,
  chanceMultiplier = 1,
): Genome[] {
  if (!canCross(speciesA, speciesB)) {
    throw new Error(
      `cross(): ${speciesA.id} und ${speciesB.id} sind nicht kompatibel`,
    );
  }
  const [minSeeds, maxSeeds] = config.seedsPerCross;
  const count = rng.int(minSeeds, maxSeeds + 1);
  const seeds: Genome[] = [];
  for (let i = 0; i < count; i++) {
    const fromA = () => rng.chance(0.5);
    const species = fromA() ? speciesA : speciesB;
    const base: Genome = {
      speciesId: species.id,
      growthRate: fromA() ? genomeA.growthRate : genomeB.growthRate,
      size: fromA() ? genomeA.size : genomeB.size,
      hueShift: fromA() ? genomeA.hueShift : genomeB.hueShift,
      hardiness: fromA() ? genomeA.hardiness : genomeB.hardiness,
      variegation: fromA()
        ? { ...genomeA.variegation }
        : { ...genomeB.variegation },
    };
    seeds.push(mutate(base, species, rng, config, chanceMultiplier));
  }
  return seeds;
}
