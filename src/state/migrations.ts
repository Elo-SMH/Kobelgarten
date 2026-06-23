import { CONFIG } from "../content/config";
import { tutorialSteps } from "../content/tutorial";
import type { ActiveEvent } from "../engine/events";
import type { PlantInstance } from "../engine/growth";
import { comboKey } from "../engine/lexicon";
import type { Genome, LightPlacement } from "../engine/schemas";

/**
 * Versioned saves. Any change to the save shape requires bumping
 * SAVE_VERSION and adding a migration step below — never break old saves.
 */
export const SAVE_VERSION = 7;

export interface SaveV1 {
  tick: number;
  lastTickAt: number;
  hazelnuts: number;
}

export interface ShelfSlotState {
  placement: LightPlacement;
  plantId: string | null;
}

export interface SaveV2 extends SaveV1 {
  plants: Record<string, PlantInstance>;
  shelf: ShelfSlotState[];
  /** Monoton steigender Zähler für eindeutige Pflanzen-IDs. */
  plantCounter: number;
}

export interface SaveV3 extends SaveV2 {
  /** Item-Bestand, keyed by Shop-Item-Id (nur Verbrauchsgüter). */
  inventory: Record<string, number>;
  /** 1 = Standard-Gießkanne, 2 = Upgrade (alle Pflanzen auf einmal). */
  wateringCanLevel: number;
}

/**
 * Vermehrungsgut aus der Zuchtstation: ein geschnittener Steckling oder ein
 * gekreuzter Samen mit fertigem Genom, wartet auf das Einpflanzen im Kobel.
 */
export interface Propagule {
  id: string;
  kind: "cutting" | "seed";
  genome: Genome;
}

export interface SaveV4 extends SaveV3 {
  propagules: Record<string, Propagule>;
  /** Monoton steigender Zähler für eindeutige Propagule-IDs. */
  propaguleCounter: number;
}

export interface SaveV5 extends SaveV4 {
  /** Gesamt-XP; Level und Skillpunkte werden daraus abgeleitet. */
  xp: number;
  /** Investierte Talent-Ränge, keyed by Talent-Id. */
  talentRanks: Record<string, number>;
  /** Laufende Zufallsereignisse (Trauermücken, Sonnenbrand, Sammler-Quest). */
  activeEvents: ActiveEvent[];
  /** Monoton steigender Zähler für eindeutige Ereignis-IDs. */
  eventCounter: number;
  /** Pflanzenlexikon: comboKey (Art:Variegation) → Tick der Entdeckung. */
  lexicon: Record<string, number>;
  /** Anzahl bereits ausgezahlter Komplettierungs-Belohnungen. */
  lexiconRewardsClaimed: number;
}

export interface SaveV6 extends SaveV5 {
  /** Gewähltes Spieler-Eichhörnchen (PLAN 2.6); null = noch nicht gewählt. */
  squirrelId: string | null;
  /** Aktueller Tutorial-Schritt (Index in content/tutorial.ts). */
  tutorialStep: number;
  /** Tutorial durchgespielt oder übersprungen. */
  tutorialDone: boolean;
}

export interface SaveV7 extends SaveV6 {
  /**
   * Bewurzelungspulver-Upgrade gekauft: verwelkte Pflanzen geben dann
   * garantiert einen Steckling beim Kompostieren (sonst nur mit Chance).
   */
  rootingPowder: boolean;
}

/** The current save shape. */
export type Save = SaveV7;

export function createDefaultShelf(): ShelfSlotState[] {
  return CONFIG.shelf.slots.map((placement) => ({ placement, plantId: null }));
}

type Migration = (state: Record<string, unknown>) => Record<string, unknown>;

/** Each entry migrates from version n-1 to n, keyed by n. */
const migrations: Record<number, Migration> = {
  // v1 → v2: Regal mit 4 Slots und Pflanzen-Sammlung (M2)
  2: (state) => ({
    ...state,
    plants: {},
    shelf: createDefaultShelf(),
    plantCounter: 0,
  }),
  // v2 → v3: Inventar & Gießkanne (M3); Bestandspflanzen aus der topflosen
  // M2-Zeit bekommen großzügig den großen Topf, damit nichts schrumpft.
  3: (state) => ({
    ...state,
    plants: Object.fromEntries(
      Object.entries(
        (state.plants ?? {}) as Record<string, Record<string, unknown>>,
      ).map(([id, plant]) => [
        id,
        { ...plant, potSize: "large", fertilizerTicks: 0 },
      ]),
    ),
    inventory: {},
    wateringCanLevel: 1,
  }),
  // v3 → v4: Zuchtstation mit Vermehrungsgut-Inventar (M4)
  4: (state) => ({
    ...state,
    propagules: {},
    propaguleCounter: 0,
  }),
  // v4 → v5: Progression (M5). Das Lexikon startet mit allen Kombis, die
  // schon im Kobel oder Vermehrungsgut stehen — ohne rückwirkende XP.
  5: (state) => {
    const tick = typeof state.tick === "number" ? state.tick : 0;
    const lexicon: Record<string, number> = {};
    const register = (genome: Genome | undefined) => {
      if (!genome) return;
      lexicon[comboKey(genome.speciesId, genome.variegation.type)] ??= tick;
    };
    const plants = (state.plants ?? {}) as Record<
      string,
      { genome?: Genome } | undefined
    >;
    for (const plant of Object.values(plants)) register(plant?.genome);
    const propagules = (state.propagules ?? {}) as Record<
      string,
      { genome?: Genome } | undefined
    >;
    for (const propagule of Object.values(propagules)) {
      register(propagule?.genome);
    }
    return {
      ...state,
      xp: 0,
      talentRanks: {},
      activeEvents: [],
      eventCounter: 0,
      lexicon,
      lexiconRewardsClaimed: 0,
    };
  },
  // v5 → v6: Eichhörnchen-Auswahl & Tutorial (M6). Bestandsspieler laufen
  // schon — sie bekommen Hasel als Standard und ein abgeschlossenes Tutorial,
  // damit sie nicht zurück in die Charakterwahl geworfen werden.
  6: (state) => ({
    ...state,
    squirrelId: "hasel",
    tutorialStep: tutorialSteps.length,
    tutorialDone: true,
  }),
  // v6 → v7: Bewurzelungspulver-Upgrade (Kompostieren verwelkter Pflanzen).
  // Bestandsspieler besitzen es noch nicht.
  7: (state) => ({
    ...state,
    rootingPowder: false,
  }),
};

export function migrateSave(persisted: unknown, fromVersion: number): Save {
  let state = persisted as Record<string, unknown>;
  for (let version = fromVersion + 1; version <= SAVE_VERSION; version++) {
    const step = migrations[version];
    if (!step) {
      throw new Error(
        `Keine Save-Migration auf Version ${version} registriert`,
      );
    }
    state = step(state);
  }
  return state as unknown as Save;
}
