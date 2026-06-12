import { shopItemSchema, type PotSize, type ShopItem } from "../engine/schemas";
import { CONFIG } from "./config";
import { allSpecies } from "./plants";

/**
 * Shop-Sortiment als Daten (kein Verhalten): Wirkung der Items steht in
 * config.ts. Samen werden aus der Arten-Registry abgeleitet — eine neue Art
 * bekommt automatisch ihren Samen, Preis = basePrice (PLAN 2.5).
 */
export const seedItems: ShopItem[] = allSpecies.map((species) =>
  shopItemSchema.parse({
    kind: "seed",
    id: `seed-${species.id}`,
    name: `${species.name}-Samen`,
    emoji: "🌱",
    price: species.basePrice,
    speciesId: species.id,
  } satisfies ShopItem),
);

const rawGearItems: ShopItem[] = [
  {
    kind: "pot",
    id: "pot-small",
    name: "Kleiner Topf",
    emoji: "🥣",
    price: CONFIG.shop.potPrices.small,
    potSize: "small",
  },
  {
    kind: "pot",
    id: "pot-medium",
    name: "Mittlerer Topf",
    emoji: "🪴",
    price: CONFIG.shop.potPrices.medium,
    potSize: "medium",
  },
  {
    kind: "pot",
    id: "pot-large",
    name: "Großer Topf",
    emoji: "🏺",
    price: CONFIG.shop.potPrices.large,
    potSize: "large",
  },
  {
    kind: "fertilizer",
    id: "duenger",
    name: "Dünger",
    emoji: "🧪",
    price: CONFIG.shop.fertilizerPrice,
  },
  {
    kind: "upgrade",
    id: "giesskanne-gross",
    name: "Große Gießkanne",
    emoji: "🚿",
    price: CONFIG.shop.wateringCanUpgradePrice,
    upgradeId: "wateringCan",
  },
];

export const gearItems: ShopItem[] = rawGearItems.map((item) =>
  shopItemSchema.parse(item),
);

export const allShopItems: ShopItem[] = [...seedItems, ...gearItems];

export const shopItemById: Record<string, ShopItem> = Object.fromEntries(
  allShopItems.map((item) => [item.id, item]),
);

/** Kandidaten fürs Tagesangebot (einmalige Upgrades ausgenommen). */
export const dailyOfferPool: string[] = allShopItems
  .filter((item) => item.kind !== "upgrade")
  .map((item) => item.id);

/** Inventar-Item-Id des Topfs einer Größe (Konvention: pot-<size>). */
export function potItemId(potSize: PotSize): string {
  return `pot-${potSize}`;
}
