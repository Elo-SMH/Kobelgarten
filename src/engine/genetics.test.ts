import { describe, expect, it } from "vitest";
import {
  canCross,
  createSeedGenome,
  cross,
  mutate,
  rollVariegation,
  type GeneticsConfig,
  type VariegationConfig,
} from "./genetics";
import { createRng, type Rng } from "./rng";
import { genomeSchema, type Genome, type PlantSpecies } from "./schemas";

const variegationConfig: VariegationConfig = {
  baselineMutability: 0.02,
  spontaneousChance: 0.02,
  spontaneousCoverage: [0.05, 0.15],
  freshStability: [0.3, 0.8],
  intensifyChance: 0.1,
  intensifyGain: [0.05, 0.15],
  typeJumpChance: 0.03,
  reversionFactor: 0.25,
};

const config: GeneticsConfig = {
  seedJitter: 0.1,
  seedHueJitter: 6,
  geneDrift: 0.05,
  hueDrift: 2,
  seedsPerCross: [1, 3],
  cuttingStartProgress: 0.05,
  variegation: variegationConfig,
};

function makeSpecies(overrides: Partial<PlantSpecies> = {}): PlantSpecies {
  return {
    id: "testus",
    name: "Testus",
    basePrice: 10,
    growthTicks: 600,
    mutability: 0.02, // = baseline → Tabellen-Chancen gelten 1:1
    waterDrainPerTick: 0.001,
    lightNeed: "medium",
    crossGroup: "araceae",
    allowedVariegations: ["marginata", "splash", "halfmoon", "albo"],
    leafShape: "heart",
    palette: { base: "#3a7d44", varieg: "#f1f6e8" },
    ...overrides,
  };
}

function makeGenome(overrides: Partial<Genome> = {}): Genome {
  return {
    speciesId: "testus",
    growthRate: 1,
    size: 1,
    hueShift: 0,
    hardiness: 1,
    variegation: { type: "none", coverage: 0, stability: 1 },
    ...overrides,
  };
}

/**
 * Skriptbarer Rng: Methoden ziehen aus festen Antwort-Listen und zeichnen
 * die an chance() übergebenen Wahrscheinlichkeiten auf — damit lässt sich
 * jede Zeile der Würfeltabelle (PLAN 2.2) einzeln und exakt prüfen.
 */
function fakeRng(script: {
  next?: number[];
  chance?: boolean[];
  int?: number[];
  pickIndex?: number[];
}): Rng & { chanceArgs: number[] } {
  const take = <T>(queue: T[] | undefined, label: string): T => {
    if (!queue || queue.length === 0) {
      throw new Error(`fakeRng: ${label}-Skript erschöpft`);
    }
    return queue.shift() as T;
  };
  const chanceArgs: number[] = [];
  return {
    chanceArgs,
    next: () => take(script.next, "next"),
    int: () => take(script.int, "int"),
    chance(probability) {
      chanceArgs.push(probability);
      return take(script.chance, "chance");
    },
    pick(items) {
      return items[take(script.pickIndex, "pickIndex")] as (typeof items)[number];
    },
  };
}

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
    const extreme: GeneticsConfig = { ...config, seedJitter: 5, seedHueJitter: 100 };
    for (let seed = 0; seed < 50; seed++) {
      const genome = createSeedGenome("pothos", createRng(seed), extreme);
      // parse throws if any clamp failed
      expect(genomeSchema.parse(genome)).toEqual(genome);
    }
  });

  it("zero jitter yields the neutral base genome", () => {
    const genome = createSeedGenome("pothos", createRng(3), {
      ...config,
      seedJitter: 0,
      seedHueJitter: 0,
    });
    expect(genome.growthRate).toBe(1);
    expect(genome.size).toBe(1);
    expect(genome.hueShift).toBeCloseTo(0, 10);
    expect(genome.hardiness).toBe(1);
  });
});

