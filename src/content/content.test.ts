import { describe, expect, it } from "vitest";
import {
  plantSpeciesSchema,
  shopItemSchema,
  squirrelSchema,
  talentSchema,
  talentTreeSchema,
  tutorialStepSchema,
} from "../engine/schemas";
import de from "../i18n/de.json";
import { CONFIG } from "./config";
import { allShopItems, dailyOfferPool, shopItemById } from "./items";
import { allSpecies, speciesById } from "./plants";
import { allTalents, talentById } from "./skills";
import { allSquirrels, squirrelById } from "./squirrels";
import { tutorialSteps } from "./tutorial";

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

  it("every species sets a cuttingCost in (0, 1] (Steckling-Kosten)", () => {
    for (const species of allSpecies) {
      expect(species.cuttingCost, `${species.id} ohne cuttingCost`).toBeDefined();
      const cost = species.cuttingCost ?? 0;
      expect(cost).toBeGreaterThan(0);
      expect(cost).toBeLessThanOrEqual(1);
    }
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

describe("content contract: talents (PLAN 2.4)", () => {
  it("every talent validates against the schema", () => {
    for (const talent of allTalents) {
      const parsed = talentSchema.safeParse(talent);
      expect(
        parsed.success,
        `${talent.id}: ${parsed.success ? "ok" : parsed.error.message}`,
      ).toBe(true);
    }
  });

  it("talent ids are unique and registered in the index", () => {
    const ids = allTalents.map((talent) => talent.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const talent of allTalents) {
      expect(talentById[talent.id]).toBe(talent);
    }
  });

  it("each of the 3 trees has 6–8 talents and reaches tier 3", () => {
    for (const tree of talentTreeSchema.options) {
      const talents = allTalents.filter((talent) => talent.tree === tree);
      expect(talents.length).toBeGreaterThanOrEqual(6);
      expect(talents.length).toBeLessThanOrEqual(8);
      expect(Math.max(...talents.map((talent) => talent.tier))).toBe(3);
    }
  });

  it("every tier has a threshold and every talent a description in de.json", () => {
    const messages = de as Record<string, string>;
    for (const talent of allTalents) {
      expect(
        CONFIG.progression.tierThresholds[talent.tier - 1],
        `Tier ${talent.tier} ohne Schwelle`,
      ).toBeDefined();
      expect(
        messages[`talent.${talent.id}.desc`],
        `talent.${talent.id}.desc fehlt in de.json`,
      ).toBeDefined();
    }
  });
});

describe("content contract: squirrels (PLAN 2.6)", () => {
  const messages = de as Record<string, string>;

  it("offers exactly the three v1 characters, all schema-valid", () => {
    expect(allSquirrels.length).toBe(3);
    for (const squirrel of allSquirrels) {
      const parsed = squirrelSchema.safeParse(squirrel);
      expect(
        parsed.success,
        `${squirrel.id}: ${parsed.success ? "ok" : parsed.error.message}`,
      ).toBe(true);
    }
  });

  it("squirrel ids are unique, registered, and described in de.json", () => {
    const ids = allSquirrels.map((squirrel) => squirrel.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const squirrel of allSquirrels) {
      expect(squirrelById[squirrel.id]).toBe(squirrel);
      expect(
        messages[`squirrel.${squirrel.id}.bonus`],
        `squirrel.${squirrel.id}.bonus fehlt in de.json`,
      ).toBeDefined();
      expect(
        messages[`squirrel.${squirrel.id}.flavor`],
        `squirrel.${squirrel.id}.flavor fehlt in de.json`,
      ).toBeDefined();
    }
  });
});

describe("content contract: tutorial (PLAN 2.7)", () => {
  const messages = de as Record<string, string>;

  it("every tutorial step validates and has title + body in de.json", () => {
    expect(tutorialSteps.length).toBeGreaterThan(0);
    for (const step of tutorialSteps) {
      expect(tutorialStepSchema.safeParse(step).success).toBe(true);
      expect(
        messages[`tutorial.${step.id}.title`],
        `tutorial.${step.id}.title fehlt`,
      ).toBeDefined();
      expect(
        messages[`tutorial.${step.id}.body`],
        `tutorial.${step.id}.body fehlt`,
      ).toBeDefined();
    }
  });

  it("starts and ends with a narration step the player clicks through", () => {
    expect(tutorialSteps[0].trigger).toBe("next");
    expect(tutorialSteps[tutorialSteps.length - 1].trigger).toBe("next");
  });
});
