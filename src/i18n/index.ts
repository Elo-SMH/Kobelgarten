import de from "./de.json";

export type MessageKey = keyof typeof de;

/** All user-facing strings come from de.json (key-based, English keys). */
export function t(key: MessageKey): string {
  return de[key];
}
