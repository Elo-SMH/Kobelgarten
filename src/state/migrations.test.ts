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
