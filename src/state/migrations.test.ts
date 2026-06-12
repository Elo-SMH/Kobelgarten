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
    };
    expect(migrateSave(save, SAVE_VERSION)).toEqual(save);
  });

  it("migrates a v1 save to v2 with an empty 4-slot shelf", () => {
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
    });
  });

  it("throws when a migration step is missing", () => {
    // A save from a (hypothetical) version 0 — no step 1 is registered.
    expect(() => migrateSave({}, 0)).toThrow(/Save-Migration/);
  });
});
