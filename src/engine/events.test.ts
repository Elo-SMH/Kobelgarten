import { describe, expect, it } from "vitest";
import {
  eventCheckBoundaries,
  eventTickModifiers,
  matchingCollector,
  pruneEventsForPlant,
  pruneExpiredEvents,
  rollEventsAt,
  type ActiveEvent,
  type EventsConfig,
  type EventRollPlant,
} from "./events";

const config: EventsConfig = {
  checkIntervalTicks: 60,
  gnats: { chance: 0.06, durationTicks: 1440, growthFactor: 0.5 },
  sunburn: {
    chance: 0.05,
    durationTicks: 180,
    growthFactor: 0,
    extraWiltPerTick: 0.003,
  },
  collector: { chance: 0.08, durationTicks: 1440, priceFactor: 2 },
};

/** Würfelt sicher: alle Chancen auf 1. */
const certain: EventsConfig = {
  ...config,
  gnats: { ...config.gnats, chance: 1 },
  sunburn: { ...config.sunburn, chance: 1 },
  collector: { ...config.collector, chance: 1 },
};

const plants: EventRollPlant[] = [
  { id: "plant-1", placement: "window" },
  { id: "plant-2", placement: "shade" },
];

describe("eventCheckBoundaries", () => {
  it("liefert alle Intervall-Grenzen in (from, to]", () => {
    expect(eventCheckBoundaries(0, 180, 60)).toEqual([60, 120, 180]);
    expect(eventCheckBoundaries(59, 61, 60)).toEqual([60]);
    expect(eventCheckBoundaries(60, 119, 60)).toEqual([]);
  });

  it("leeres Fenster → keine Grenzen (edge case)", () => {
    expect(eventCheckBoundaries(100, 100, 60)).toEqual([]);
  });
});

describe("rollEventsAt — Würfeln an einer Tick-Grenze", () => {
  it("ist deterministisch pro Grenze", () => {
    const a = rollEventsAt(600, plants, [], 0, ["albo"], certain);
    const b = rollEventsAt(600, plants, [], 0, ["albo"], certain);
    expect(a).toEqual(b);
  });

  it("würfelt bei Chance 1 alle drei Ereignis-Arten", () => {
    const { spawned, nextEventId } = rollEventsAt(
      600,
      plants,
      [],
      0,
      ["albo"],
      certain,
    );
    expect(spawned.map((event) => event.kind).sort()).toEqual([
      "collector",
      "gnats",
      "sunburn",
    ]);
    expect(nextEventId).toBe(3);
    const sunburn = spawned.find((event) => event.kind === "sunburn");
    // Sonnenbrand trifft nur Fensterplätze
    expect(sunburn?.plantId).toBe("plant-1");
  });

  it("ohne Pflanzen entstehen keine Plagen, die Quest kommt trotzdem", () => {
    const { spawned } = rollEventsAt(600, [], [], 0, ["albo"], certain);
    expect(spawned.map((event) => event.kind)).toEqual(["collector"]);
  });

  it("höchstens eine Sammler-Quest gleichzeitig", () => {
    const active: ActiveEvent[] = [
      {
        kind: "collector",
        id: "event-9",
        variegation: "splash",
        priceFactor: 2,
        expiresAtTick: 9999,
      },
    ];
    const { spawned } = rollEventsAt(600, [], active, 9, ["albo"], certain);
    expect(spawned).toEqual([]);
  });

  it("bereits befallene Pflanzen werden nicht doppelt befallen", () => {
    const active: ActiveEvent[] = [
      { kind: "gnats", id: "event-1", plantId: "plant-1", expiresAtTick: 9999 },
      { kind: "gnats", id: "event-2", plantId: "plant-2", expiresAtTick: 9999 },
    ];
    const { spawned } = rollEventsAt(600, plants, active, 2, [], certain);
    expect(spawned.filter((event) => event.kind === "gnats")).toEqual([]);
  });

  it("chance 0 würfelt nie (edge case)", () => {
    const never: EventsConfig = {
      ...config,
      gnats: { ...config.gnats, chance: 0 },
      sunburn: { ...config.sunburn, chance: 0 },
      collector: { ...config.collector, chance: 0 },
    };
    const { spawned } = rollEventsAt(600, plants, [], 0, ["albo"], never);
    expect(spawned).toEqual([]);
  });
});

describe("pruneExpiredEvents / pruneEventsForPlant", () => {
  const events: ActiveEvent[] = [
    { kind: "gnats", id: "event-1", plantId: "plant-1", expiresAtTick: 100 },
    {
      kind: "collector",
      id: "event-2",
      variegation: "albo",
      priceFactor: 2,
      expiresAtTick: 200,
    },
  ];

  it("entfernt abgelaufene Ereignisse", () => {
    expect(pruneExpiredEvents(events, 99)).toHaveLength(2);
    expect(pruneExpiredEvents(events, 100)).toEqual([events[1]]);
    expect(pruneExpiredEvents(events, 200)).toEqual([]);
  });

  it("entfernt nur pflanzengebundene Ereignisse der Pflanze", () => {
    expect(pruneEventsForPlant(events, "plant-1")).toEqual([events[1]]);
    expect(pruneEventsForPlant(events, "plant-9")).toEqual(events);
  });
});

describe("eventTickModifiers", () => {
  it("kombiniert Trauermücken und Sonnenbrand derselben Pflanze", () => {
    const events: ActiveEvent[] = [
      { kind: "gnats", id: "event-1", plantId: "plant-1", expiresAtTick: 999 },
      { kind: "sunburn", id: "event-2", plantId: "plant-1", expiresAtTick: 999 },
    ];
    expect(eventTickModifiers("plant-1", events, config)).toEqual({
      growthFactor: 0.5 * 0,
      extraWiltPerTick: 0.003,
    });
    expect(eventTickModifiers("plant-2", events, config)).toEqual({
      growthFactor: 1,
      extraWiltPerTick: 0,
    });
  });
});

describe("matchingCollector", () => {
  const quest: ActiveEvent = {
    kind: "collector",
    id: "event-1",
    variegation: "albo",
    priceFactor: 2,
    expiresAtTick: 999,
  };

  it("findet die Quest zur passenden Variegation", () => {
    expect(matchingCollector([quest], "albo")).toBe(quest);
    expect(matchingCollector([quest], "splash")).toBeUndefined();
  });

  it("'none' matcht nie (edge case)", () => {
    const noneQuest: ActiveEvent = { ...quest, variegation: "none" };
    expect(matchingCollector([noneQuest], "none")).toBeUndefined();
  });
});