describe("rollVariegation — Würfeltabelle PLAN 2.2", () => {
  const none = { type: "none", coverage: 0, stability: 1 } as const;
  const splash = { type: "splash", coverage: 0.2, stability: 0.5 } as const;

  it("Zeile 1 — Spontane Variegation: none → zufälliger Typ, coverage 0.05–0.15", () => {
    const rng = fakeRng({
      chance: [true],
      pickIndex: [1], // allowedVariegations[1] = splash
      next: [0.5, 0.5], // coverage- und stability-Wurf, je Mitte der Spanne
    });
    const result = rollVariegation(none, makeSpecies(), rng, variegationConfig);
    expect(rng.chanceArgs).toEqual([0.02]); // Basischance 2 %
    expect(result).toEqual({ type: "splash", coverage: 0.1, stability: 0.55 });
  });

  it("Zeile 1 — Fehlschlag lässt das Genom unvariegiert", () => {
    const rng = fakeRng({ chance: [false] });
    const result = rollVariegation(none, makeSpecies(), rng, variegationConfig);
    expect(result).toEqual(none);
  });

  it("Zeile 2 — Verstärkung: coverage +0.05–0.15 mit Basischance 10 %", () => {
    const rng = fakeRng({
      chance: [false, true, false], // Reversion nein, Verstärkung ja, Sprung nein
      next: [0.5], // Zugewinn Mitte der Spanne = +0.1
    });
    const result = rollVariegation(splash, makeSpecies(), rng, variegationConfig);
    expect(rng.chanceArgs).toEqual([0.125, 0.1, 0.03]);
    expect(result.type).toBe("splash");
    expect(result.coverage).toBeCloseTo(0.3, 10);
    expect(result.stability).toBe(0.5);
  });

  it("Zeile 2 — coverage wird bei 0.6 gedeckelt (edge case)", () => {
    const rng = fakeRng({ chance: [false, true, false], next: [1] });
    const result = rollVariegation(
      { type: "splash", coverage: 0.55, stability: 1 },
      makeSpecies(),
      rng,
      variegationConfig,
    );
    expect(result.coverage).toBe(0.6);
  });

  it("Zeile 3 — Typ-Sprung: wechselt zu einem anderen erlaubten Typ (3 %)", () => {
    const rng = fakeRng({
      chance: [false, false, true],
      pickIndex: [2], // aus [marginata, halfmoon, albo] (ohne splash) → albo
    });
    const result = rollVariegation(splash, makeSpecies(), rng, variegationConfig);
    expect(rng.chanceArgs).toEqual([0.125, 0.1, 0.03]);
    expect(result).toEqual({ type: "albo", coverage: 0.2, stability: 0.5 });
  });

  it("Zeile 3 — kein Sprung möglich, wenn die Art nur einen Typ erlaubt (edge case)", () => {
    const species = makeSpecies({ allowedVariegations: ["marginata"] });
    const rng = fakeRng({ chance: [false, false, true] });
    const result = rollVariegation(
      { type: "marginata", coverage: 0.1, stability: 1 },
      species,
      rng,
      variegationConfig,
    );
    expect(result.type).toBe("marginata");
  });

  it("Zeile 4 — Reversion: Chance = (1 − stability) × 25 %, zurück zu none", () => {
    const rng = fakeRng({ chance: [true] });
    const result = rollVariegation(splash, makeSpecies(), rng, variegationConfig);
    expect(rng.chanceArgs).toEqual([(1 - 0.5) * 0.25]);
    expect(result).toEqual({ type: "none", coverage: 0, stability: 1 });
  });

  it("Zeile 4 — volle Stabilität macht die Reversion unmöglich", () => {
    const stable = { type: "albo", coverage: 0.3, stability: 1 } as const;
    const rng = fakeRng({ chance: [false, false, false] });
    rollVariegation(stable, makeSpecies(), rng, variegationConfig);
    expect(rng.chanceArgs[0]).toBe(0);
  });

  it("mutability und externer Multiplikator skalieren alles außer der Reversion", () => {
    const mutable = makeSpecies({ mutability: 0.04 }); // 2× baseline
    const rng = fakeRng({ chance: [false, false, false] });
    rollVariegation(splash, mutable, rng, variegationConfig, {
      chanceMultiplier: 2,
    });
    // Reversion bleibt 0.125; Verstärkung 0.1×4, Sprung 0.03×4
    expect(rng.chanceArgs).toEqual([0.125, 0.4, 0.12]);

    const rng2 = fakeRng({ chance: [false] });
    rollVariegation(none, mutable, rng2, variegationConfig, {
      chanceMultiplier: 2,
    });
    expect(rng2.chanceArgs).toEqual([0.08]); // 0.02 × 4
  });

  it("skalierte Chancen werden auf 1 gedeckelt (edge case)", () => {
    const extreme = makeSpecies({ mutability: 1 });
    const rng = fakeRng({ chance: [false] });
    rollVariegation(none, extreme, rng, variegationConfig, {
      chanceMultiplier: 100,
    });
    expect(rng.chanceArgs).toEqual([1]);
  });

  it("stabilityBonus hebt die Stabilität frischer Variegationen (M5-Talente)", () => {
    const rng = fakeRng({ chance: [true], pickIndex: [0], next: [0.5, 0] });
    const result = rollVariegation(none, makeSpecies(), rng, variegationConfig, {
      stabilityBonus: 0.2,
    });
    // freshStability-Spanne [0.3, 0.8] bei next()=0 → 0.3, plus Bonus 0.2
    expect(result.stability).toBeCloseTo(0.5);
  });

  it("stabilityBonus bleibt auf 1 gedeckelt (edge case)", () => {
    const rng = fakeRng({ chance: [true], pickIndex: [0], next: [0.5, 1] });
    const result = rollVariegation(none, makeSpecies(), rng, variegationConfig, {
      stabilityBonus: 5,
    });
    expect(result.stability).toBe(1);
  });
});

