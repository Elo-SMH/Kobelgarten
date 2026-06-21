import type { PlantSpecies } from "../../engine/schemas";

export const pothos: PlantSpecies = {
  id: "pothos",
  name: "Efeutute",
  basePrice: 10,
  growthTicks: 600, // schnell: ~10h bis Adult
  mutability: 0.02, // mittel
  cuttingCost: 0.2, // robust, gut vermehrbar
  waterDrainPerTick: 0.0012,
  lightNeed: "low", // Einsteiger: verzeiht den Schattenplatz
  crossGroup: "araceae",
  allowedVariegations: ["marginata", "sectoral", "splash"],
  leafShape: "heart",
  palette: { base: "#3a7d44", varieg: "#f1f6e8" },
};
