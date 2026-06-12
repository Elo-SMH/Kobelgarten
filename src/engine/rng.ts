/**
 * Seeded RNG (mulberry32). The only source of randomness in the game —
 * engine functions never call Math.random(), they receive an Rng.
 */
export interface Rng {
  /** Next value in [0, 1). */
  next(): number;
  /** Integer in [minInclusive, maxExclusive). */
  int(minInclusive: number, maxExclusive: number): number;
  /** True with the given probability (0–1). */
  chance(probability: number): boolean;
  /** Uniformly random element of a non-empty array. */
  pick<T>(items: readonly T[]): T;
}

export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function createRng(seed: number): Rng {
  const next = mulberry32(seed);
  return {
    next,
    int(minInclusive, maxExclusive) {
      if (maxExclusive <= minInclusive) {
        throw new Error(
          `int(): empty range [${minInclusive}, ${maxExclusive})`,
        );
      }
      return (
        minInclusive + Math.floor(next() * (maxExclusive - minInclusive))
      );
    },
    chance(probability) {
      return next() < probability;
    },
    pick(items) {
      if (items.length === 0) {
        throw new Error("pick(): empty array");
      }
      return items[Math.floor(next() * items.length)] as (typeof items)[number];
    },
  };
}

/**
 * Deterministic 32-bit seed from a string, e.g. a calendar date like
 * "2026-06-12" for the daily shop offer. FNV-1a.
 */
export function hashSeed(input: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}
