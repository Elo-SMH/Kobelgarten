import type { PlantSpecies } from "../../engine/schemas";

export const gruenlilie: PlantSpecies = {
  id: "gruenlilie",
  name: "Grünlilie",
  basePrice: 15,
  growthTicks: 700, // schnell
  mutability: 0.01, // niedrig
  waterDrainPerTick: 0.001,
  lightNeed: "medium",
  crossGroup: "chlorophytum",
  allowedVariegations: ["marginata", "sectoral"],
  leafShape: "blade",
  palette: { base: "#6a994e", varieg: "#f2e8cf" },
};
