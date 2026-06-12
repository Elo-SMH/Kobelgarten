import { describe, expect, it } from "vitest";
import { advanceTicks, type TickConfig, type TickState } from "./ticks";

const config: TickConfig = {
  tickDurationMs: 60_000,
  offlineCapTicks: 48 * 60, // 2880
};

const start: TickState = { tick: 0, lastTickAt: 1_000_000 };

describe("advanceTicks", () => {
  it("applies no tick before a full minute has passed", () => {
    const result = advanceTicks(start, start.lastTickAt + 59_999, config);
    expect(result.applied).toBe(0);
    expect(result.capped).toBe(false);
    expect(result.state).toEqual(start);
  });

  it("applies exactly one tick after one minute", () => {
    const result = advanceTicks(start, start.lastTickAt + 60_000, config);
    expect(result.applied).toBe(1);
    expect(result.state.tick).toBe(1);
    expect(result.state.lastTickAt).toBe(start.lastTickAt + 60_000);
  });

  it("catches up multiple missed ticks and keeps the sub-minute remainder", () => {
    // 5 minutes and 30 seconds elapsed -> 5 ticks, 30 s carried over
    const now = start.lastTickAt + 5 * 60_000 + 30_000;
    const result = advanceTicks(start, now, config);
    expect(result.applied).toBe(5);
    expect(result.state.tick).toBe(5);
    expect(result.state.lastTickAt).toBe(start.lastTickAt + 5 * 60_000);

    // 30 more seconds complete the next tick
    const next = advanceTicks(result.state, now + 30_000, config);
    expect(next.applied).toBe(1);
    expect(next.state.tick).toBe(6);
  });

  it("caps offline progress at 48h of ticks", () => {
    const now = start.lastTickAt + 72 * 60 * 60_000; // 72h away
    const result = advanceTicks(start, now, config);
    expect(result.applied).toBe(2880);
    expect(result.state.tick).toBe(2880);
    expect(result.capped).toBe(true);
    // Excess time is forfeited: re-anchored at `now`, not 24h in the past.
    expect(result.state.lastTickAt).toBe(now);
  });

  it("applies exactly the cap without flagging at exactly 48h", () => {
    const now = start.lastTickAt + 48 * 60 * 60_000;
    const result = advanceTicks(start, now, config);
    expect(result.applied).toBe(2880);
    expect(result.capped).toBe(false);
  });

  it("re-anchors without ticking when the clock moved backwards", () => {
    const result = advanceTicks(start, start.lastTickAt - 10_000, config);
    expect(result.applied).toBe(0);
    expect(result.state.tick).toBe(0);
    expect(result.state.lastTickAt).toBe(start.lastTickAt - 10_000);
  });

  it("accumulates onto an existing tick count", () => {
    const state: TickState = { tick: 100, lastTickAt: 1_000_000 };
    const result = advanceTicks(state, state.lastTickAt + 3 * 60_000, config);
    expect(result.state.tick).toBe(103);
  });
});
