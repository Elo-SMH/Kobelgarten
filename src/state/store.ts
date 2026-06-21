import { create } from "zustand";
import { persist } from "zustand/middleware";
import { CONFIG } from "../content/config";
import { potItemId, shopItemById } from "../content/items";
import { speciesById, allSpecies } from "../content/plants";
import { allTalents, talentById } from "../content/skills";
import { squirrelById } from "../content/squirrels";
import { tutorialSteps } from "../content/tutorial";
import {
  effectiveSellPrice,
  plantValue,
  shelfSlotPrice,
} from "../engine/economy";
import {
  eventCheckBoundaries,
  eventTickModifiers,
  matchingCollector,
  pruneEventsForPlant,
  pruneExpiredEvents,
  rollEventsAt,
} from "../engine/events";
import { canCross, createSeedGenome, cross, mutate } from "../engine/genetics";
import {
  createPlant,
  fertilizePlant as applyFertilizer,
  phaseOf,
  tickPlantMany,
  waterPlant as applyWatering,
} from "../engine/growth";
import { discoverCombos, lexiconCompletion } from "../engine/lexicon";
import { createRng, hashSeed } from "../engine/rng";
import type { Genome, PotSize, VariegationType } from "../engine/schemas";
import {
  computeModifiers,
  isTierUnlocked,
  levelForXp,
  pointsInTree,
  pointsSpent,
  respecCost,
  totalSkillPoints,
  withSquirrelBonus,
  type Modifiers,
} from "../engine/skills";
import { advanceTicks } from "../engine/ticks";
import {
  advanceTutorial as advanceTutorialState,
  skipTutorial as skipTutorialState,
} from "../engine/tutorial";
import type { TutorialTrigger } from "../engine/schemas";
import {
  createDefaultShelf,
  migrateSave,
  SAVE_VERSION,
  type Save,
} from "./migrations";
import { exportEnvelopeSchema, saveSchema } from "./saveSchema";
import {
  getActiveSlot,
  readSlot,
  setActiveSlot,
  slotStorage,
} from "./slots";
import { itemPrice, todaysOffer } from "./shop";

interface GameStore extends Save {
  /**
   * Simulate all ticks that are due as of `now` (offline catch-up included,
   * capped per CONFIG). The UI passes the wall clock in; the engine stays
   * deterministic.
   */
  catchUp: (now: number) => void;
  /** Kauft ein Shop-Item zum aktuellen Preis (inkl. Tagesangebot & Talente). */
  buyItem: (itemId: string) => void;
  /** Kauft einen zusätzlichen Regal-Slot (Preis steigt pro Zukauf). */
  buyShelfSlot: () => void;
  /** Pflanzt einen Samen aus dem Inventar in einen Topf aus dem Inventar. */
  plantSeed: (slotIndex: number, speciesId: string, potSize: PotSize) => void;
  waterPlant: (plantId: string) => void;
  /** Gießkannen-Upgrade (Level 2): gießt alle lebenden Pflanzen. */
  waterAll: () => void;
  /** Verbraucht 1 Dünger aus dem Inventar für einen Wachstums-Buff. */
  fertilizePlant: (plantId: string) => void;
  /** Verkauft eine lebende Pflanze zum Live-Wert; der Topf kommt zurück. */
  sellPlant: (plantId: string) => void;
  /** Entsorgt eine eingegangene Pflanze; der Topf kommt zurück. */
  removePlant: (plantId: string) => void;
  /** Schneidet einen Steckling (ab Jungpflanze): Klon mit Mutations-Würfen. */
  cutCutting: (plantId: string) => void;
  /** Kreuzt zwei Adults kompatibler Arten → 1–3 Samen im Vermehrungsgut. */
  crossPlants: (plantIdA: string, plantIdB: string) => void;
  /** Pflanzt Vermehrungsgut in einen Topf aus dem Inventar. */
  plantPropagule: (
    slotIndex: number,
    propaguleId: string,
    potSize: PotSize,
  ) => void;
  /** Investiert 1 Skillpunkt in ein Talent (Tier muss freigeschaltet sein). */
  spendTalentPoint: (talentId: string) => void;
  /** Respec gegen Haselnüsse: setzt alle Talent-Ränge zurück. */
  respec: () => void;
  /** Verbraucht 1 Gelbtafel und beendet den Trauermücken-Befall der Pflanze. */
  treatPlant: (plantId: string) => void;
  /** Wählt das Spieler-Eichhörnchen beim ersten Start (PLAN 2.6). */
  chooseSquirrel: (squirrelId: string) => void;
  /** Schiebt das geskriptete Tutorial weiter, wenn der Trigger passt. */
  advanceTutorial: (trigger: TutorialTrigger) => void;
  /** Bricht das Tutorial ab (überspringen). */
  skipTutorial: () => void;
  /** Liefert den aktuellen Spielstand als reine Daten (für den Export). */
  getSave: () => Save;
  /** Ersetzt den laufenden Spielstand vollständig (Import / Slot-Wechsel). */
  loadSave: (save: Save) => void;
  /** Setzt den aktiven Slot auf einen frischen Neustart zurück. */
  resetGame: () => void;
  /** Wechselt den aktiven Save-Slot (lädt ihn, oder startet ihn neu). */
  switchToSlot: (slot: number) => void;
  /** Importiert einen Spielstand aus JSON-Text; gibt eine Fehlermeldung zurück. */
  importSave: (json: string) => { ok: boolean; error?: string };
}

