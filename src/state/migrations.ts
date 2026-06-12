import { CONFIG } from "../content/config";
import type { PlantInstance } from "../engine/growth";
import type { LightPlacement } from "../engine/schemas";

/**
 * Versioned saves. Any change to the save shape requires bumping
 * SAVE_VERSION and adding a migration step below — never break old saves.
 */
export const SAVE_VERSION = 3;

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

/** The current save shape. */
export type Save = SaveV3;

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
