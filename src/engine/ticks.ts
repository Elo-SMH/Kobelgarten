/**
 * Tick engine: 1 tick = 1 real minute. On app start (and periodically while
 * running) the store calls advanceTicks() with the current wall-clock time;
 * the engine itself never reads the clock.
 */
export interface TickState {
  /** Total ticks simulated since the save was created. */
  tick: number;
  /** Epoch ms of the last applied tick boundary. */
  lastTickAt: number;
}

export interface TickConfig {
  tickDurationMs: number;
  /** Offline catch-up cap, in ticks (48 h per game design). */
  offlineCapTicks: number;
}

export interface TickAdvanceResult {
  state: TickState;
  /** How many ticks were applied in this catch-up. */
  applied: number;
  /** True if elapsed time exceeded the offline cap (excess is forfeited). */
  capped: boolean;
}

export function advanceTicks(
  state: TickState,
  now: number,
  config: TickConfig,
): TickAdvanceResult {
  // Clock moved backwards (manual change, DST quirk): re-anchor instead of
  // freezing the game until the old timestamp is reached again.
  if (now < state.lastTickAt) {
    return {
      state: { tick: state.tick, lastTickAt: now },
      applied: 0,
      capped: false,
    };
  }

  const elapsedTicks = Math.floor(
    (now - state.lastTickAt) / config.tickDurationMs,
  );
  if (elapsedTicks <= 0) {
    return { state, applied: 0, capped: false };
  }

  const capped = elapsedTicks > config.offlineCapTicks;
  const applied = capped ? config.offlineCapTicks : elapsedTicks;
  // When capped, time beyond the cap is forfeited, so re-anchor at `now`.
  // Otherwise keep the sub-minute remainder for the next tick.
  const lastTickAt = capped
    ? now
    : state.lastTickAt + applied * config.tickDurationMs;

  return {
    state: { tick: state.tick + applied, lastTickAt },
    applied,
    capped,
  };
}
