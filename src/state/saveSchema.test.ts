import { describe, expect, it } from "vitest";
import type { Save } from "./migrations";
import { exportEnvelopeSchema, saveSchema } from "./saveSchema";

function validSave(): Save {
  return {
    tick: 120,
    lastTickAt: 1_700_000_000_000,
    hazelnuts: 240,
    plants: {
      "plant-1": {
        id: "plant-1",
        genome: {
          speciesId: "pothos",
          growthRate: 1,
          size: 1,
          hueShift: 0,
          hardiness: 1,
          variegation: { type: "splash", coverage: 0.2, stability: 0.6 },
        },
        progress: 1,
        water: 0.8,
        wilt: 0,
        dead: false,
        potSize: "medium",
        fertilizerTicks: 0,
      },
    },
    shelf: [{ placement: "window", plantId: "plant-1" }],
    plantCounter: 1,
    inventory: { "pot-small": 2 },
    wateringCanLevel: 1,
    propagules: {},
    propaguleCounter: 0,
    xp: 130,
    talentRanks: { feilschen: 1 },
    activeEvents: [
      { kind: "collector", id: "ev-1", variegation: "albo", priceFactor: 2, expiresAtTick: 1500 },
    ],
    eventCounter: 1,
    lexicon: { "pothos:splash": 80 },
    lexiconRewardsClaimed: 1,
    squirrelId: "fips",
    tutorialStep: 8,
    tutorialDone: true,
    rootingPowder: false,
  };
}

describe("saveSchema — Import-Validierung (PLAN 2.7)", () => {
  it("akzeptiert einen vollständigen, gültigen Spielstand", () => {
    expect(saveSchema.safeParse(validSave()).success).toBe(true);
  });

  it("lehnt einen Spielstand mit fehlendem Feld ab", () => {
    const broken = validSave() as unknown as Record<string, unknown>;
    delete broken.hazelnuts;
    expect(saveSchema.safeParse(broken).success).toBe(false);
  });

  it("lehnt ein kaputtes Genom ab (edge case: Variegations-Typ unbekannt)", () => {
    const broken = validSave();
    broken.plants["plant-1"].genome.variegation.type =
      "rainbow" as unknown as Save["plants"][string]["genome"]["variegation"]["type"];
    expect(saveSchema.safeParse(broken).success).toBe(false);
  });
});

describe("exportEnvelopeSchema — Datei-Hülle", () => {
  it("akzeptiert eine korrekte Export-Hülle", () => {
    const envelope = {
      app: "kobelgarten",
      version: 6,
      exportedAt: "2026-06-17T00:00:00.000Z",
      save: validSave(),
    };
    expect(exportEnvelopeSchema.safeParse(envelope).success).toBe(true);
  });

  it("lehnt eine fremde Datei ab (falscher app-Marker)", () => {
    const envelope = {
      app: "irgendwas",
      version: 6,
      exportedAt: "2026-06-17T00:00:00.000Z",
      save: {},
    };
    expect(exportEnvelopeSchema.safeParse(envelope).success).toBe(false);
  });
});
