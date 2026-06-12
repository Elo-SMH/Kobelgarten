import { describe, expect, it } from "vitest";
import {
  createPlant,
  phaseOf,
  tickPlant,
  tickPlantMany,
  waterPlant,
  type GrowthConfig,
  type PlantInstance,
} from "./growth";
import type { Genome, PlantSpecies } from "./schemas";

const config: GrowthConfig = {
  prachtProgress: 1.5,
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
};

const species: PlantSpecies = {
  id: "test-art",
  name: "Testart",
  basePrice: 10,
  growthTicks: 100,
  mutability: 0.02,
  waterDrainPerTick: 0.005,
  lightNeed: "bright",
  crossGroup: "test",
  allowedVariegations: ["sectoral"],
  leafShape: "heart",
  palette: { base: "#2d6a4f", varieg: "#f1faee" },
};

function makeGenome(overrides: Partial<Genome> = {}): Genome {
  return {
    speciesId: species.id,
    growthRate: 1,
    size: 1,
    hueShift: 0,
    hardiness: 1,
    variegation: { type: "none", coverage: 0, stability: 1 },
    ...overrides,
  };
}

/** Tick with care: re-water whenever the tank runs low. */
function growWithCare(
  plant: PlantInstance,
  ticks: number,
  placement: "window" | "shade" = "window",
): PlantInstance {
  let current = plant;
  for (let i = 0; i < ticks; i++) {
    if (current.water < 0.3) current = waterPlant(current);
    current = tickPlant(current, species, placement, config);
  }
  return current;
}

describe("phaseOf", () => {
  it("maps progress to the five phases", () => {
    expect(phaseOf(0, config)).toBe("seed");
    expect(phaseOf(0.05, config)).toBe("seedling");
    expect(phaseOf(0.3, config)).toBe("juvenile");
    expect(phaseOf(1, config)).toBe("adult");
    expect(phaseOf(1.5, config)).toBe("pracht");
  });
});

describe("tickPlant", () => {
  it("drains water each tick", () => {
    const plant = createPlant("p1", makeGenome());
    const after = tickPlantMany(plant, species, "window", 10, config);
    expect(after.water).toBeCloseTo(1 - 10 * species.waterDrainPerTick, 10);
  });

  it("grows from seed to adult under good care", () => {
    const plant = createPlant("p1", makeGenome());
    const after = growWithCare(plant, 110);
    expect(after.progress).toBeGreaterThanOrEqual(1);
    expect(phaseOf(after.progress, config)).toBe("adult");
    expect(after.dead).toBe(false);
  });

  it("keeps growing to Prachtexemplar and caps there", () => {
    const plant = createPlant("p1", makeGenome());
    const after = growWithCare(plant, 300);
    expect(after.progress).toBe(config.prachtProgress);
    expect(phaseOf(after.progress, config)).toBe("pracht");
  });

  it("growthRate gene scales growth speed", () => {
    const slow = growWithCare(createPlant("a", makeGenome({ growthRate: 0.5 })), 100);
    const fast = growWithCare(createPlant("b", makeGenome({ growthRate: 1.5 })), 100);
    expect(fast.progress).toBeCloseTo(slow.progress * 3, 5);
  });

  it("stops growing and wilts when dry", () => {
    const dry: PlantInstance = { ...createPlant("p1", makeGenome()), water: 0 };
    const after = tickPlantMany(dry, species, "window", 50, config);
    expect(after.progress).toBe(0);
    expect(after.wilt).toBeCloseTo(50 * config.wiltPerTick, 10);
    expect(after.dead).toBe(false);
  });

  it("dies after prolonged neglect", () => {
    const dry: PlantInstance = { ...createPlant("p1", makeGenome()), water: 0 };
    const after = tickPlantMany(dry, species, "window", 600, config);
    expect(after.dead).toBe(true);
    expect(after.wilt).toBe(1);
  });

  it("hardiness buffers wilting (edge: hardy plant survives what kills a frail one)", () => {
    const frail: PlantInstance = {
      ...createPlant("a", makeGenome({ hardiness: 0.5 })),
      water: 0,
    };
    const hardy: PlantInstance = {
      ...createPlant("b", makeGenome({ hardiness: 1.5 })),
      water: 0,
    };
    expect(tickPlantMany(frail, species, "window", 400, config).dead).toBe(true);
    expect(tickPlantMany(hardy, species, "window", 600, config).dead).toBe(false);
  });

  it("recovers from wilt while supplied with water", () => {
    const wilted: PlantInstance = { ...createPlant("p1", makeGenome()), wilt: 0.5 };
    const after = tickPlantMany(wilted, species, "window", 50, config);
    expect(after.wilt).toBeCloseTo(0.5 - 50 * config.wiltRecoveryPerTick, 10);
  });

  it("grows slower at low water", () => {
    const low: PlantInstance = { ...createPlant("a", makeGenome()), water: 0.1 };
    const after = tickPlant(low, species, "window", config);
    expect(after.progress).toBeCloseTo(config.lowWaterGrowthFactor / species.growthTicks, 10);
  });

  it("light placement matters according to the species' need", () => {
    const sunny = growWithCare(createPlant("a", makeGenome()), 50, "window");
    const shady = growWithCare(createPlant("b", makeGenome()), 50, "shade");
    // bright-need species grows at half speed in the shade
    expect(shady.progress).toBeCloseTo(sunny.progress * 0.5, 5);
  });

  it("a dead plant no longer changes", () => {
    const dead: PlantInstance = { ...createPlant("p1", makeGenome()), dead: true, wilt: 1 };
    expect(tickPlant(dead, species, "window", config)).toBe(dead);
    expect(waterPlant(dead)).toBe(dead);
  });
});

describe("waterPlant", () => {
  it("refills the tank", () => {
    const thirsty: PlantInstance = { ...createPlant("p1", makeGenome()), water: 0.05 };
    expect(waterPlant(thirsty).water).toBe(1);
  });
});
