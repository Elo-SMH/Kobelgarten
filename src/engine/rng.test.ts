import { describe, expect, it } from "vitest";
import { createRng, hashSeed, mulberry32 } from "./rng";

describe("mulberry32", () => {
  it("is deterministic: same seed produces the same sequence", () => {
    const a = mulberry32(12345);
    const b = mulberry32(12345);
    for (let i = 0; i < 100; i++) {
      expect(a()).toBe(b());
    }
  });

  it("different seeds produce different sequences", () => {
    const a = mulberry32(1);
    const b = mulberry32(2);
    const sequenceA = Array.from({ length: 10 }, () => a());
    const sequenceB = Array.from({ length: 10 }, () => b());
    expect(sequenceA).not.toEqual(sequenceB);
  });

  it("stays within [0, 1)", () => {
    const next = mulberry32(987654321);
    for (let i = 0; i < 10_000; i++) {
      const value = next();
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });

  it("is roughly uniform (mean near 0.5)", () => {
    const next = mulberry32(42);
    let sum = 0;
    const n = 10_000;
    for (let i = 0; i < n; i++) sum += next();
    expect(sum / n).toBeGreaterThan(0.47);
    expect(sum / n).toBeLessThan(0.53);
  });
});

describe("createRng", () => {
  it("int() stays within bounds and hits both edges", () => {
    const rng = createRng(7);
    const seen = new Set<number>();
    for (let i = 0; i < 1_000; i++) {
      const value = rng.int(3, 6);
      expect(value).toBeGreaterThanOrEqual(3);
      expect(value).toBeLessThan(6);
      seen.add(value);
    }
    expect(seen).toEqual(new Set([3, 4, 5]));
  });

  it("int() throws on an empty range", () => {
    const rng = createRng(7);
    expect(() => rng.int(5, 5)).toThrow();
  });

  it("chance() respects the probability roughly", () => {
    const rng = createRng(99);
    let hits = 0;
    const n = 10_000;
    for (let i = 0; i < n; i++) {
      if (rng.chance(0.02)) hits++;
    }
    expect(hits / n).toBeGreaterThan(0.01);
    expect(hits / n).toBeLessThan(0.03);
  });

  it("chance(0) never hits, chance(1) always hits", () => {
    const rng = createRng(1);
    for (let i = 0; i < 100; i++) {
      expect(rng.chance(0)).toBe(false);
      expect(rng.chance(1)).toBe(true);
    }
  });

  it("pick() returns only elements of the array", () => {
    const rng = createRng(3);
    const items = ["a", "b", "c"] as const;
    for (let i = 0; i < 100; i++) {
      expect(items).toContain(rng.pick(items));
    }
  });

  it("pick() throws on an empty array", () => {
    const rng = createRng(3);
    expect(() => rng.pick([])).toThrow();
  });
});

describe("hashSeed", () => {
  it("is deterministic and distinguishes nearby dates", () => {
    expect(hashSeed("2026-06-12")).toBe(hashSeed("2026-06-12"));
    expect(hashSeed("2026-06-12")).not.toBe(hashSeed("2026-06-13"));
  });

  it("returns an unsigned 32-bit integer", () => {
    const hash = hashSeed("kobelgarten");
    expect(Number.isInteger(hash)).toBe(true);
    expect(hash).toBeGreaterThanOrEqual(0);
    expect(hash).toBeLessThanOrEqual(0xffffffff);
  });
});
