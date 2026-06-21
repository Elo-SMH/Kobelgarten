import type { PlantSpecies } from "../../engine/schemas";

export const hoya: PlantSpecies = {
  id: "hoya",
  name: "Hoya",
  basePrice: 100,
  growthTicks: 3200, // sehr langsam
  mutability: 0.02, // mittel
  cuttingCost: 0.4, // sehr langsam: Stecklinge sind teuer erkauft
  waterDrainPerTick: 0.0006, // Sukkulenten-Blätter: kommt lange ohne Wasser aus
  lightNeed: "bright",
  crossGroup: "apocynaceae", // mit niemandem im Startsortiment kreuzbar
  // Besonderheit "Blüte = Bonus-Verkaufswert" folgt mit dem Event-System (M5)
  allowedVariegations: ["marginata", "splash"],
  leafShape: "heart",
  palette: { base: "#4f7942", varieg: "#f5e9d0" },
};
