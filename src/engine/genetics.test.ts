import { describe, expect, it } from "vitest";
import { createSeedGenome, type GeneticsConfig } from "./genetics";
import { createRng } from "./rng";
import { genomeSchema } from "./schemas";

const config: GeneticsConfig = { seedJitter: 0.1, seedHueJitter: 6 };

describe("createSeedGenome", () => {
  it("is deterministic for the same rng seed", () => {
    const a = createSeedGenome("pothos", createRng(7), config);
    const b = createSeedGenome("pothos", createRng(7), config);
    expect(a).toEqual(b);
  });

  it("produces a schema-valid genome without variegation", () => {
    const genome = createSeedGenome("pothos", createRng(1), config);
    expect(genomeSchema.parse(genome)).toEqual(genome);
    expect(genome.speciesId).toBe("pothos");
    expect(genome.variegation).toEqual({ type: "none", coverage: 0, stability: 1 });
  });

  it("keeps jittered genes within the configured spread", () => {
    for (let seed = 0; seed < 200; seed++) {
      const genome = createSeedGenome("syngonium", createRng(seed), config);
      expect(genome.growthRate).toBeGreaterThanOrEqual(0.9);
      expect(genome.growthRate).toBeLessThanOrEqual(1.1);
      expect(genome.size).toBeGreaterThanOrEqual(0.9);
      expect(genome.size).toBeLessThanOrEqual(1.1);
      expect(genome.hardiness).toBeGreaterThanOrEqual(0.9);
      expect(genome.hardiness).toBeLessThanOrEqual(1.1);
      expect(Math.abs(genome.hueShift)).toBeLessThanOrEqual(6);
    }
  });

  it("clamps extreme jitter into schema bounds (edge case)", () => {
    const extreme: GeneticsConfig = { seedJitter: 5, seedHueJitter: 100 };
    for (let seed = 0; seed < 50; seed++) {
      const genome = createSeedGenome("pothos", createRng(seed), extreme);
      // parse throws if any clamp failed
      expect(genomeSchema.parse(genome)).toEqual(genome);
    }
  });

  it("zero jitter yields the neutral base genome", () => {
    const genome = createSeedGenome("pothos", createRng(3), {
      seedJitter: 0,
      seedHueJitter: 0,
    });
    expect(genome.growthRate).toBe(1);
    expect(genome.size).toBe(1);
    expect(genome.hueShift).toBeCloseTo(0, 10);
    expect(genome.hardiness).toBe(1);
  });
});
