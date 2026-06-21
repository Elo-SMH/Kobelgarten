/**
 * Headless-Ökonomie-Simulation (PLAN 6 / .claude/commands/balance-check.md).
 *
 * Spielt N simulierte Stunden ausschließlich über Engine-Funktionen mit
 * seeded RNG — kein React, kein DOM, keine Wanduhr. Strategie eines fleißigen
 * Spielers: billigsten Samen kaufen → optimal pflegen → fleißig Stecklinge
 * schneiden (Variegations-Jagd) → Adulte verkaufen.
 *
 * Aufruf: `npm run sim` (oder `npm run sim -- 200 24`  →  Stunden, Seeds).
 *
 * Bewusst NICHT importiert: der Zustand-Store (localStorage). Hier laufen nur
 * reine Engine-Funktionen, damit die Balance deterministisch messbar bleibt.
 */
import { CONFIG } from "../src/content/config";
import { allSpecies, speciesById } from "../src/content/plants";
import { effectiveSellPrice, plantValue } from "../src/engine/economy";
import {
  createPlant,
  phaseOf,
  tickPlant,
  type PlantInstance,
} from "../src/engine/growth";
import { createSeedGenome, mutate } from "../src/engine/genetics";
import { createRng, hashSeed, type Rng } from "../src/engine/rng";
import type { Genome, LightPlacement, PlantSpecies } from "../src/engine/schemas";

const HOURS = Number(process.argv[2] ?? 200);
const SEEDS = Number(process.argv[3] ?? 24);
const TICKS = HOURS * 60;
const SLOTS = 4;
/** Hauptkultur des Geldkreislaufs: die billigste Art. */
const CROP = [...allSpecies].sort((a, b) => a.basePrice - b.basePrice)[0];
const POT_PRICE = CONFIG.shop.potPrices.medium;

/** Bestplatzierung: das Licht, das diese Art am schnellsten wachsen lässt. */
function bestPlacement(species: PlantSpecies): LightPlacement {
  const factors = CONFIG.growth.lightFactors[species.lightNeed];
  return factors.window >= factors.shade ? "window" : "shade";
}

interface Slot {
  plant: PlantInstance | null;
}

interface SimResult {
  /** Haselnuss-Kassenstand je voller Stunde. */
  balanceByHour: number[];
  /** Tick der ersten gewürfelten Variegation (Infinity, falls keine). */
  firstVariegationTick: number;
  /** Tick, ab dem man Samen + Topf jeder Art zum ersten Mal stemmen kann. */
  affordTick: Record<string, number>;
}

