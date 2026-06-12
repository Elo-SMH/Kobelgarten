import type { PlantSpecies } from "../../engine/schemas";
import { gruenlilie } from "./gruenlilie";
import { pothos } from "./pothos";
import { syngonium } from "./syngonium";

/**
 * Registry of all species. A new species = one new file in this folder
 * plus one entry here — zero engine or UI changes.
 */
export const allSpecies: PlantSpecies[] = [pothos, gruenlilie, syngonium];

export const speciesById: Record<string, PlantSpecies> = Object.fromEntries(
  allSpecies.map((species) => [species.id, species]),
);
