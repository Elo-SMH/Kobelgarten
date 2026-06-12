import { CONFIG } from "../content/config";
import { dailyOfferPool, shopItemById } from "../content/items";
import {
  dailyOffer,
  dateKey,
  discountedPrice,
  type DailyOffer,
} from "../engine/economy";

/**
 * Tagesangebot für den lokalen Kalendertag von `date`. UI und Store rufen
 * beide hierüber ab, damit Anzeige- und Kaufpreis nie auseinanderlaufen.
 */
export function todaysOffer(date: Date): DailyOffer | null {
  return dailyOffer(dateKey(date), dailyOfferPool, CONFIG.shop.dailyOfferDiscount);
}

/** Aktueller Kaufpreis eines Items inkl. eventuellem Tagesangebot. */
export function itemPrice(itemId: string, offer: DailyOffer | null): number {
  const item = shopItemById[itemId];
  if (!item) return Infinity;
  return offer?.itemId === itemId
    ? discountedPrice(item.price, offer.discount)
    : item.price;
}
