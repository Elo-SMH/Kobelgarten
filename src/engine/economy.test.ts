import { describe, expect, it } from "vitest";
import {
  dailyOffer,
  dateKey,
  discountedPrice,
  plantValue,
  shelfSlotPrice,
  type EconomyConfig,
} from "./economy";
import { createPlant, type GrowthConfig, type PlantInstance } from "./growth";
import type { Genome, PlantSpecies, VariegationType } from "./schemas";

const growthConfig: GrowthConfig = {
  prachtProgress: 1.5,
  growthSpeed: 1,
  waterDrainMultiplier: 1,
  phaseThresholds: { seedling: 0.05, juvenile: 0.3, adult: 1 },
  lowWaterThreshold: 0.2,
  lowWaterGrowthFactor: 0.5,
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

const economy: EconomyConfig = {
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
};

const species: PlantSpecies = {
  id: "test-art",
  name: "Testart",
  basePrice: 100,
  growthTicks: 100,
  mutability: 0.02,
  waterDrainPerTick: 0.005,
  lightNeed: "bright",
  crossGroup: "test",
  allowedVariegations: ["albo"],
  leafShape: "heart",
  palette: { base: "#2d6a4f", varieg: "#f1faee" },
};

function makePlant(overrides: Partial<PlantInstance> = {}): PlantInstance {
  const genome: Genome = {
    speciesId: species.id,
    growthRate: 1,
    size: 1,
    hueShift: 0,
    hardiness: 1,
    variegation: { type: "none", coverage: 0, stability: 1 },
  };
  return { ...createPlant("p1", genome, "large"), ...overrides };
}

function withVariegation(
  type: VariegationType,
  coverage: number,
): PlantInstance {
  const plant = makePlant({ progress: 1 });
  return {
    ...plant,
    genome: {
      ...plant.genome,
      variegation: { type, coverage, stability: 1 },
    },
  };
}

describe("plantValue", () => {
  it("values an unvariegated adult at basePrice × size × adult factor", () => {
    const adult = makePlant({ progress: 1 });
    expect(plantValue(adult, species, growthConfig, economy)).toBe(
      100 * 1 * economy.phaseValueFactors.adult,
    );
  });

  it("scales with the size gene and the growth phase", () => {
    const bigSeedling = makePlant({ progress: 0.05 });
    bigSeedling.genome = { ...bigSeedling.genome, size: 1.3 };
    expect(plantValue(bigSeedling, species, growthConfig, economy)).toBe(
      Math.round(100 * 1.3 * economy.phaseValueFactors.seedling),
    );
    const pracht = makePlant({ progress: 1.5 });
    expect(plantValue(pracht, species, growthConfig, economy)).toBe(
      100 * economy.phaseValueFactors.pracht,
    );
  });

  it("applies the variegation formula (PLAN 2.2): 1 + coverage × mult × 8", () => {
    const splash = withVariegation("splash", 0.2);
    // 100 × 2 × (1 + 0.2 × 1.5 × 8) = 200 × 3.4
    expect(plantValue(splash, species, growthConfig, economy)).toBe(680);
  });

  it("albo at high coverage is the jackpot (edge: max coverage)", () => {
    const albo = withVariegation("albo", 0.6);
    // 100 × 2 × (1 + 0.6 × 4 × 8) = 200 × 20.2
    expect(plantValue(albo, species, growthConfig, economy)).toBe(4040);
    const none = withVariegation("none", 0.6);
    expect(plantValue(none, species, growthConfig, economy)).toBe(200);
  });

  it("a dead plant is worthless", () => {
    const dead = makePlant({ progress: 1, dead: true });
    expect(plantValue(dead, species, growthConfig, economy)).toBe(0);
  });

  it("never drops below 1 🌰 for a living plant (edge: cheap seed)", () => {
    const cheapSpecies = { ...species, basePrice: 1 };
    const seed = makePlant({ progress: 0 });
    expect(plantValue(seed, cheapSpecies, growthConfig, economy)).toBe(1);
  });
});

describe("shelfSlotPrice", () => {
  it("starts at the base price and grows exponentially", () => {
    const pricing = { basePrice: 100, growthFactor: 1.5 };
    expect(shelfSlotPrice(0, pricing)).toBe(100);
    expect(shelfSlotPrice(1, pricing)).toBe(150);
    expect(shelfSlotPrice(2, pricing)).toBe(225);
  });
});

describe("dailyOffer", () => {
  const pool = ["seed-pothos", "pot-small", "pot-medium", "duenger"];

  it("is deterministic for the same calendar date", () => {
    const a = dailyOffer("2026-06-12", pool, 0.3);
    const b = dailyOffer("2026-06-12", pool, 0.3);
    expect(a).toEqual(b);
    expect(pool).toContain(a?.itemId);
    expect(a?.discount).toBe(0.3);
  });

  it("varies across dates", () => {
    const offers = new Set(
      Array.from({ length: 30 }, (_, day) =>
        dailyOffer(`2026-06-${String(day + 1).padStart(2, "0")}`, pool, 0.3),
      ).map((offer) => offer?.itemId),
    );
    expect(offers.size).toBeGreaterThan(1);
  });

  it("returns null for an empty pool (edge case)", () => {
    expect(dailyOffer("2026-06-12", [], 0.3)).toBeNull();
  });
});

describe("discountedPrice", () => {
  it("rounds to whole hazelnuts and never drops below 1", () => {
    expect(discountedPrice(10, 0.3)).toBe(7);
    expect(discountedPrice(25, 0.3)).toBe(18);
    expect(discountedPrice(1, 0.9)).toBe(1);
  });
});

describe("dateKey", () => {
  it("formats the local calendar day with zero padding", () => {
    expect(dateKey(new Date(2026, 5, 3))).toBe("2026-06-03");
    expect(dateKey(new Date(2026, 11, 24))).toBe("2026-12-24");
  });
});