describe("mutate — Steckling (PLAN 2.1)", () => {
  it("is deterministic for the same rng seed", () => {
    const genome = makeGenome();
    const a = mutate(genome, makeSpecies(), createRng(11), config);
    const b = mutate(genome, makeSpecies(), createRng(11), config);
    expect(a).toEqual(b);
    expect(genomeSchema.parse(a)).toEqual(a);
  });

  it("drifts every gene by at most ±5 % (hueShift absolut)", () => {
    const genome = makeGenome({ hueShift: 10 });
    for (let seed = 0; seed < 200; seed++) {
      const result = mutate(genome, makeSpecies(), createRng(seed), config);
      expect(result.speciesId).toBe("testus");
      expect(result.growthRate).toBeGreaterThanOrEqual(0.95);
      expect(result.growthRate).toBeLessThanOrEqual(1.05);
      expect(result.size).toBeGreaterThanOrEqual(0.95);
      expect(result.size).toBeLessThanOrEqual(1.05);
      expect(result.hardiness).toBeGreaterThanOrEqual(0.95);
      expect(result.hardiness).toBeLessThanOrEqual(1.05);
      expect(result.hueShift).toBeGreaterThanOrEqual(8);
      expect(result.hueShift).toBeLessThanOrEqual(12);
    }
  });

  it("clamps genes at their schema bounds (edge case)", () => {
    const maxed = makeGenome({
      growthRate: 1.5,
      size: 1.3,
      hueShift: 20,
      hardiness: 1.5,
    });
    for (let seed = 0; seed < 100; seed++) {
      const result = mutate(maxed, makeSpecies(), createRng(seed), config);
      expect(genomeSchema.parse(result)).toEqual(result);
    }
  });

  it("würfelt spontane Variegation mit ≈2 % über viele Stecklinge (fixe Seeds)", () => {
    const genome = makeGenome();
    let variegated = 0;
    for (let seed = 0; seed < 2000; seed++) {
      const result = mutate(genome, makeSpecies(), createRng(seed), config);
      if (result.variegation.type !== "none") {
        variegated += 1;
        expect(result.variegation.coverage).toBeGreaterThanOrEqual(0.05);
        expect(result.variegation.coverage).toBeLessThanOrEqual(0.15);
      }
    }
    expect(variegated).toBeGreaterThan(20); // ≈ 2 % von 2000 = 40
    expect(variegated).toBeLessThan(80);
  });

  it("instabile Variegation revertiert mit ≈25 % bei stability 0 (fixe Seeds)", () => {
    const genome = makeGenome({
      variegation: { type: "albo", coverage: 0.3, stability: 0 },
    });
    let reverted = 0;
    for (let seed = 0; seed < 2000; seed++) {
      const result = mutate(genome, makeSpecies(), createRng(seed), config);
      if (result.variegation.type === "none") reverted += 1;
    }
    expect(reverted).toBeGreaterThan(400); // ≈ 25 % von 2000 = 500
    expect(reverted).toBeLessThan(600);
  });
});

