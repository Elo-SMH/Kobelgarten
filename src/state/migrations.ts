/**
 * Versioned saves. Any change to the save shape requires bumping
 * SAVE_VERSION and adding a migration step below — never break old saves.
 */
export const SAVE_VERSION = 1;

export interface SaveV1 {
  tick: number;
  lastTickAt: number;
  hazelnuts: number;
}

/** The current save shape. */
export type Save = SaveV1;

type Migration = (state: Record<string, unknown>) => Record<string, unknown>;

/**
 * Each entry migrates from version n-1 to n, keyed by n. Example for a
 * future bump to version 2:
 *   2: (state) => ({ ...state, shelves: [] }),
 */
const migrations: Record<number, Migration> = {};

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
