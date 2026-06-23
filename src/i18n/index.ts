import type { ShopItem } from "../engine/schemas";
import { useSettingsStore } from "../state/settings";
import { translate, type Locale, type MessageKey } from "./locale";

export type { Locale, MessageKey } from "./locale";
export {
  detectLocale,
  matchLocale,
  translate,
  SUPPORTED_LOCALES,
} from "./locale";

/** Aktuell gewählte UI-Sprache, beim Aufruf aus dem Store gelesen. */
export function activeLocale(): Locale {
  return useSettingsStore.getState().language;
}

/**
 * Übersetzt einen Key in der aktiven Sprache. Komponenten rendern bei einem
 * Sprachwechsel neu (App subscribed auf `language`), darum reicht der
 * Lesezugriff zum Aufrufzeitpunkt.
 */
export function t(
  key: MessageKey,
  params?: Record<string, string | number>,
): string {
  return translate(activeLocale(), key, params);
}

/**
 * Lokalisierter Anzeigename für Content (Daten bleiben Daten): der Name kommt
 * aus der i18n, der `name`-Wert aus dem Content dient nur als Fallback für
 * (noch) unübersetzte Einträge. translate() liefert bei fehlendem Key den Key
 * selbst zurück — daran erkennen wir „keine Übersetzung" und nehmen den Fallback.
 */
function localizedName(key: string, fallback: string): string {
  const resolved = translate(activeLocale(), key);
  return resolved === key ? fallback : resolved;
}

export function plantName(species: { id: string; name: string }): string {
  return localizedName(`plant.${species.id}.name`, species.name);
}

export function talentName(talent: { id: string; name: string }): string {
  return localizedName(`talent.${talent.id}.name`, talent.name);
}

export function itemName(item: ShopItem): string {
  if (item.kind === "seed") {
    const plant = localizedName(`plant.${item.speciesId}.name`, item.name);
    return t("shop.seedName", { plant });
  }
  return localizedName(`item.${item.id}.name`, item.name);
}
