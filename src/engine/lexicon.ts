import type { Genome, PlantSpecies, VariegationType } from "./schemas";
import { variegationTypeSchema } from "./schemas";

/**
 * Pflanzenlexikon (PLAN 2.7): Sammelalbum aller entdeckten
 * Art × Variegations-Kombis. Der Lexikon-Stand lebt im Save als
 * `comboKey → Tick der Entdeckung`.
 */

export function comboKey(speciesId: string, type: VariegationType): string {
  return `${speciesId}:${type}`;
}

/** Anzeige-Reihenfolge der Variegations-Typen (Schema-Reihenfolge). */
const TYPE_ORDER = variegationTypeSchema.options;

/**
 * Alle für eine Art erreichbaren Variegations-Typen: die eigenen plus die
 * der Kreuzungspartner (gleiche crossGroup) — geerbte Typen bleiben beim
 * Kreuzen erhalten, auch wenn die Kind-Art sie nicht selbst auswürfelt.
 * "none" ist immer dabei (die unveränderte Pflanze).
 */
export function reachableVariegations(
  species: PlantSpecies,
  allSpecies: readonly PlantSpecies[],
): VariegationType[] {
  const reachable = new Set<VariegationType>(["none"]);
  for (const other of allSpecies) {
    if (other.crossGroup !== species.crossGroup) continue;
    for (const type of other.allowedVariegations) reachable.add(type);
  }
  return TYPE_ORDER.filter((type) => reachable.has(type));
}

/** Anzahl aller Lexikon-Kombis über alle Arten. */
export function totalComboCount(allSpecies: readonly PlantSpecies[]): number {
  return allSpecies.reduce(
    (sum, species) => sum + reachableVariegations(species, allSpecies).length,
    0,
  );
}

export interface DiscoveryResult {
  lexicon: Record<string, number>;
  /** Frisch entdeckte comboKeys (Erstzüchtungen → XP). */
  discovered: string[];
}

/** Trägt Genome ins Lexikon ein; bereits bekannte Kombis bleiben unberührt. */
export function discoverCombos(
  lexicon: Record<string, number>,
  genomes: readonly Genome[],
  tick: number,
): DiscoveryResult {
  const next = { ...lexicon };
  const discovered: string[] = [];
  for (const genome of genomes) {
    const key = comboKey(genome.speciesId, genome.variegation.type);
    if (key in next) continue;
    next[key] = tick;
    discovered.push(key);
  }
  return { lexicon: next, discovered };
}

/** Komplettierungsgrad 0–1; zählt nur Kombis, die im Raster existieren. */
export function lexiconCompletion(
  lexicon: Record<string, number>,
  allSpecies: readonly PlantSpecies[],
): number {
  const total = totalComboCount(allSpecies);
  if (total === 0) return 0;
  let found = 0;
  for (const species of allSpecies) {
    for (const type of reachableVariegations(species, allSpecies)) {
      if (comboKey(species.id, type) in lexicon) found += 1;
    }
  }
  return found / total;
}

export interface LexiconReward {
  /** Komplettierungs-Schwelle 0–1. */
  completion: number;
  hazelnuts: number;
  xp: number;
}
