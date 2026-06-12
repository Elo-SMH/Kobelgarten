/**
 * Central tuning constants (game-design invariant: tune here, never inline
 * magic numbers elsewhere).
 */
export const CONFIG = {
  /** 1 tick = 1 real minute. */
  tickDurationMs: 60_000,
  /** Offline progress is capped at 48h of ticks. */
  offlineCapTicks: 48 * 60,
  /** Startkapital in Haselnüssen. */
  startHazelnuts: 50,
} as const;
