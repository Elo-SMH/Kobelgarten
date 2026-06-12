import { describe, expect, it } from "vitest";
import { migrateSave, SAVE_VERSION } from "./migrations";

describe("migrateSave", () => {
  it("returns a current-version save unchanged", () => {
    const save = { tick: 42, lastTickAt: 1_000_000, hazelnuts: 50 };
    expect(migrateSave(save, SAVE_VERSION)).toEqual(save);
  });

  it("throws when a migration step is missing", () => {
    // A save from a (hypothetical) older version with no registered step.
    expect(() => migrateSave({}, SAVE_VERSION - 1)).toThrow(
      /Save-Migration/,
    );
  });
});
