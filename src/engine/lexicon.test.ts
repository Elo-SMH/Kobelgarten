import { describe, expect, it } from "vitest";
import {
  comboKey,
  discoverCombos,
  lexiconCompletion,
  reachableVariegations,
  totalComboCount,
} from "./lexicon";
import type { Genome, PlantSpecies } from "./schemas";

function makeSpecies(overrides: Partial<PlantSpecies> = {}): PlantSpecies {
  return {
    id: "testus",
    name: "Testus",
    basePrice: 10,
    growthTicks: 600,
    mutability: 0.02,
    waterDrainPerTick: 0.001,
    lightNeed: "medium",
    crossGroup: "araceae",
    allowedVariegations: ["splash"],
    leafShape: "heart",
    palette: { base: "#3a7d44", varieg: "#f1f6e8" },
    ...overrides,
  };
}

const speciesA = makeSpecies({ id: "art-a", allowedVariegations: ["splash"] });
const speciesB = makeSpecies({
  id: "art-b",
  allowedVariegations: ["albo", "halfmoon"],
});
const stranger = makeSpecies({
  id: "fremd",
  crossGroup: "hoya",
  allowedVariegations: ["marginata"],
});
const all = [speciesA, speciesB, stranger];

function makeGenome(speciesId: string, type: Genome["variegation"]["type"]): Genome {
  return {
    speciesId,
    growthRate: 1,
    size: 1,
    hueShift: 0,
    hardiness: 1,
    variegation: { type, coverage: type === "none" ? 0 : 0.2, stability: 0.8 },
  };
}

describe("reachableVariegations", () => {
  it("enthält none, eigene Typen und die der Kreuzungspartner", () => {
    expect(reachableVariegations(speciesA, all)).toEqual([
      "none",
      "splash",
      "halfmoon",
      "albo",
    ]);
  });

  it("fremde crossGroups färben nicht ab", () => {
    expect(reachableVariegations(stranger, all)).toEqual(["none", "marginata"]);
  });
});

describe("totalComboCount", () => {
  it("summiert die Raster-Zellen aller Arten", () => {
    // art-a: 4, art-b: 4, fremd: 2
    expect(totalComboCount(all)).toBe(10);
  });
});

describe("discoverCombos", () => {
  it("trägt neue Kombis mit Tick ein und meldet sie als Erstzüchtung", () => {
    const result = discoverCombos({}, [makeGenome("art-a", "splash")], 42);
    expect(result.discovered).toEqual(["art-a:splash"]);
    expect(result.lexicon).toEqual({ "art-a:splash": 42 });
  });

  it("bekannte Kombis bleiben unberührt, Duplikate zählen einmal (edge case)", () => {
    const existing = { "art-a:splash": 1 };
    const result = discoverCombos(
      existing,
      [
        makeGenome("art-a", "splash"),
        makeGenome("art-b", "albo"),
        makeGenome("art-b", "albo"),
      ],
      99,
    );
    expect(result.discovered).toEqual(["art-b:albo"]);
    expect(result.lexicon["art-a:splash"]).toBe(1);
    expect(existing).toEqual({ "art-a:splash": 1 });
  });
});

describe("lexiconCompletion", () => {
  it("zählt nur Raster-Kombis", () => {
    const lexicon = {
      [comboKey("art-a", "none")]: 1,
      "unbekannte-art:albo": 2, // außerhalb des Rasters
    };
    expect(lexiconCompletion(lexicon, all)).toBeCloseTo(1 / 10);
  });

  it("volles Lexikon → 1, leere Artenliste → 0 (edge case)", () => {
    const full: Record<string, number> = {};
    for (const species of all) {
      for (const type of reachableVariegations(species, all)) {
        full[comboKey(species.id, type)] = 1;
      }
    }
    expect(lexiconCompletion(full, all)).toBe(1);
    expect(lexiconCompletion({}, [])).toBe(0);
  });
});
