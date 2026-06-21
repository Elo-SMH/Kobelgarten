import type { PlantSpecies } from "../../engine/schemas";

export const syngonium: PlantSpecies = {
  id: "syngonium",
  name: "Syngonium",
  basePrice: 25,
  growthTicks: 1000, // mittel
  mutability: 0.04, // hoch: die Variegations-Farm
  cuttingCost: 0.2, // leicht zu vermehren
  waterDrainPerTick: 0.0011,
  lightNeed: "medium",
  crossGroup: "araceae",
  allowedVariegations: ["marginata", "sectoral", "splash", "halfmoon", "albo"],
  leafShape: "arrow",
  palette: { base: "#40916c", varieg: "#f8f9fa" },
};
