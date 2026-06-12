import { z } from "zod";

/**
 * zod schemas for all data shapes (PLAN.md 2.1). Content files and save
 * imports are validated against these — never hardcode species-specific
 * logic in the engine, express it through these data fields.
 */

export const variegationTypeSchema = z.enum([
  "none",
  "marginata",
  "sectoral",
  "splash",
  "halfmoon",
  "albo",
]);
export type VariegationType = z.infer<typeof variegationTypeSchema>;

export const genomeSchema = z.object({
  speciesId: z.string().min(1),
  /** Wachstumstempo. */
  growthRate: z.number().min(0.5).max(1.5),
  /** Endgröße/Blattgröße. */
  size: z.number().min(0.7).max(1.3),
  /** Farbton-Verschiebung der Blätter in Grad. */
  hueShift: z.number().min(-20).max(20),
  /** Verzeiht Pflegefehler. */
  hardiness: z.number().min(0.5).max(1.5),
  variegation: z.object({
    type: variegationTypeSchema,
    /** Anteil heller Fläche. */
    coverage: z.number().min(0).max(0.6),
    /** 1 = stabil, 0 = revertiert fast sicher pro Vermehrung. */
    stability: z.number().min(0).max(1),
  }),
});
export type Genome = z.infer<typeof genomeSchema>;

export const leafShapeSchema = z.enum(["heart", "blade", "arrow", "fenestrated"]);
export type LeafShape = z.infer<typeof leafShapeSchema>;

export const lightNeedSchema = z.enum(["low", "medium", "bright"]);
export type LightNeed = z.infer<typeof lightNeedSchema>;

/** Stellplatz am Regal: Fensterplatz oder Schatten. */
export const lightPlacementSchema = z.enum(["window", "shade"]);
export type LightPlacement = z.infer<typeof lightPlacementSchema>;

/** Topfgrößen — die Größe bestimmt das Wachstumslimit (config.growth.potCaps). */
export const potSizeSchema = z.enum(["small", "medium", "large"]);
export type PotSize = z.infer<typeof potSizeSchema>;

const shopItemBase = {
  id: z.string().regex(/^[a-z0-9-]+$/),
  /** Deutscher Anzeigename. */
  name: z.string().min(1),
  emoji: z.string().min(1),
  /** Kaufpreis in Haselnüssen. */
  price: z.number().positive(),
};

/**
 * Shop-Artikel sind Daten, kein Verhalten: ihre Wirkung (Topf-Limit,
 * Dünger-Stärke, …) steht in config.ts, hier nur die Referenz.
 */
export const shopItemSchema = z.discriminatedUnion("kind", [
  z.object({ ...shopItemBase, kind: z.literal("seed"), speciesId: z.string().min(1) }),
  z.object({ ...shopItemBase, kind: z.literal("pot"), potSize: potSizeSchema }),
  z.object({ ...shopItemBase, kind: z.literal("fertilizer") }),
  z.object({
    ...shopItemBase,
    kind: z.literal("upgrade"),
    upgradeId: z.enum(["wateringCan"]),
  }),
]);
export type ShopItem = z.infer<typeof shopItemSchema>;

const hexColorSchema = z.string().regex(/^#[0-9a-f]{6}$/i, "expected #rrggbb");

export const plantSpeciesSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  /** Deutscher Anzeigename. */
  name: z.string().min(1),
  basePrice: z.number().positive(),
  /** Ticks von Samen bis Adult bei growthRate 1 und perfekter Pflege. */
  growthTicks: z.number().int().positive(),
  /** Basis-Mutationschance pro Vermehrung. */
  mutability: z.number().min(0).max(1),
  waterDrainPerTick: z.number().positive().max(0.01),
  lightNeed: lightNeedSchema,
  /** Bestimmt Kreuz-Kompatibilität. */
  crossGroup: z.string().min(1),
  allowedVariegations: z
    .array(variegationTypeSchema.exclude(["none"]))
    .min(1),
  /** Key für den SVG-Renderer. */
  leafShape: leafShapeSchema,
  palette: z.object({
    base: hexColorSchema,
    varieg: hexColorSchema,
  }),
});
export type PlantSpecies = z.infer<typeof plantSpeciesSchema>;