/** Inventar-Update; Einträge mit Bestand 0 werden entfernt. */
function withCount(
  inventory: Record<string, number>,
  itemId: string,
  delta: number,
): Record<string, number> {
  const next = { ...inventory };
  const count = (next[itemId] ?? 0) + delta;
  if (count <= 0) delete next[itemId];
  else next[itemId] = count;
  return next;
}

/**
 * Aggregierte Modifikatoren des aktuellen Spielstands: Talent-Pipeline plus
 * der Mini-Startbonus des gewählten Eichhörnchens (PLAN 2.6).
 */
function modifiersOf(
  talentRanks: Record<string, number>,
  squirrelId: string | null,
): Modifiers {
  const base = computeModifiers(talentRanks, allTalents);
  return withSquirrelBonus(base, squirrelId ? squirrelById[squirrelId] : null);
}

/** Reine Save-Felder aus dem Store herauslösen (Persistenz & Export). */
function pickSave(state: Save): Save {
  return {
    tick: state.tick,
    lastTickAt: state.lastTickAt,
    hazelnuts: state.hazelnuts,
    plants: state.plants,
    shelf: state.shelf,
    plantCounter: state.plantCounter,
    inventory: state.inventory,
    wateringCanLevel: state.wateringCanLevel,
    propagules: state.propagules,
    propaguleCounter: state.propaguleCounter,
    xp: state.xp,
    talentRanks: state.talentRanks,
    activeEvents: state.activeEvents,
    eventCounter: state.eventCounter,
    lexicon: state.lexicon,
    lexiconRewardsClaimed: state.lexiconRewardsClaimed,
    squirrelId: state.squirrelId,
    tutorialStep: state.tutorialStep,
    tutorialDone: state.tutorialDone,
  };
}

/** Spielstand eines brandneuen Spiels (frischer Slot, Charakterwahl steht an). */
function freshSave(now: number): Save {
  return {
    tick: 0,
    lastTickAt: now,
    hazelnuts: CONFIG.startHazelnuts,
    plants: {},
    shelf: createDefaultShelf(),
    plantCounter: 0,
    inventory: {},
    wateringCanLevel: 1,
    propagules: {},
    propaguleCounter: 0,
    xp: 0,
    talentRanks: {},
    activeEvents: [],
    eventCounter: 0,
    lexicon: {},
    lexiconRewardsClaimed: 0,
    squirrelId: null,
    tutorialStep: 0,
    tutorialDone: false,
  };
}

