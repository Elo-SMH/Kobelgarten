import type { PlantSpecies } from "../../engine/schemas";
import { alocasia } from "./alocasia";
import { calathea } from "./calathea";
import { gruenlilie } from "./gruenlilie";
import { hoya } from "./hoya";
import { monstera } from "./monstera";
import { philodendron } from "./philodendron";
import { pothos } from "./pothos";
import { syngonium } from "./syngonium";

/**
 * Registry of all species. A new species = one new file in this folder
 * plus one entry here — zero engine or UI changes.
 */
export const allSpecies: PlantSpecies[] = [
  pothos,
  gruenlilie,
  syngonium,
  philodendron,
  monstera,
  calathea,
  alocasia,
  hoya,
];

export const speciesById: Record<string, PlantSpecies> = Object.fromEntries(
  allSpecies.map((species) => [species.id, species]),
);
