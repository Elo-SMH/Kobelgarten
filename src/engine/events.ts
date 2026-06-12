import { createRng, hashSeed } from "./rng";
import type { LightPlacement, VariegationType } from "./schemas";

/**
 * Zufallsereignisse (PLAN 2.3): Trauermücken, Sonnenbrand und das
 * Sammler-Eichhörnchen als Quasi-Quest. Aktive Ereignisse liegen im Save;
 * gewürfelt wird deterministisch an Tick-Grenzen (seeded RNG, kein
 * Math.random()).
 */

/** Trauermücken-Befall: bremst das Wachstum, bis Gelbtafeln helfen. */
export interface GnatsEvent {
  kind: "gnats";
  id: string;
  plantId: string;
  expiresAtTick: number;
}

/** Sonnenbrand: stoppt das Wachstum und welkt zusätzlich, heilt von selbst. */
export interface SunburnEvent {
  kind: "sunburn";
  id: string;
  plantId: string;
  expiresAtTick: number;
}

/** Sammler-Eichhörnchen: zahlt priceFactor× für die gewünschte Variegation. */
export interface CollectorQuest {
  kind: "collector";
  id: string;
  variegation: VariegationType;
  priceFactor: number;
  expiresAtTick: number;
}

export type ActiveEvent = GnatsEvent | SunburnEvent | CollectorQuest;

export interface EventsConfig {
  /** Alle so viele Ticks wird die Ereignis-Tabelle einmal gewürfelt. */
  checkIntervalTicks: number;
  gnats: { chance: number; durationTicks: number; growthFactor: number };
  sunburn: {
    chance: number;
    durationTicks: number;
    growthFactor: number;
    /** Zusätzliche Welke pro Tick, auch bei voller Gießkanne. */
    extraWiltPerTick: number;
  };
  collector: { chance: number; durationTicks: number; priceFactor: number };
}

/** Minimaler Pflanzen-Blick fürs Würfeln (lebende Pflanzen am Regal). */
export interface EventRollPlant {
  id: string;
  placement: LightPlacement;
}

export interface EventRollResult {
  spawned: ActiveEvent[];
  nextEventId: number;
}

/** Tick-Grenzen in (fromTick, toTick], an denen gewürfelt wird. */
export function eventCheckBoundaries(
  fromTick: number,
  toTick: number,
  intervalTicks: number,
): number[] {
  const boundaries: number[] = [];
  const first = Math.floor(fromTick / intervalTicks) * intervalTicks + intervalTicks;
  for (let tick = first; tick <= toTick; tick += intervalTicks) {
    boundaries.push(tick);
  }
  return boundaries;
}

/**
 * Würfelt die Ereignis-Tabelle für genau eine Tick-Grenze. Deterministisch:
 * gleiche Grenze + gleiche Lage → gleiche Ereignisse. Pro Plage maximal ein
 * Befall pro Pflanze, maximal eine Sammler-Quest gleichzeitig.
 */
export function rollEventsAt(
  boundaryTick: number,
  plants: readonly EventRollPlant[],
  active: readonly ActiveEvent[],
  nextEventId: number,
  variegationPool: readonly VariegationType[],
  config: EventsConfig,
  collectorChanceFactor = 1,
): EventRollResult {
  const rng = createRng(hashSeed(`event:${boundaryTick}`));
  const spawned: ActiveEvent[] = [];
  let counter = nextEventId;

  const afflictedBy = (kind: "gnats" | "sunburn") =>
    new Set(
      active
        .filter(
          (event): event is GnatsEvent | SunburnEvent => event.kind === kind,
        )
        .map((event) => event.plantId),
    );

  // Trauermücken: trifft eine zufällige Pflanze ohne laufenden Befall.
  if (rng.chance(config.gnats.chance)) {
    const candidates = plants.filter((plant) => !afflictedBy("gnats").has(plant.id));
    if (candidates.length > 0) {
      counter += 1;
      spawned.push({
        kind: "gnats",
        id: `event-${counter}`,
        plantId: rng.pick(candidates).id,
        expiresAtTick: boundaryTick + config.gnats.durationTicks,
      });
    }
  }

  // Sonnenbrand: nur Pflanzen am Fensterplatz.
  if (rng.chance(config.sunburn.chance)) {
    const candidates = plants.filter(
      (plant) => plant.placement === "window" && !afflictedBy("sunburn").has(plant.id),
    );
    if (candidates.length > 0) {
      counter += 1;
      spawned.push({
        kind: "sunburn",
        id: `event-${counter}`,
        plantId: rng.pick(candidates).id,
        expiresAtTick: boundaryTick + config.sunburn.durationTicks,
      });
    }
  }

  // Sammler-Eichhörnchen: höchstens eine Quest gleichzeitig.
  const hasCollector = active.some((event) => event.kind === "collector");
  if (
    !hasCollector &&
    variegationPool.length > 0 &&
    rng.chance(Math.min(1, config.collector.chance * collectorChanceFactor))
  ) {
    counter += 1;
    spawned.push({
      kind: "collector",
      id: `event-${counter}`,
      variegation: rng.pick(variegationPool),
      priceFactor: config.collector.priceFactor,
      expiresAtTick: boundaryTick + config.collector.durationTicks,
    });
  }

  return { spawned, nextEventId: counter };
}

/** Entfernt abgelaufene Ereignisse. */
export function pruneExpiredEvents(
  events: readonly ActiveEvent[],
  tick: number,
): ActiveEvent[] {
  return events.filter((event) => event.expiresAtTick > tick);
}

/** Entfernt pflanzengebundene Ereignisse einer verkauften/entsorgten Pflanze. */
export function pruneEventsForPlant(
  events: readonly ActiveEvent[],
  plantId: string,
): ActiveEvent[] {
  return events.filter(
    (event) => event.kind === "collector" || event.plantId !== plantId,
  );
}

/** Wachstums-/Welke-Wirkung aller aktiven Ereignisse auf eine Pflanze. */
export function eventTickModifiers(
  plantId: string,
  events: readonly ActiveEvent[],
  config: EventsConfig,
): { growthFactor: number; extraWiltPerTick: number } {
  let growthFactor = 1;
  let extraWiltPerTick = 0;
  for (const event of events) {
    if (event.kind === "gnats" && event.plantId === plantId) {
      growthFactor *= config.gnats.growthFactor;
    } else if (event.kind === "sunburn" && event.plantId === plantId) {
      growthFactor *= config.sunburn.growthFactor;
      extraWiltPerTick += config.sunburn.extraWiltPerTick;
    }
  }
  return { growthFactor, extraWiltPerTick };
}

/**
 * Die Sammler-Quest, die zu dieser Variegation passt — "none" verkauft sich
 * nie als Sammlerstück.
 */
export function matchingCollector(
  events: readonly ActiveEvent[],
  variegation: VariegationType,
): CollectorQuest | undefined {
  if (variegation === "none") return undefined;
  return events.find(
    (event): event is CollectorQuest =>
      event.kind === "collector" && event.variegation === variegation,
  );
}
