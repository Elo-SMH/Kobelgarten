import { allTalents } from "../../content/skills";
import type { DailyOffer } from "../../engine/economy";
import type { ShopItem } from "../../engine/schemas";
import { computeModifiers } from "../../engine/skills";
import { t, type MessageKey } from "../../i18n";
import { itemPrice } from "../../state/shop";
import { useGameStore } from "../../state/store";
import { playSound } from "../sound";

const DESC_KEYS: Record<string, MessageKey> = {
  "pot-small": "item.pot-small.desc",
  "pot-medium": "item.pot-medium.desc",
  "pot-large": "item.pot-large.desc",
  duenger: "item.duenger.desc",
  gelbtafeln: "item.gelbtafeln.desc",
  "giesskanne-gross": "item.giesskanne-gross.desc",
};

interface ShopItemRowProps {
  item: ShopItem;
  offer: DailyOffer | null;
}

export function ShopItemRow({ item, offer }: ShopItemRowProps) {
  const hazelnuts = useGameStore((state) => state.hazelnuts);
  const owned = useGameStore((state) => state.inventory[item.id] ?? 0);
  const wateringCanLevel = useGameStore((state) => state.wateringCanLevel);
  const talentRanks = useGameStore((state) => state.talentRanks);
  const buyItem = useGameStore((state) => state.buyItem);

  // Gleiche Rechnung wie store.buyItem: Tagesangebot, dann Talent-Rabatt.
  const { shopDiscount } = computeModifiers(talentRanks, allTalents);
  const price = Math.max(
    1,
    Math.round(itemPrice(item.id, offer) * (1 - shopDiscount)),
  );
  const discounted = price < item.price;
  const alreadyUpgraded =
    item.kind === "upgrade" &&
    item.upgradeId === "wateringCan" &&
    wateringCanLevel >= 2;
  const descKey = item.kind === "seed" ? "item.seed.desc" : DESC_KEYS[item.id];

  return (
    <li className="flex items-center gap-3 rounded-2xl border border-cream-300 bg-cream-50 px-4 py-3 shadow-sm">
      <span className="text-2xl" aria-hidden>
        {item.emoji}
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-semibold">{item.name}</p>
        {descKey && <p className="text-xs text-hazel-500">{t(descKey)}</p>}
        {item.kind !== "upgrade" && owned > 0 && (
          <p className="text-xs text-leaf-700">
            {t("shop.ownedCount", { count: owned })}
          </p>
        )}
      </div>
      <div className="text-right">
        {discounted && (
          <span className="mr-2 text-sm text-hazel-300 line-through">
            {item.price}
          </span>
        )}
        <span className="font-semibold tabular-nums">🌰 {price}</span>
      </div>
      {alreadyUpgraded ? (
        <span className="rounded-full bg-leaf-100 px-3 py-1 text-sm font-medium text-leaf-900">
          ✓ {t("shop.purchasedLabel")}
        </span>
      ) : (
        <button
          onClick={() => {
            playSound("buy");
            buyItem(item.id);
          }}
          disabled={hazelnuts < price}
          className="rounded-full bg-leaf-500 px-4 py-1.5 text-sm font-medium text-white transition hover:bg-leaf-700 disabled:cursor-not-allowed disabled:bg-cream-200 disabled:text-hazel-300"
        >
          {t("shop.buyAction")}
        </button>
      )}
    </li>
  );
}
