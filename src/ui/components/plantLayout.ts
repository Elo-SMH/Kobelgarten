import {
  phaseOf,
  type GrowthConfig,
  type GrowthPhase,
  type PlantInstance,
} from "../../engine/growth";
import { createRng, hashSeed } from "../../engine/rng";

/**
 * Pure geometry for the procedural plant SVG. Deterministic per plant ID:
 * the same plant always grows the same leaves in the same spots.
 */
export interface LeafSpec {
  /** Degrees from vertical; negative = left, positive = right. */
  angle: number;
  /** Stem length in viewBox units. */
  length: number;
  /** Scale factor for the leaf path. */
  scale: number;
  /** Whether this leaf shows the variegation color. */
  varieg: boolean;
}

export interface PlantLayout {
  phase: GrowthPhase;
  leaves: LeafSpec[];
}

const MAX_LEAVES = 8;
const LEAF_COUNT: Record<GrowthPhase, number> = {
  seed: 0,
  seedling: 2,
  juvenile: 4,
  adult: 6,
  pracht: 8,
};
const SIZE_FACTOR: Record<GrowthPhase, number> = {
  seed: 0,
  seedling: 0.4,
  juvenile: 0.65,
  adult: 0.85,
  pracht: 1,
};

export function plantLayout(
  plant: PlantInstance,
  config: GrowthConfig,
): PlantLayout {
  const phase = phaseOf(plant.progress, config);
  const count = LEAF_COUNT[phase];
  const factor = SIZE_FACTOR[phase];
  const size = plant.genome.size;
  const coverage = plant.genome.variegation.coverage;
  const rng = createRng(hashSeed(plant.id));

  const leaves: LeafSpec[] = [];
  for (let i = 0; i < MAX_LEAVES; i++) {
    // Always draw all rolls so existing leaves stay put as new ones appear.
    const angleJitter = (rng.next() - 0.5) * 12;
    const sizeJitter = 0.85 + rng.next() * 0.3;
    const variegRoll = rng.next();
    if (i >= count) continue;

    const side = i % 2 === 0 ? 1 : -1;
    const tier = Math.floor(i / 2);
    leaves.push({
      angle: side * (18 + tier * 15) + angleJitter,
      length: (16 + 26 * factor) * size * sizeJitter,
      scale: (0.45 + 0.45 * factor) * size * sizeJitter,
      varieg: variegRoll < coverage,
    });
  }
  return { phase, leaves };
}
