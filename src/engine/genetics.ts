import type { Rng } from "./rng";
import { genomeSchema, type Genome } from "./schemas";

export interface GeneticsConfig {
  /** Relative jitter (±) on growthRate, size and hardiness of a fresh seed. */
  seedJitter: number;
  /** Absolute jitter (± degrees) on hueShift of a fresh seed. */
  seedHueJitter: number;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/**
 * Base genome for a store-bought seed: neutral genes with a small random
 * variation so no two plants feel identical. Mutation and crossing of
 * existing genomes follow in M4.
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