/** Alle Variegations-Typen, die das Sammler-Eichhörnchen wünschen kann. */
const VARIEGATION_POOL: VariegationType[] = [
  ...new Set(allSpecies.flatMap((species) => species.allowedVariegations)),
];

interface DiscoveryState {
  tick: number;
  xp: number;
  hazelnuts: number;
  lexicon: Record<string, number>;
  lexiconRewardsClaimed: number;
}

/**
 * Trägt frische Genome ins Lexikon ein: Erstzüchtungen geben XP, erreichte
 * Komplettierungs-Schwellen schütten ihre Belohnung sofort aus.
 */
function withDiscoveries(
  state: DiscoveryState,
  genomes: readonly Genome[],
): Partial<DiscoveryState> {
  const { lexicon, discovered } = discoverCombos(
    state.lexicon,
    genomes,
    state.tick,
  );
  if (discovered.length === 0) return {};
  let xp = state.xp + discovered.length * CONFIG.progression.xp.discovery;
  let hazelnuts = state.hazelnuts;
  let claimed = state.lexiconRewardsClaimed;
  const completion = lexiconCompletion(lexicon, allSpecies);
  const rewards = CONFIG.lexicon.rewards;
  while (claimed < rewards.length && completion >= rewards[claimed].completion) {
    hazelnuts += rewards[claimed].hazelnuts;
    xp += rewards[claimed].xp;
    claimed += 1;
  }
  return { lexicon, xp, hazelnuts, lexiconRewardsClaimed: claimed };
}

