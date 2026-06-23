import { z } from "zod";
import {
  genomeSchema,
  lightPlacementSchema,
  potSizeSchema,
  variegationTypeSchema,
} from "../engine/schemas";
import { SAVE_VERSION, type Save } from "./migrations";

/**
 * zod-Schema des kompletten Spielstands (PLAN 2.7: Export/Import mit
 * Validierung). Greift nur beim Import einer JSON-Datei — ein manipuliertes
 * oder fremdes File wird abgewiesen, statt den Store zu vergiften. Die Felder
 * spiegeln SaveV6 in migrations.ts; bei einer Save-Erweiterung muss dieses
 * Schema mitwachsen.
 */
const plantInstanceSchema = z.object({
  id: z.string(),
  genome: genomeSchema,
  progress: z.number(),
  water: z.number(),
  wilt: z.number(),
  dead: z.boolean(),
  potSize: potSizeSchema,
  fertilizerTicks: z.number(),
});

const shelfSlotSchema = z.object({
  placement: lightPlacementSchema,
  plantId: z.string().nullable(),
});

const propaguleSchema = z.object({
  id: z.string(),
  kind: z.enum(["cutting", "seed"]),
  genome: genomeSchema,
});

const activeEventSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("gnats"),
    id: z.string(),
    plantId: z.string(),
    expiresAtTick: z.number(),
  }),
  z.object({
    kind: z.literal("sunburn"),
    id: z.string(),
    plantId: z.string(),
    expiresAtTick: z.number(),
  }),
  z.object({
    kind: z.literal("collector"),
    id: z.string(),
    variegation: variegationTypeSchema,
    priceFactor: z.number(),
    expiresAtTick: z.number(),
  }),
]);

export const saveSchema = z.object({
  tick: z.number(),
  lastTickAt: z.number(),
  hazelnuts: z.number(),
  plants: z.record(plantInstanceSchema),
  shelf: z.array(shelfSlotSchema),
  plantCounter: z.number(),
  inventory: z.record(z.number()),
  wateringCanLevel: z.number(),
  propagules: z.record(propaguleSchema),
  propaguleCounter: z.number(),
  xp: z.number(),
  talentRanks: z.record(z.number()),
  activeEvents: z.array(activeEventSchema),
  eventCounter: z.number(),
  lexicon: z.record(z.number()),
  lexiconRewardsClaimed: z.number(),
  squirrelId: z.string().nullable(),
  tutorialStep: z.number(),
  tutorialDone: z.boolean(),
  rootingPowder: z.boolean(),
}) satisfies z.ZodType<Save>;

/**
 * Datei-Hülle des Exports: Marker, Save-Version und der Spielstand. Die
 * Version steuert die Migration beim Import (alte Backups bleiben gültig).
 */
export const exportEnvelopeSchema = z.object({
  app: z.literal("kobelgarten"),
  version: z.number().int().min(1).max(SAVE_VERSION),
  exportedAt: z.string(),
  save: z.record(z.unknown()),
});
export type ExportEnvelope = z.infer<typeof exportEnvelopeSchema>;
