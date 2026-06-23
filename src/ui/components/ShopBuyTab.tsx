import { CONFIG } from "../../content/config";
import { gearItems, seedItems, shopItemById } from "../../content/items";
import { allTalents } from "../../content/skills";
import { shelfSlotPrice } from "../../engine/economy";
import { computeModifiers } from "../../engine/skills";
import { itemName, t } from "../../i18n";
import { todaysOffer } from "../../state/shop";
import { useGameStore } from "../../state/store";
import { ShopItemRow } from "./ShopItemRow";

export function ShopBuyTab() {
  const hazelnuts = useGameStore((state) => state.hazelnuts);
  const slotCount = useGameStore((state) => state.shelf.length);
  const talentRanks = useGameStore((state) => state.talentRanks);
  const buyShelfSlot = useGameStore((state) => state.buyShelfSlot);

  const offer = todaysOffer(new Date());
  const offerItem = offer ? shopItemById[offer.itemId] : null;

  const shelfFull = slotCount >= CONFIG.shop.maxShelfSlots;
  // Gleiche Rechnung wie store.buyShelfSlot (inkl. Regal-Schreiner-Talent).
  const { shelfSlotDiscount } = computeModifiers(talentRanks, allTalents);
  const slotPrice = Math.max(
    1,
    Math.round(
      shelfSlotPrice(slotCount - CONFIG.shelf.slots.length, CONFIG.shop.shelfSlot) *
        (1 - shelfSlotDiscount),
    ),
  );

  return (
    <div className="flex flex-col gap-6">
      {offer && offerItem && (
        <section className="rounded-2xl border-2 border-hazel-300 bg-cream-50 px-4 py-3 shadow-sm">
          <h2 className="text-xs font-bold uppercase tracking-wide text-hazel-500">
            🏷️ {t("shop.dailyOfferHeading")}
          </h2>
          <p className="mt-1 font-semibold">
            {offerItem.emoji} {itemName(offerItem)}{" "}
            <span className="ml-1 rounded-full bg-leaf-500 px-2 py-0.5 text-xs font-bold text-white">
              {t("shop.dailyOfferBadge", {
                percent: Math.round(offer.discount * 100),
              })}
            </span>
          </p>
        </section>
      )}

      <section>
        <h2 className="mb-2 text-lg font-semibold text-leaf-900">
          {t("shop.seedsHeading")}
        </h2>
        <ul className="flex flex-col gap-2">
          {seedItems.map((item) => (
            <ShopItemRow key={item.id} item={item} offer={offer} />
          ))}
        </ul>
      </section>

      <section>
        <h2 className="mb-2 text-lg font-semibold text-leaf-900">
          {t("shop.gearHeading")}
        </h2>
        <ul className="flex flex-col gap-2">
          {gearItems.map((item) => (
            <ShopItemRow key={item.id} item={item} offer={offer} />
          ))}
        </ul>
      </section>

      <section>
        <h2 className="mb-2 text-lg font-semibold text-leaf-900">
          {t("shop.shelfHeading")}
        </h2>
        <div className="flex items-center gap-3 rounded-2xl border border-cream-300 bg-cream-50 px-4 py-3 shadow-sm">
          <span className="text-2xl" aria-hidden>
            🪜
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-semibold">{t("shop.shelfSlotName")}</p>
            <p className="text-xs text-hazel-500">
              {t("shop.shelfSlotDesc", {
                count: slotCount,
                max: CONFIG.shop.maxShelfSlots,
              })}
            </p>
          </div>
          {shelfFull ? (
            <span className="rounded-full bg-leaf-100 px-3 py-1 text-sm font-medium text-leaf-900">
              ✓ {t("shop.shelfFullLabel")}
            </span>
          ) : (
            <>
              <span className="font-semibold tabular-nums">🌰 {slotPrice}</span>
              <button
                onClick={buyShelfSlot}
                disabled={hazelnuts < slotPrice}
                className="rounded-full bg-leaf-500 px-4 py-1.5 text-sm font-medium text-white transition hover:bg-leaf-700 disabled:cursor-not-allowed disabled:bg-cream-200 disabled:text-hazel-300"
              >
                {t("shop.buyAction")}
              </button>
            </>
          )}
        </div>
      </section>
    </div>
  );
}
