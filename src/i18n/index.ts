import de from "./de.json";

export type MessageKey = keyof typeof de;

/**
 * All user-facing strings come from de.json (key-based, English keys).
 * `{name}`-Platzhalter werden durch `params` ersetzt.
 */
export function t(
  key: MessageKey,
  params?: Record<string, string | number>,
): string {
  const message = de[key];
  if (!params) return message;
  return message.replace(/\{(\w+)\}/g, (match, name: string) =>
    name in params ? String(params[name]) : match,
  );
}