function runSim(seed: number): SimResult {
  const rng: Rng = createRng(hashSeed(`balance-sim:${seed}`));
  const slots: Slot[] = Array.from({ length: SLOTS }, () => ({ plant: null }));
  const cuttings: Genome[] = [];
  let hazelnuts = CONFIG.startHazelnuts;
  let pots = 0; // wiederverwendbare Töpfe im Bestand
  let plantId = 0;
  let firstVariegationTick = Infinity;
  const balanceByHour: number[] = [];
  const affordTick: Record<string, number> = {};

  const placement = bestPlacement(CROP);

  const recordAffordability = (tick: number) => {
    for (const species of allSpecies) {
      if (affordTick[species.id] !== undefined) continue;
      if (hazelnuts >= species.basePrice + POT_PRICE) affordTick[species.id] = tick;
    }
  };
  recordAffordability(0);

  for (let tick = 1; tick <= TICKS; tick++) {
    // 1) Optimale Pflege: jede lebende Pflanze wird vor dem Tick voll gegossen
    //    und am besten Platz simuliert → kein Welken, kein Wassermangel.
    for (const slot of slots) {
      if (!slot.plant) continue;
      const watered = { ...slot.plant, water: 1 };
      slot.plant = tickPlant(watered, CROP, placement, CONFIG.growth);
    }

    // 2) Zucht: Slot 0 ist die Mutterpflanze — sobald reif, wird ein Steckling
    //    geschnitten (kostet Wachstum, danach wächst sie nach). Realistische
    //    Trennung: gezüchtet wird hier, verkauft auf den übrigen Plätzen, damit
    //    das Schneiden nicht den Geldkreislauf abwürgt.
    const mother = slots[0].plant;
    if (mother && mother.progress >= CONFIG.cutting.minProgress) {
      const species = speciesById[mother.genome.speciesId];
      const child = mutate(mother.genome, species, rng, CONFIG.genetics);
      const cost = species.cuttingCost ?? CONFIG.cutting.defaultCost;
      slots[0].plant = {
        ...mother,
        progress: Math.max(0, mother.progress - cost),
      };
      if (child.variegation.type !== "none") {
        if (tick < firstVariegationTick) firstVariegationTick = tick;
        cuttings.push(child); // variegierte Stecklinge weiterziehen
      }
    }

    // 3) Ernten: adulte Verkaufs-Pflanzen (Slots ab 1) verkaufen.
    for (let i = 1; i < slots.length; i++) {
      const plant = slots[i].plant;
      if (!plant || plant.dead) continue;
      const phase = phaseOf(plant.progress, CONFIG.growth);
      if (phase !== "adult" && phase !== "pracht") continue;
      const species = speciesById[plant.genome.speciesId];
      const value = plantValue(plant, species, CONFIG.growth, CONFIG.economy);
      hazelnuts += effectiveSellPrice(value, 1);
      pots += 1;
      slots[i].plant = null;
    }

    // 4) Nachpflanzen: Slot 0 immer als Mutterpflanze (frischer Samen);
    //    Verkaufs-Plätze bevorzugt aus variegierten Stecklingen, sonst Samen.
    for (let i = 0; i < slots.length; i++) {
      if (slots[i].plant) continue;
      if (pots <= 0) {
        if (hazelnuts < POT_PRICE) continue;
        hazelnuts -= POT_PRICE;
        pots += 1;
      }
      const cutting = i >= 1 ? cuttings.shift() : undefined;
      if (cutting) {
        pots -= 1;
        plantId += 1;
        slots[i].plant = createPlant(
          `sim-${plantId}`,
          cutting,
          "medium",
          CONFIG.genetics.cuttingStartProgress,
        );
        continue;
      }
      if (hazelnuts < CROP.basePrice) continue;
      hazelnuts -= CROP.basePrice;
      pots -= 1;
      plantId += 1;
      const genome = createSeedGenome(CROP.id, rng, CONFIG.genetics);
      slots[i].plant = createPlant(`sim-${plantId}`, genome, "medium");
    }

    recordAffordability(tick);
    if (tick % 60 === 0) balanceByHour.push(hazelnuts);
  }

  return { balanceByHour, firstVariegationTick, affordTick };
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

function formatTicks(ticks: number): string {
  if (!Number.isFinite(ticks)) return "nie";
  const hours = Math.floor(ticks / 60);
  const minutes = ticks % 60;
  return hours > 0 ? `${hours} h ${minutes} min` : `${minutes} min`;
}

// ── Simulation laufen lassen ────────────────────────────────────────────────
const results = Array.from({ length: SEEDS }, (_, seed) => runSim(seed));
const sample = results[0];

console.log(`\n🌰 KOBELGARTEN — Balance-Check`);
console.log(
  `   ${HOURS} simulierte Stunden · ${SEEDS} Seeds · ${SLOTS} Regalplätze · Hauptkultur: ${CROP.name}\n`,
);

// 1) Geldkurve (repräsentativer Seed 0)
console.log("── Haselnuss-Kassenstand (Seed 0) ──────────────────────────");
const marks = [1, 2, 5, 10, 25, 50, 100, 200].filter((h) => h <= HOURS);
for (const hour of marks) {
  const balance = sample.balanceByHour[hour - 1] ?? 0;
  const bar = "█".repeat(Math.min(40, Math.round(balance / 50)));
  console.log(`   h${String(hour).padStart(3)}  ${String(balance).padStart(7)} 🌰  ${bar}`);
}

// 2) Erste Variegation (Median über alle Seeds)
const firstVarTicks = results.map((r) => r.firstVariegationTick);
const medianFirstVar = median(firstVarTicks);
console.log("\n── Erste Variegation ───────────────────────────────────────");
console.log(`   Median über ${SEEDS} Seeds: ${formatTicks(medianFirstVar)}`);
console.log(
  `   schnellster / langsamster: ${formatTicks(Math.min(...firstVarTicks))} / ${formatTicks(Math.max(...firstVarTicks))}`,
);

// 3) Zeit bis Art leistbar (Median)
console.log("\n── Zeit bis Art leistbar (Samen + Topf, Median) ────────────");
for (const species of [...allSpecies].sort((a, b) => a.basePrice - b.basePrice)) {
  const ticks = results.map((r) => r.affordTick[species.id] ?? Infinity);
  console.log(
    `   ${species.name.padEnd(14)} ${String(species.basePrice).padStart(3)} 🌰   ${formatTicks(median(ticks))}`,
  );
}

// 4) Einkommen pro Stunde (Seed 0, Differenz der Kassenstände)
function incomePerHour(from: number, to: number): number {
  const start = from === 0 ? CONFIG.startHazelnuts : sample.balanceByHour[from - 1] ?? 0;
  const end = sample.balanceByHour[to - 1] ?? start;
  return Math.round((end - start) / (to - from));
}
console.log("\n── Einkommen pro Stunde (Seed 0) ───────────────────────────");
console.log(`   früh   (h0–h2):    ${incomePerHour(0, Math.min(2, HOURS))} 🌰/h`);
if (HOURS >= 50) console.log(`   mitte  (h25–h50):  ${incomePerHour(25, 50)} 🌰/h`);
if (HOURS >= 200) console.log(`   spät   (h150–h200):${incomePerHour(150, 200)} 🌰/h`);

// 5) Ziel-Abgleich
console.log("\n── Ziel-Abgleich ───────────────────────────────────────────");
const monsteraAfford = median(
  results.map((r) => r.affordTick["monstera-deliciosa"] ?? Infinity),
);
const flag = (ok: boolean) => (ok ? "✅" : "⚠️ ");
console.log(
  `   ${flag(medianFirstVar >= 60 && medianFirstVar <= 180)} Erste Variegation in 1–3 h  → ${formatTicks(medianFirstVar)}`,
);
console.log(
  `   ${flag(monsteraAfford <= 180)} Monstera ~nach 2 h leistbar  → ${formatTicks(monsteraAfford)}`,
);
const lateIncome = HOURS >= 200 ? incomePerHour(150, 200) : 0;
const midIncome = HOURS >= 50 ? incomePerHour(25, 50) : 1;
const runaway = HOURS >= 200 && lateIncome > midIncome * 8;
console.log(
  `   ${flag(!runaway)} Kein exponentielles Einkommens-Runaway  → spät/mitte = ${midIncome > 0 ? (lateIncome / midIncome).toFixed(1) : "n/a"}×`,
);
console.log("");
