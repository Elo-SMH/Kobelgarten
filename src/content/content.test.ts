import { describe, expect, it } from "vitest";
import { plantSpeciesSchema, shopItemSchema } from "../engine/schemas";
import { allShopItems, dailyOfferPool, shopItemById } from "./items";
import { allSpecies, speciesById } from "./plants";

// Auto-discover every plant file so a forgotten registry entry or an
// invalid new file fails this contract test, not the running game.
const modules = import.meta.glob(["./plants/*.ts", "!./plants/index.ts"], {
  eager: true,
}) as Record<string, Record<string, unknown>>;

const fileExports = Object.entries(modules).flatMap(([path, mod]) =>
  Object.entries(mod).map(([exportName, value]) => ({
    source: `${path}#${exportName}`,
    value,
  })),
);

describe("content contract: plants", () => {
  it("discovers all 8 v1 species files (PLAN 2.8)", () => {
    expect(fileExports.length).toBeGreaterThanOrEqual(8);
  });

  it("every export of every plant file validates against the schema", () => {
    for (const entry of fileExports) {
      const parsed = plantSpeciesSchema.safeParse(entry.value);
      expect(
        parsed.success,
        `${entry.source}: ${parsed.success ? "ok" : parsed.error.message}`,
      ).toBe(true);
    }
  });

  it("every plant file is registered in the index", () => {
    for (const entry of fileExports) {
      const parsed = plantSpeciesSchema.parse(entry.value);
      expect(speciesById[parsed.id], `${entry.source} fehlt im Index`).toBe(
        entry.value,
      );
    }
  });

  it("registry and files are in sync (no orphan registry entries)", () => {
    expect(allSpecies.length).toBe(fileExports.length);
  });

  it("species ids are unique", () => {
    const ids = allSpecies.map((species) => species.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("content contract: shop items", () => {
  it("every shop item validates against the schema", () => {
    for (const item of allShopItems) {
      const parsed = shopItemSchema.safeParse(item);
      expect(
        parsed.success,
        `${item.id}: ${parsed.success ? "ok" : parsed.error.message}`,
      ).toBe(true);
    }
  });

  it("item ids are unique and registered in the index", () => {
    const ids = allShopItems.map((item) => item.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const item of allShopItems) {
      expect(shopItemById[item.id]).toBe(item);
    }
  });

  it("every species has a seed item priced at its basePrice (PLAN 2.5)", () => {
    for (const species of allSpecies) {
      const seed = shopItemById[`seed-${species.id}`];
      expect(seed, `seed-${species.id} fehlt`).toBeDefined();
      expect(seed.kind).toBe("seed");
      expect(seed.price).toBe(species.basePrice);
    }
  });

  it("the daily-offer pool contains only known, non-upgrade items", () => {
    expect(dailyOfferPool.length).toBeGreaterThan(0);
    for (const id of dailyOfferPool) {
      expect(shopItemById[id]).toBeDefined();
      expect(shopItemById[id].kind).not.toBe("upgrade");
    }
  });
});
