import { describe, expect, it } from "vitest";
import { createPlant, type GrowthConfig, type PlantInstance } from "../../engine/growth";
import type { Genome } from "../../engine/schemas";
import { plantLayout } from "./plantLayout";

const config: GrowthConfig = {
  prachtProgress: 1.5,
  growthSpeed: 1,
  waterDrainMultiplier: 1,
  phaseThresholds: { seedling: 0.05, juvenile: 0.3, adult: 1 },
  lowWaterThreshold: 0.2,
  lowWaterGrowthFactor: 0.5,
  wiltGrowthFactor: 0.2,
  wiltPerTick: 0.002,
  wiltRecoveryPerTick: 0.004,
  lightFactors: {
    low: { window: 0.9, shade: 1 },
    medium: { window: 1, shade: 0.75 },
    bright: { window: 1, shade: 0.5 },
  },
  potCaps: { small: 0.6, medium: 1, large: 1.5 },
  fertilizer: { growthFactor: 1.5, durationTicks: 360 },
  autoWaterThreshold: 0.1,
};

function makePlant(id: string, progress: number, genome: Partial<Genome> = {}): PlantInstance {
  return {
    ...createPlant(id, {
      speciesId: "pothos",
      growthRate: 1,
      size: 1,
      hueShift: 0,
      hardiness: 1,
      variegation: { type: "none", coverage: 0, stability: 1 },
      ...genome,
    }, "large"),
    progress,
  };
}

describe("plantLayout", () => {
  it("is deterministic per plant id", () => {
    const a = plantLayout(makePlant("plant-7", 1.2), config);
    const b = plantLayout(makePlant("plant-7", 1.2), config);
    expect(a).toEqual(b);
  });

  it("different plant ids produce different jitter", () => {
    const a = plantLayout(makePlant("plant-1", 1.2), config);
    const b = plantLayout(makePlant("plant-2", 1.2), config);
    expect(a).not.toEqual(b);
  });

  it("leaf count follows the growth phase", () => {
    expect(plantLayout(makePlant("p", 0), config).leaves).toHaveLength(0);
    expect(plantLayout(makePlant("p", 0.1), config).leaves).toHaveLength(2);
    expect(plantLayout(makePlant("p", 0.5), config).leaves).toHaveLength(4);
    expect(plantLayout(makePlant("p", 1.1), config).leaves).toHaveLength(6);
    expect(plantLayout(makePlant("p", 1.5), config).leaves).toHaveLength(8);
  });

  it("existing leaves stay put when new ones appear (edge: stable prefix)", () => {
    const juvenile = plantLayout(makePlant("p", 0.5), config);
    const pracht = plantLayout(makePlant("p", 1.5), config);
    for (const [index, leaf] of juvenile.leaves.entries()) {
      expect(pracht.leaves[index].angle).toBe(leaf.angle);
      expect(pracht.leaves[index].roll).toBe(leaf.roll);
    }
  });

  it("genome size scales the leaves", () => {
    const small = plantLayout(makePlant("p", 1.5, { size: 0.7 }), config);
    const big = plantLayout(makePlant("p", 1.5, { size: 1.3 }), config);
    for (const [index, leaf] of small.leaves.entries()) {
      expect(big.leaves[index].length).toBeGreaterThan(leaf.length);
      expect(big.leaves[index].scale).toBeGreaterThan(leaf.scale);
    }
  });

  it("every leaf carries a variegation roll in [0, 1)", () => {
    const layout = plantLayout(makePlant("p", 1.5), config);
    for (const leaf of layout.leaves) {
      expect(leaf.roll).toBeGreaterThanOrEqual(0);
      expect(leaf.roll).toBeLessThan(1);
    }
  });
});
