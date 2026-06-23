import de from "./de.json";
import en from "./en.json";

/**
 * Reiner i18n-Kern (kein Store, kein React): Sprachenliste, Erkennung der
 * bevorzugten Sprache und die eigentliche Übersetzungsfunktion. So bleibt der
 * Kern deterministisch und unit-testbar — die UI-nahe Schicht (./index.ts)
 * verdrahtet ihn mit dem Einstellungs-Store.
 */

export type Locale = "de" | "en";

/** Übersetzungs-Keys (englische, sprechende Keys aus de.json). */
export type MessageKey = keyof typeof de;

export const SUPPORTED_LOCALES: readonly Locale[] = ["de", "en"];

/** Fallback, wenn weder Auswahl noch Browser eine Sprache liefern. */
export const DEFAULT_LOCALE: Locale = "de";

const MESSAGES: Record<Locale, Record<string, string>> = { de, en };

/**
 * Übersetzt einen Key in der gegebenen Sprache. Fehlt der Key in der Sprache,
 * fällt es auf Deutsch und zuletzt auf den Key selbst zurück (Dev-Signal).
 * `{name}`-Platzhalter werden durch `params` ersetzt.
 */
export function translate(
  locale: Locale,
  key: string,
  params?: Record<string, string | number>,
): string {
  const message = MESSAGES[locale][key] ?? MESSAGES.de[key] ?? key;
  if (!params) return message;
  return message.replace(/\{(\w+)\}/g, (match, name: string) =>
    name in params ? String(params[name]) : match,
  );
}

/** Mappt einen BCP-47-Tag (z.B. "en-US", "de") auf eine unterstützte Sprache. */
export function matchLocale(tag: string | null | undefined): Locale | null {
  if (!tag) return null;
  const base = tag.toLowerCase().split("-")[0];
  return (SUPPORTED_LOCALES as readonly string[]).includes(base)
    ? (base as Locale)
    : null;
}

/**
 * Wählt die beste unterstützte Sprache aus einer nach Präferenz geordneten
 * Tag-Liste (z.B. `navigator.languages`). Ohne Argument werden die Browser-/
 * Systemsprachen gelesen; das Argument hält die Funktion testbar.
 */
export function detectLocale(preferred?: readonly string[]): Locale {
  const tags = preferred ?? browserLanguages();
  for (const tag of tags) {
    const match = matchLocale(tag);
    if (match) return match;
  }
  return DEFAULT_LOCALE;
}

/** Bevorzugte Sprachen des Browsers, defensiv (kein navigator → leer). */
function browserLanguages(): readonly string[] {
  if (typeof navigator === "undefined") return [];
  const nav = navigator as Navigator & { languages?: readonly string[] };
  if (nav.languages && nav.languages.length > 0) return nav.languages;
  return nav.language ? [nav.language] : [];
}
