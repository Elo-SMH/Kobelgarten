import type { PlantSpecies } from "../../engine/schemas";

export const philodendron: PlantSpecies = {
  id: "philodendron",
  name: "Philodendron",
  basePrice: 40,
  growthTicks: 1100, // mittel
  mutability: 0.02, // mittel
  waterDrainPerTick: 0.0011,
  lightNeed: "medium",
  crossGroup: "araceae", // Besonderheit: kreuzbar mit der Monstera-Gruppe
  allowedVariegations: ["sectoral", "splash", "halfmoon"],
  leafShape: "heart",
  palette: { base: "#356f45", varieg: "#f6f3d8" },
};
