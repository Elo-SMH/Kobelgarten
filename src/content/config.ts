import type { GeneticsConfig } from "../engine/genetics";
import type { GrowthConfig } from "../engine/growth";
import type { LightPlacement } from "../engine/schemas";

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

  genetics: {
    seedJitter: 0.1,
    seedHueJitter: 6,
  } satisfies GeneticsConfig,

  growth: {
    prachtProgress: 1.5,
    phaseThresholds: { seedling: 0.05, juvenile: 0.3, adult: 1 },
    lowWaterThreshold: 0.2,
    lowWaterGrowthFactor: 0.5,
    // trocken: Tod nach ~500 Ticks (≈ 8h) bei hardiness 1
    wiltPerTick: 0.002,
    wiltRecoveryPerTick: 0.004,
    lightFactors: {
      low: { window: 0.9, shade: 1 },
      medium: { window: 1, shade: 0.75 },
      bright: { window: 1, shade: 0.5 },
    },
  } satisfies GrowthConfig,

  shelf: {
    slots: ["window", "window", "shade", "shade"] satisfies LightPlacement[],
  },
};
