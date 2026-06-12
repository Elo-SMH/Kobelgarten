import { describe, expect, it } from "vitest";
import {
  genomeSchema,
  plantSpeciesSchema,
  type Genome,
  type PlantSpecies,
} from "./schemas";

const validGenome: Genome = {
  speciesId: "pothos",
  growthRate: 1,
  size: 1,
  hueShift: 0,
  hardiness: 1,
  variegation: { type: "none", coverage: 0, stability: 1 },
};

const validSpecies: PlantSpecies = {
  id: "test-art",
  name: "Testart",
  basePrice: 10,
  growthTicks: 600,
  mutability: 0.02,
  waterDrainPerTick: 0.001,
  lightNeed: "medium",
  crossGroup: "test",
  allowedVariegations: ["sectoral", "albo"],
  leafShape: "heart",
  palette: { base: "#2d6a4f", varieg: "#f1faee" },
};

describe("genomeSchema", () => {
  it("accepts a valid genome", () => {
    expect(genomeSchema.parse(validGenome)).toEqual(validGenome);
  });

  it("rejects out-of-range gene values", () => {
    expect(genomeSchema.safeParse({ ...validGenome, growthRate: 1.6 }).success).toBe(false);
    expect(genomeSchema.safeParse({ ...validGenome, size: 0.5 }).success).toBe(false);
    expect(genomeSchema.safeParse({ ...validGenome, hueShift: 25 }).success).toBe(false);
    expect(genomeSchema.safeParse({ ...validGenome, hardiness: 0.2 }).success).toBe(false);
  });

  it("rejects variegation coverage above 0.6", () => {
    const genome = {
      ...validGenome,
      variegation: { type: "albo", coverage: 0.7, stability: 1 },
    };
    expect(genomeSchema.safeParse(genome).success).toBe(false);
  });

  it("rejects an unknown variegation type", () => {
    const genome = {
      ...validGenome,
      variegation: { type: "gestreift", coverage: 0.1, stability: 1 },
    };
    expect(genomeSchema.safeParse(genome).success).toBe(false);
  });
});

describe("plantSpeciesSchema", () => {
  it("accepts a valid species", () => {
    expect(plantSpeciesSchema.parse(validSpecies)).toEqual(validSpecies);
  });

  it("rejects 'none' in allowedVariegations", () => {
    const species = { ...validSpecies, allowedVariegations: ["none", "albo"] };
    expect(plantSpeciesSchema.safeParse(species).success).toBe(false);
  });

  it("rejects an empty allowedVariegations list", () => {
    const species = { ...validSpecies, allowedVariegations: [] };
    expect(plantSpeciesSchema.safeParse(species).success).toBe(false);
  });

  it("rejects malformed palette colors", () => {
    const species = { ...validSpecies, palette: { base: "green", varieg: "#fff" } };
    expect(plantSpeciesSchema.safeParse(species).success).toBe(false);
  });

  it("rejects non-positive prices and growth ticks", () => {
    expect(plantSpeciesSchema.safeParse({ ...validSpecies, basePrice: 0 }).success).toBe(false);
    expect(plantSpeciesSchema.safeParse({ ...validSpecies, growthTicks: 0 }).success).toBe(false);
    expect(plantSpeciesSchema.safeParse({ ...validSpecies, growthTicks: 1.5 }).success).toBe(false);
  });

  it("rejects uppercase or spaced ids", () => {
    expect(plantSpeciesSchema.safeParse({ ...validSpecies, id: "Pothos" }).success).toBe(false);
    expect(plantSpeciesSchema.safeParse({ ...validSpecies, id: "efeu tute" }).success).toBe(false);
  });
});
