import { describe, expect, it } from "vitest";
import { migrateSave, SAVE_VERSION, type SaveV1 } from "./migrations";

describe("migrateSave", () => {
  it("returns a current-version save unchanged", () => {
    const save = {
      tick: 42,
      lastTickAt: 1_000_000,
      hazelnuts: 50,
      plants: {},
      shelf: [],
      plantCounter: 0,
      inventory: {},
      wateringCanLevel: 1,
      propagules: {},
      propaguleCounter: 0,
      xp: 0,
      talentRanks: {},
      activeEvents: [],
      eventCounter: 0,
      lexicon: {},
      lexiconRewardsClaimed: 0,
    };
    expect(migrateSave(save, SAVE_VERSION)).toEqual(save);
  });

  it("migrates a v1 save through all steps to the current version", () => {
    const v1: SaveV1 = { tick: 42, lastTickAt: 1_000_000, hazelnuts: 77 };
    const migrated = migrateSave(v1, 1);
    expect(migrated).toEqual({
      tick: 42,
      lastTickAt: 1_000_000,
      hazelnuts: 77,
      plants: {},
      shelf: [
        { placement: "window", plantId: null },
        { placement: "window", plantId: null },
        { placement: "shade", plantId: null },
        { placement: "shade", plantId: null },
      ],
      plantCounter: 0,
      inventory: {},
      wateringCanLevel: 1,
      propagules: {},
      propaguleCounter: 0,
      xp: 0,
      talentRanks: {},
      activeEvents: [],
      eventCounter: 0,
      lexicon: {},
      lexiconRewardsClaimed: 0,
      squirrelId: "hasel",
      tutorialStep: 9,
      tutorialDone: true,
    });
  });

  it("v5 → v6 gives existing players a default squirrel and a finished tutorial", () => {
    const v5 = {
      tick: 10,
      lastTickAt: 1_000_000,
      hazelnuts: 200,
      plants: {},
      shelf: [],
      plantCounter: 0,
      inventory: {},
      wateringCanLevel: 1,
      propagules: {},
      propaguleCounter: 0,
      xp: 130,
      talentRanks: { feilschen: 1 },
      activeEvents: [],
      eventCounter: 0,
      lexicon: {},
      lexiconRewardsClaimed: 0,
    };
    const migrated = migrateSave(v5, 5);
    expect(migrated.squirrelId).toBe("hasel");
    expect(migrated.tutorialDone).toBe(true);
    expect(migrated.tutorialStep).toBeGreaterThan(0);
    // Bestehende Felder bleiben unangetastet.
    expect(migrated.xp).toBe(130);
    expect(migrated.talentRanks).toEqual({ feilschen: 1 });
  });

  it("v3 → v4 adds the empty breeding inventory", () => {
    const v3 = {
      tick: 1,
      lastTickAt: 1_000_000,
      hazelnuts: 10,
      plants: {},
      shelf: [],
      plantCounter: 0,
      inventory: { "pot-small": 1 },
      wateringCanLevel: 2,
    };
    const migrated = migrateSave(v3, 3);
    expect(migrated.propagules).toEqual({});
    expect(migrated.propaguleCounter).toBe(0);
  });

  it("v4 → v5 seeds the lexicon from existing plants and propagules", () => {
    const genome = (speciesId: string, type: string) => ({
      speciesId,
      growthRate: 1,
      size: 1,
      hueShift: 0,
      hardiness: 1,
      variegation: { type, coverage: type === "none" ? 0 : 0.2, stability: 1 },
    });
    const v4 = {
      tick: 500,
      lastTickAt: 1_000_000,
      hazelnuts: 10,
      plants: {
        "plant-1": { id: "plant-1", genome: genome("pothos", "none") },
        "plant-2": { id: "plant-2", genome: genome("monstera", "albo") },
      },
      shelf: [],
      plantCounter: 2,
      inventory: {},
      wateringCanLevel: 1,
      propagules: {
        "prop-1": { id: "prop-1", kind: "seed", genome: genome("pothos", "splash") },
      },
      propaguleCounter: 1,
    };
    const migrated = migrateSave(v4, 4);
    expect(migrated.xp).toBe(0);
    expect(migrated.talentRanks).toEqual({});
    expect(migrated.activeEvents).toEqual([]);
    expect(migrated.eventCounter).toBe(0);
    expect(migrated.lexiconRewardsClaimed).toBe(0);
    expect(migrated.lexicon).toEqual({
      "pothos:none": 500,
      "monstera:albo": 500,
      "pothos:splash": 500,
    });
  });

  it("v2 → v3 gives existing plants a large pot and no fertilizer buff", () => {
    const v2 = {
      tick: 42,
      lastTickAt: 1_000_000,
      hazelnuts: 77,
      plants: {
        "plant-1": { id: "plant-1", progress: 1.4, water: 1, wilt: 0 },
      },
      shelf: [{ placement: "window", plantId: "plant-1" }],
      plantCounter: 1,
    };
    const migrated = migrateSave(v2, 2);
    expect(migrated.inventory).toEqual({});
    expect(migrated.wateringCanLevel).toBe(1);
    expect(migrated.plants["plant-1"]).toEqual({
      id: "plant-1",
      progress: 1.4,
      water: 1,
      wilt: 0,
      potSize: "large",
      fertilizerTicks: 0,
    });
  });

  it("throws when a migration step is missing", () => {
    // A save from a (hypothetical) version 0 — no step 1 is registered.
    expect(() => migrateSave({}, 0)).toThrow(/Save-Migration/);
  });
});
