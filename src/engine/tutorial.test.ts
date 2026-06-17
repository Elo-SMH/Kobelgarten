import { describe, expect, it } from "vitest";
import { advanceTutorial, skipTutorial } from "./tutorial";
import type { TutorialStep } from "./schemas";

const steps: TutorialStep[] = [
  { id: "welcome", trigger: "next" },
  { id: "buy", trigger: "ready-to-plant" },
  { id: "done", trigger: "next" },
];

describe("advanceTutorial", () => {
  it("advances when the trigger matches the current step", () => {
    const next = advanceTutorial({ step: 0, done: false }, "next", steps);
    expect(next).toEqual({ step: 1, done: false });
  });

  it("ignores a trigger that does not match the current step", () => {
    const state = { step: 0, done: false };
    // Schritt 0 wartet auf "next", nicht auf "ready-to-plant".
    expect(advanceTutorial(state, "ready-to-plant", steps)).toBe(state);
  });

  it("marks the tutorial done after the last step", () => {
    const next = advanceTutorial({ step: 2, done: false }, "next", steps);
    expect(next).toEqual({ step: 3, done: true });
  });

  it("never advances once done (edge case)", () => {
    const state = { step: 3, done: true };
    expect(advanceTutorial(state, "next", steps)).toBe(state);
  });

  it("is robust against an out-of-range step index", () => {
    const state = { step: 99, done: false };
    expect(advanceTutorial(state, "next", steps)).toBe(state);
  });
});

describe("skipTutorial", () => {
  it("jumps past the last step and marks it done", () => {
    expect(skipTutorial(steps)).toEqual({ step: 3, done: true });
  });
});
