import { describe, expect, it } from "vitest";
import {
  createPlant,
  fertilizePlant,
  NEUTRAL_TICK_MODIFIERS,
  phaseOf,
  tickPlant,
  tickPlantMany,
  waterPlant,
  type GrowthConfig,
  type PlantInstance,
} from "./growth";
import type { Genome, PlantSpecies, PotSize } from "./schemas";

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
  potCaps: { small: 0.6, medium: 1, large: 1.5 },
  fertilizer: { growthFactor: 1.5, durationTicks: 100 },
  autoWaterThreshold: 0.1,
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

describe("createPlant", () => {
  it("starts at progress 0 by default, cuttings get a head start", () => {
    expect(createPlant("p-1", makeGenome(), "small").progress).toBe(0);
    const cutting = createPlant("p-2", makeGenome(), "small", 0.05);
    expect(cutting.progress).toBe(0.05);
    expect(phaseOf(cutting.progress, config)).toBe("seedling");
  });
});

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
    const plant = createPlant("p1", makeGenome(), "large");
    const after = tickPlantMany(plant, species, "window", 10, config);
    expect(after.water).toBeCloseTo(1 - 10 * species.waterDrainPerTick, 10);
  });

  it("grows from seed to adult under good care", () => {
    const plant = createPlant("p1", makeGenome(), "large");
    const after = growWithCare(plant, 110);
    expect(after.progress).toBeGreaterThanOrEqual(1);
    expect(phaseOf(after.progress, config)).toBe("adult");
    expect(after.dead).toBe(false);
  });

  it("keeps growing to Prachtexemplar and caps there", () => {
    const plant = createPlant("p1", makeGenome(), "large");
    const after = growWithCare(plant, 300);
    expect(after.progress).toBe(config.prachtProgress);
    expect(phaseOf(after.progress, config)).toBe("pracht");
  });

  it("growthRate gene scales growth speed", () => {
    const slow = growWithCare(createPlant("a", makeGenome({ growthRate: 0.5 }), "large"), 100);
    const fast = growWithCare(createPlant("b", makeGenome({ growthRate: 1.5 }), "large"), 100);
    expect(fast.progress).toBeCloseTo(slow.progress * 3, 5);
  });

  it("stops growing and wilts when dry", () => {
    const dry: PlantInstance = { ...createPlant("p1", makeGenome(), "large"), water: 0 };
    const after = tickPlantMany(dry, species, "window", 50, config);
    expect(after.progress).toBe(0);
    expect(after.wilt).toBeCloseTo(50 * config.wiltPerTick, 10);
    expect(after.dead).toBe(false);
  });

  it("dies after prolonged neglect", () => {
    const dry: PlantInstance = { ...createPlant("p1", makeGenome(), "large"), water: 0 };
    const after = tickPlantMany(dry, species, "window", 600, config);
    expect(after.dead).toBe(true);
    expect(after.wilt).toBe(1);
  });

  it("hardiness buffers wilting (edge: hardy plant survives what kills a frail one)", () => {
    const frail: PlantInstance = {
      ...createPlant("a", makeGenome({ hardiness: 0.5 }), "large"),
      water: 0,
    };
    const hardy: PlantInstance = {
      ...createPlant("b", makeGenome({ hardiness: 1.5 }), "large"),
      water: 0,
    };
    expect(tickPlantMany(frail, species, "window", 400, config).dead).toBe(true);
    expect(tickPlantMany(hardy, species, "window", 600, config).dead).toBe(false);
  });

  it("recovers from wilt while supplied with water", () => {
    const wilted: PlantInstance = { ...createPlant("p1", makeGenome(), "large"), wilt: 0.5 };
    const after = tickPlantMany(wilted, species, "window", 50, config);
    expect(after.wilt).toBeCloseTo(0.5 - 50 * config.wiltRecoveryPerTick, 10);
  });

  it("grows slower at low water", () => {
    const low: PlantInstance = { ...createPlant("a", makeGenome(), "large"), water: 0.1 };
    const after = tickPlant(low, species, "window", config);
    expect(after.progress).toBeCloseTo(config.lowWaterGrowthFactor / species.growthTicks, 10);
  });

  it("light placement matters according to the species' need", () => {
    const sunny = growWithCare(createPlant("a", makeGenome(), "large"), 50, "window");
    const shady = growWithCare(createPlant("b", makeGenome(), "large"), 50, "shade");
    // bright-need species grows at half speed in the shade
    expect(shady.progress).toBeCloseTo(sunny.progress * 0.5, 5);
  });

  it("pot size caps growth (small pot stops at the juvenile limit)", () => {
    const potted = (size: PotSize) =>
      growWithCare(createPlant("p1", makeGenome(), size), 300);
    expect(potted("small").progress).toBe(config.potCaps.small);
    expect(potted("medium").progress).toBe(config.potCaps.medium);
    expect(potted("large").progress).toBe(config.prachtProgress);
  });

  it("never shrinks a plant already above its pot cap (edge: migration)", () => {
    const oversized: PlantInstance = {
      ...createPlant("p1", makeGenome(), "small"),
      progress: 1.2,
    };
    const after = growWithCare(oversized, 10);
    expect(after.progress).toBe(1.2);
  });

  it("fertilizer boosts growth while active and expires afterwards", () => {
    const plain = growWithCare(createPlant("a", makeGenome(), "large"), 50);
    const boosted = growWithCare(
      fertilizePlant(createPlant("b", makeGenome(), "large"), config),
      50,
    );
    expect(boosted.progress).toBeCloseTo(
      plain.progress * config.fertilizer.growthFactor,
      5,
    );
    expect(boosted.fertilizerTicks).toBe(config.fertilizer.durationTicks - 50);

    const expired = growWithCare(boosted, 100);
    expect(expired.fertilizerTicks).toBe(0);
  });

  it("the fertilizer buff ticks down even while the plant is dry", () => {
    const dry: PlantInstance = {
      ...fertilizePlant(createPlant("p1", makeGenome(), "large"), config),
      water: 0,
    };
    const after = tickPlantMany(dry, species, "window", 10, config);
    expect(after.fertilizerTicks).toBe(config.fertilizer.durationTicks - 10);
    expect(after.progress).toBe(0);
  });

  it("a dead plant no longer changes", () => {
    const dead: PlantInstance = { ...createPlant("p1", makeGenome(), "large"), dead: true, wilt: 1 };
    expect(tickPlant(dead, species, "window", config)).toBe(dead);
    expect(waterPlant(dead)).toBe(dead);
    expect(fertilizePlant(dead, config)).toBe(dead);
  });
});