export const useGameStore = create<GameStore>()(
  persist<GameStore, [], [], Save>(
    (set, get) => ({
      ...freshSave(Date.now()),

      catchUp: (now) => {
        const { tick, lastTickAt, plants, shelf, talentRanks, squirrelId } =
          get();
        const result = advanceTicks({ tick, lastTickAt }, now, CONFIG);
        if (result.state.lastTickAt === lastTickAt) return;
        if (result.applied === 0) {
          set({ tick: result.state.tick, lastTickAt: result.state.lastTickAt });
          return;
        }
        const mods = modifiersOf(talentRanks, squirrelId);
        const grown = { ...plants };
        let events = get().activeEvents;
        let eventCounter = get().eventCounter;
        const toTick = result.state.tick;
        const interval = CONFIG.events.checkIntervalTicks;

        // Stückweise simulieren: an jeder Ereignis-Grenze wird gewürfelt,
        // damit auch lange Offline-Fenster Ereignisse erleben und beenden.
        const boundaries = eventCheckBoundaries(tick, toTick, interval);
        const stops =
          boundaries[boundaries.length - 1] === toTick
            ? boundaries
            : [...boundaries, toTick];
        let cursor = tick;
        for (const stop of stops) {
          const ticks = stop - cursor;
          if (ticks > 0) {
            for (const slot of shelf) {
              if (!slot.plantId) continue;
              const plant = grown[slot.plantId];
              if (!plant) continue;
              const species = speciesById[plant.genome.speciesId];
              if (!species) continue;
              const eventMods = eventTickModifiers(
                plant.id,
                events,
                CONFIG.events,
              );
              grown[slot.plantId] = tickPlantMany(
                plant,
                species,
                slot.placement,
                ticks,
                CONFIG.growth,
                {
                  growthFactor: mods.growthFactor * eventMods.growthFactor,
                  wiltFactor: mods.wiltFactor,
                  extraWiltPerTick: eventMods.extraWiltPerTick,
                  autoWater: mods.autoWater,
                },
              );
            }
            cursor = stop;
          }
          events = pruneExpiredEvents(events, stop);
          if (boundaries.includes(stop)) {
            const livingPlants = shelf.flatMap((slot) => {
              const plant = slot.plantId ? grown[slot.plantId] : undefined;
              return plant && !plant.dead
                ? [{ id: plant.id, placement: slot.placement }]
                : [];
            });
            const roll = rollEventsAt(
              stop,
              livingPlants,
              events,
              eventCounter,
              VARIEGATION_POOL,
              CONFIG.events,
              mods.collectorChanceFactor,
            );
            events = [...events, ...roll.spawned];
            eventCounter = roll.nextEventId;
          }
        }

        set({
          tick: toTick,
          lastTickAt: result.state.lastTickAt,
          plants: grown,
          activeEvents: events,
          eventCounter,
        });

        // Tutorial-Beat „wachsen“: sobald die erste Pflanze keimt.
        if (!get().tutorialDone) {
          const sprouted = Object.values(grown).some(
            (plant) =>
              plant.progress >= CONFIG.growth.phaseThresholds.seedling,
          );
          if (sprouted) get().advanceTutorial("grew");
        }
      },

      buyItem: (itemId) => {
        const { hazelnuts, inventory, wateringCanLevel, talentRanks, squirrelId } =
          get();
        const item = shopItemById[itemId];
        if (!item) return;
        const mods = modifiersOf(talentRanks, squirrelId);
        const base = itemPrice(itemId, todaysOffer(new Date()));
        const price = Math.max(1, Math.round(base * (1 - mods.shopDiscount)));
        if (hazelnuts < price) return;
        if (item.kind === "upgrade") {
          if (item.upgradeId === "wateringCan" && wateringCanLevel >= 2) return;
          set({ hazelnuts: hazelnuts - price, wateringCanLevel: 2 });
          return;
        }
        set({
          hazelnuts: hazelnuts - price,
          inventory: withCount(inventory, itemId, 1),
        });
        // Tutorial-Beats „Samen kaufen“ und „Topf kaufen“ als getrennte
        // Schritte. Aus dem Inventar-Zustand (statt dem Kauf-Event) getriggert,
        // damit jede Kauf-Reihenfolge funktioniert; advanceTutorial schaltet
        // nur weiter, wenn der jeweilige Schritt gerade dran ist.
        if (!get().tutorialDone) {
          const inv = get().inventory;
          const hasSeed = Object.keys(inv).some(
            (id) => id.startsWith("seed-") && inv[id] > 0,
          );
          const hasPot = Object.keys(inv).some(
            (id) => id.startsWith("pot-") && inv[id] > 0,
          );
          if (hasSeed) get().advanceTutorial("bought-seed");
          if (hasPot) get().advanceTutorial("bought-pot");
        }
      },

      buyShelfSlot: () => {
        const { hazelnuts, shelf, talentRanks, squirrelId } = get();
        if (shelf.length >= CONFIG.shop.maxShelfSlots) return;
        const mods = modifiersOf(talentRanks, squirrelId);
        const extraSlots = shelf.length - CONFIG.shelf.slots.length;
        const base = shelfSlotPrice(extraSlots, CONFIG.shop.shelfSlot);
        const price = Math.max(
          1,
          Math.round(base * (1 - mods.shelfSlotDiscount)),
        );
        if (hazelnuts < price) return;
        const cycle = CONFIG.shelf.extraSlotCycle;
        const placement = cycle[extraSlots % cycle.length];
        set({
          hazelnuts: hazelnuts - price,
          shelf: [...shelf, { placement, plantId: null }],
        });
      },

      plantSeed: (slotIndex, speciesId, potSize) => {
        const state = get();
        const { shelf, plants, plantCounter, inventory } = state;
        const slot = shelf[slotIndex];
        const species = speciesById[speciesId];
        if (!slot || slot.plantId !== null || !species) return;
        const seedId = `seed-${speciesId}`;
        const potId = potItemId(potSize);
        if ((inventory[seedId] ?? 0) < 1 || (inventory[potId] ?? 0) < 1) return;
        const nextCounter = plantCounter + 1;
        const id = `plant-${nextCounter}`;
        const rng = createRng(hashSeed(`${id}:${speciesId}`));
        const genome = createSeedGenome(species.id, rng, CONFIG.genetics);
        set({
          plants: { ...plants, [id]: createPlant(id, genome, potSize) },
          shelf: shelf.map((entry, index) =>
            index === slotIndex ? { ...entry, plantId: id } : entry,
          ),
          plantCounter: nextCounter,
          inventory: withCount(withCount(inventory, seedId, -1), potId, -1),
          ...withDiscoveries(state, [genome]),
        });
        get().advanceTutorial("planted");
      },

      waterPlant: (plantId) => {
        const { plants, talentRanks, squirrelId } = get();
        const plant = plants[plantId];
        if (!plant || plant.dead) return;
        const fillTo = 1 + modifiersOf(talentRanks, squirrelId).waterTankBonus;
        set({ plants: { ...plants, [plantId]: applyWatering(plant, fillTo) } });
        get().advanceTutorial("watered");
      },

      waterAll: () => {
        const { plants, wateringCanLevel, talentRanks, squirrelId } = get();
        if (wateringCanLevel < 2) return;
        const fillTo = 1 + modifiersOf(talentRanks, squirrelId).waterTankBonus;
        set({
          plants: Object.fromEntries(
            Object.entries(plants).map(([id, plant]) => [
              id,
              plant.dead ? plant : applyWatering(plant, fillTo),
            ]),
          ),
        });
        get().advanceTutorial("watered");
      },

      fertilizePlant: (plantId) => {
        const { plants, inventory, talentRanks, squirrelId } = get();
        const plant = plants[plantId];
        if (!plant || plant.dead || plant.fertilizerTicks > 0) return;
        if ((inventory["duenger"] ?? 0) < 1) return;
        const durationFactor = modifiersOf(talentRanks, squirrelId)
          .fertilizerDurationFactor;
        set({
          plants: {
            ...plants,
            [plantId]: applyFertilizer(plant, CONFIG.growth, durationFactor),
          },
          inventory: withCount(inventory, "duenger", -1),
        });
      },

      sellPlant: (plantId) => {
        const {
          plants,
          shelf,
          hazelnuts,
          inventory,
          talentRanks,
          squirrelId,
          activeEvents,
          xp,
        } = get();
        const plant = plants[plantId];
        if (!plant || plant.dead) return;
        const species = speciesById[plant.genome.speciesId];
        if (!species) return;
        const mods = modifiersOf(talentRanks, squirrelId);
        const value = plantValue(plant, species, CONFIG.growth, CONFIG.economy);
        const quest = matchingCollector(
          activeEvents,
          plant.genome.variegation.type,
        );
        const price = effectiveSellPrice(
          value,
          mods.sellPriceFactor,
          quest?.priceFactor ?? 1,
        );
        let xpGain = Math.ceil(price / CONFIG.progression.xp.saleDivisor);
        if (quest) xpGain += CONFIG.progression.xp.collectorBonus;
        const remaining = { ...plants };
        delete remaining[plantId];
        let events = pruneEventsForPlant(activeEvents, plantId);
        if (quest) events = events.filter((event) => event.id !== quest.id);
        set({
          hazelnuts: hazelnuts + price,
          xp: xp + xpGain,
          plants: remaining,
          shelf: shelf.map((entry) =>
            entry.plantId === plantId ? { ...entry, plantId: null } : entry,
          ),
          inventory: withCount(inventory, potItemId(plant.potSize), 1),
          activeEvents: events,
        });
        get().advanceTutorial("sold");
      },

      removePlant: (plantId) => {
        const { plants, shelf, inventory, activeEvents } = get();
        const plant = plants[plantId];
        if (!plant || !plant.dead) return;
        const remaining = { ...plants };
        delete remaining[plantId];
        set({
          plants: remaining,
          shelf: shelf.map((entry) =>
            entry.plantId === plantId ? { ...entry, plantId: null } : entry,
          ),
          inventory: withCount(inventory, potItemId(plant.potSize), 1),
          activeEvents: pruneEventsForPlant(activeEvents, plantId),
        });
      },

      cutCutting: (plantId) => {
        const state = get();
        const { plants, propagules, propaguleCounter, talentRanks, squirrelId } =
          state;
        const plant = plants[plantId];
        if (!plant || plant.dead) return;
        const species = speciesById[plant.genome.speciesId];
        if (!species) return;
        const phase = phaseOf(plant.progress, CONFIG.growth);
        if (phase === "seed" || phase === "seedling") return;
        const mods = modifiersOf(talentRanks, squirrelId);
        const nextCounter = propaguleCounter + 1;
        const id = `prop-${nextCounter}`;
        const rng = createRng(hashSeed(`cut:${plantId}:${nextCounter}`));
        const genome = mutate(plant.genome, species, rng, CONFIG.genetics, {
          chanceMultiplier: mods.mutationChanceFactor,
          stabilityBonus: mods.stabilityBonus,
        });
        set({
          propagules: { ...propagules, [id]: { id, kind: "cutting", genome } },
          propaguleCounter: nextCounter,
          ...withDiscoveries(state, [genome]),
        });
        get().advanceTutorial("cut");
      },

      crossPlants: (plantIdA, plantIdB) => {
        const state = get();
        const { plants, propagules, propaguleCounter, talentRanks, squirrelId } =
          state;
        if (plantIdA === plantIdB) return;
        const plantA = plants[plantIdA];
        const plantB = plants[plantIdB];
        if (!plantA || !plantB || plantA.dead || plantB.dead) return;
        const speciesA = speciesById[plantA.genome.speciesId];
        const speciesB = speciesById[plantB.genome.speciesId];
        if (!speciesA || !speciesB || !canCross(speciesA, speciesB)) return;
        const phaseA = phaseOf(plantA.progress, CONFIG.growth);
        const phaseB = phaseOf(plantB.progress, CONFIG.growth);
        const isAdult = (phase: string) =>
          phase === "adult" || phase === "pracht";
        if (!isAdult(phaseA) || !isAdult(phaseB)) return;
        const mods = modifiersOf(talentRanks, squirrelId);
        const rng = createRng(
          hashSeed(`cross:${plantIdA}:${plantIdB}:${propaguleCounter}`),
        );
        const seeds = cross(
          plantA.genome,
          speciesA,
          plantB.genome,
          speciesB,
          rng,
          CONFIG.genetics,
          {
            chanceMultiplier: mods.mutationChanceFactor,
            stabilityBonus: mods.stabilityBonus,
            extraSeeds: mods.extraCrossSeeds,
          },
        );
        const next = { ...propagules };
        let counter = propaguleCounter;
        for (const genome of seeds) {
          counter += 1;
          const id = `prop-${counter}`;
          next[id] = { id, kind: "seed", genome };
        }
        set({
          propagules: next,
          propaguleCounter: counter,
          ...withDiscoveries(state, seeds),
        });
      },

      plantPropagule: (slotIndex, propaguleId, potSize) => {
        const { shelf, plants, plantCounter, inventory, propagules } = get();
        const slot = shelf[slotIndex];
        const propagule = propagules[propaguleId];
        if (!slot || slot.plantId !== null || !propagule) return;
        const potId = potItemId(potSize);
        if ((inventory[potId] ?? 0) < 1) return;
        const nextCounter = plantCounter + 1;
        const id = `plant-${nextCounter}`;
        const initialProgress =
          propagule.kind === "cutting"
            ? CONFIG.genetics.cuttingStartProgress
            : 0;
        const remaining = { ...propagules };
        delete remaining[propaguleId];
        set({
          plants: {
            ...plants,
            [id]: createPlant(id, propagule.genome, potSize, initialProgress),
          },
          shelf: shelf.map((entry, index) =>
            index === slotIndex ? { ...entry, plantId: id } : entry,
          ),
          plantCounter: nextCounter,
          inventory: withCount(inventory, potId, -1),
          propagules: remaining,
        });
      },

      spendTalentPoint: (talentId) => {
        const { talentRanks, xp } = get();
        const talent = talentById[talentId];
        if (!talent) return;
        const rank = talentRanks[talentId] ?? 0;
        if (rank >= talent.maxRank) return;
        const level = levelForXp(xp, CONFIG.progression.xpCurve);
        const available = totalSkillPoints(level) - pointsSpent(talentRanks);
        if (available < 1) return;
        const treePoints = pointsInTree(talentRanks, allTalents, talent.tree);
        if (
          !isTierUnlocked(talent.tier, treePoints, CONFIG.progression.tierThresholds)
        ) {
          return;
        }
        set({ talentRanks: { ...talentRanks, [talentId]: rank + 1 } });
      },

      respec: () => {
        const { talentRanks, hazelnuts } = get();
        const spent = pointsSpent(talentRanks);
        if (spent === 0) return;
        const cost = respecCost(spent, CONFIG.progression);
        if (hazelnuts < cost) return;
        set({ talentRanks: {}, hazelnuts: hazelnuts - cost });
      },

      treatPlant: (plantId) => {
        const { activeEvents, inventory } = get();
        const infested = activeEvents.some(
          (event) => event.kind === "gnats" && event.plantId === plantId,
        );
        if (!infested || (inventory["gelbtafeln"] ?? 0) < 1) return;
        set({
          activeEvents: activeEvents.filter(
            (event) => event.kind !== "gnats" || event.plantId !== plantId,
          ),
          inventory: withCount(inventory, "gelbtafeln", -1),
        });
      },

      chooseSquirrel: (squirrelId) => {
        if (!squirrelById[squirrelId]) return;
        set({ squirrelId });
      },

      advanceTutorial: (trigger) => {
        const { tutorialStep, tutorialDone } = get();
        const next = advanceTutorialState(
          { step: tutorialStep, done: tutorialDone },
          trigger,
          tutorialSteps,
        );
        if (next.step === tutorialStep && next.done === tutorialDone) return;
        set({ tutorialStep: next.step, tutorialDone: next.done });
      },

      skipTutorial: () => {
        const next = skipTutorialState(tutorialSteps);
        set({ tutorialStep: next.step, tutorialDone: next.done });
      },

      getSave: () => pickSave(get()),

      loadSave: (save) => set(pickSave(save)),

      resetGame: () => set(freshSave(Date.now())),

      switchToSlot: (slot) => {
        if (slot === getActiveSlot()) return;
        setActiveSlot(slot);
        const save = readSlot(slot);
        if (save) get().loadSave(save);
        else get().resetGame();
      },

      importSave: (json) => {
        let raw: unknown;
        try {
          raw = JSON.parse(json);
        } catch {
          return { ok: false, error: "invalid-json" };
        }
        const envelope = exportEnvelopeSchema.safeParse(raw);
        if (!envelope.success) return { ok: false, error: "wrong-file" };
        let migrated: unknown = envelope.data.save;
        if (envelope.data.version < SAVE_VERSION) {
          try {
            migrated = migrateSave(migrated, envelope.data.version);
          } catch {
            return { ok: false, error: "migration-failed" };
          }
        }
        const save = saveSchema.safeParse(migrated);
        if (!save.success) return { ok: false, error: "invalid-save" };
        get().loadSave(save.data);
        return { ok: true };
      },
    }),
    {
      name: "kobelgarten-save",
      version: SAVE_VERSION,
      migrate: migrateSave,
      storage: slotStorage,
      partialize: (state) => pickSave(state),
    },
  ),
);