describe("canCross / cross — Kreuzung (PLAN 2.1)", () => {
  const speciesA = makeSpecies({ id: "art-a", crossGroup: "araceae" });
  const speciesB = makeSpecies({ id: "art-b", crossGroup: "araceae" });
  const genomeA = makeGenome({
    speciesId: "art-a",
    growthRate: 1.4,
    size: 1.2,
    hueShift: 15,
    hardiness: 1.3,
  });
  const genomeB = makeGenome({
    speciesId: "art-b",
    growthRate: 0.6,
    size: 0.8,
    hueShift: -10,
    hardiness: 0.7,
    variegation: { type: "albo", coverage: 0.4, stability: 0.9 },
  });

  it("canCross vergleicht die crossGroup", () => {
    expect(canCross(speciesA, speciesB)).toBe(true);
    expect(
      canCross(speciesA, makeSpecies({ id: "fremd", crossGroup: "hoya" })),
    ).toBe(false);
  });

  it("cross wirft bei inkompatiblen Arten (edge case)", () => {
    const stranger = makeSpecies({ id: "fremd", crossGroup: "hoya" });
    expect(() =>
      cross(genomeA, speciesA, genomeB, stranger, createRng(1), config),
    ).toThrow(/nicht kompatibel/);
  });

  it("vererbt jedes Gen 50/50 von Elternteil A oder B (skriptierter Rng)", () => {
    const noDrift: GeneticsConfig = { ...config, geneDrift: 0, hueDrift: 0 };
    const rng = fakeRng({
      int: [1], // genau 1 Samen
      // Art ← A, growthRate ← B, size ← A, hueShift ← B, hardiness ← A,
      // Variegation ← B (als Ganzes)
      chance: [true, false, true, false, true, false, false, false, false],
      // 4 Drift-Würfe (wirkungslos bei geneDrift 0)
      next: [0.5, 0.5, 0.5, 0.5],
    });
    const seeds = cross(genomeA, speciesA, genomeB, speciesB, rng, noDrift);
    expect(seeds).toHaveLength(1);
    expect(seeds[0]).toEqual({
      speciesId: "art-a",
      growthRate: 0.6, // B
      size: 1.2, // A
      hueShift: -10, // B
      hardiness: 1.3, // A
      // Albo von B geerbt — bleibt erhalten, obwohl die Tabelle danach
      // gewürfelt hat (Reversion/Verstärkung/Sprung alle fehlgeschlagen)
      variegation: { type: "albo", coverage: 0.4, stability: 0.9 },
    });
  });

  it("liefert exakt rng.int(1, 4) Samen", () => {
    const counts = new Set<number>();
    for (let seed = 0; seed < 50; seed++) {
      const seeds = cross(
        genomeA,
        speciesA,
        genomeB,
        speciesB,
        createRng(seed),
        config,
      );
      expect(seeds.length).toBeGreaterThanOrEqual(1);
      expect(seeds.length).toBeLessThanOrEqual(3);
      counts.add(seeds.length);
      for (const genome of seeds) {
        expect(genomeSchema.parse(genome)).toEqual(genome);
        expect(["art-a", "art-b"]).toContain(genome.speciesId);
      }
    }
    expect(counts).toEqual(new Set([1, 2, 3]));
  });

  it("is deterministic for the same rng seed", () => {
    const a = cross(genomeA, speciesA, genomeB, speciesB, createRng(42), config);
    const b = cross(genomeA, speciesA, genomeB, speciesB, createRng(42), config);
    expect(a).toEqual(b);
  });

  it("extraSeeds erhöht die Samenzahl (Züchter-Talent, M5)", () => {
    for (let seed = 0; seed < 20; seed++) {
      const plain = cross(
        genomeA,
        speciesA,
        genomeB,
        speciesB,
        createRng(seed),
        config,
      );
      const boosted = cross(
        genomeA,
        speciesA,
        genomeB,
        speciesB,
        createRng(seed),
        config,
        { extraSeeds: 1 },
      );
      expect(boosted.length).toBe(plain.length + 1);
    }
  });

  it("mischt über viele Kreuzungen Gene beider Eltern (fixe Seeds)", () => {
    let fromA = 0;
    let total = 0;
    for (let seed = 0; seed < 300; seed++) {
      const noDrift: GeneticsConfig = { ...config, geneDrift: 0 };
      for (const genome of cross(
        genomeA,
        speciesA,
        genomeB,
        speciesB,
        createRng(seed),
        noDrift,
      )) {
        total += 1;
        if (genome.growthRate === 1.4) fromA += 1;
        else expect(genome.growthRate).toBe(0.6);
      }
    }
    // 50/50-Erwartung mit Toleranz
    expect(fromA / total).toBeGreaterThan(0.4);
    expect(fromA / total).toBeLessThan(0.6);
  });
});