describe("waterPlant", () => {
  it("refills the tank", () => {
    const thirsty: PlantInstance = { ...createPlant("p1", makeGenome(), "large"), water: 0.05 };
    expect(waterPlant(thirsty).water).toBe(1);
  });

  it("Talent-Tank füllt über 1 hinaus und schrumpft volle Tanks nie", () => {
    const thirsty: PlantInstance = { ...createPlant("p1", makeGenome(), "large"), water: 0.05 };
    expect(waterPlant(thirsty, 1.5).water).toBe(1.5);
    const overfull: PlantInstance = { ...createPlant("p2", makeGenome(), "large"), water: 1.5 };
    expect(waterPlant(overfull, 1).water).toBe(1.5);
  });
});

describe("TickModifiers (Skills & Ereignisse, M5)", () => {
  it("growthFactor skaliert das Wachstum", () => {
    const plant = createPlant("p1", makeGenome(), "large");
    const slow = tickPlant(plant, species, "window", config, {
      ...NEUTRAL_TICK_MODIFIERS,
      growthFactor: 0.5,
    });
    const normal = tickPlant(plant, species, "window", config);
    expect(slow.progress).toBeCloseTo(normal.progress / 2);
  });

  it("growthFactor 0 stoppt das Wachstum komplett (Sonnenbrand)", () => {
    const plant = createPlant("p1", makeGenome(), "large");
    const after = tickPlantMany(plant, species, "window", 10, config, {
      ...NEUTRAL_TICK_MODIFIERS,
      growthFactor: 0,
    });
    expect(after.progress).toBe(0);
  });

  it("extraWiltPerTick welkt auch eine versorgte Pflanze", () => {
    const plant = createPlant("p1", makeGenome(), "large");
    const after = tickPlantMany(plant, species, "window", 10, config, {
      ...NEUTRAL_TICK_MODIFIERS,
      extraWiltPerTick: 0.01,
    });
    // Gegossen erholt sie sich pro Tick um 0.004, der Sonnenbrand legt 0.01
    // drauf: Tick 1 netto +0.01 (Erholung clampt bei 0), danach +0.006.
    expect(after.wilt).toBeCloseTo(0.01 + 9 * (0.01 - config.wiltRecoveryPerTick));
  });

  it("wiltFactor dämpft die Trocken-Welke (Welke-Schutz)", () => {
    const dry: PlantInstance = { ...createPlant("p1", makeGenome(), "large"), water: 0 };
    const after = tickPlant(dry, species, "window", config, {
      ...NEUTRAL_TICK_MODIFIERS,
      wiltFactor: 0.5,
    });
    expect(after.wilt).toBeCloseTo(config.wiltPerTick / 2);
  });

  it("autoWater füllt den Tank nach, bevor die Pflanze austrocknet", () => {
    const low: PlantInstance = { ...createPlant("p1", makeGenome(), "large"), water: 0.08 };
    const after = tickPlant(low, species, "window", config, {
      ...NEUTRAL_TICK_MODIFIERS,
      autoWater: true,
    });
    expect(after.water).toBeCloseTo(1 - species.waterDrainPerTick);
    const fine: PlantInstance = { ...createPlant("p2", makeGenome(), "large"), water: 0.5 };
    expect(
      tickPlant(fine, species, "window", config, {
        ...NEUTRAL_TICK_MODIFIERS,
        autoWater: true,
      }).water,
    ).toBeCloseTo(0.5 - species.waterDrainPerTick);
  });
});
