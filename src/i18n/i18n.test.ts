import { describe, expect, it } from "vitest";
import de from "./de.json";
import en from "./en.json";
import { detectLocale, matchLocale, translate } from "./locale";

const PLACEHOLDER = /\{(\w+)\}/g;
function placeholders(value: string): string[] {
  return [...value.matchAll(PLACEHOLDER)].map((match) => match[1]).sort();
}

describe("message catalogs", () => {
  const deKeys = Object.keys(de).sort();
  const enKeys = Object.keys(en).sort();

  it("cover exactly the same keys in de and en", () => {
    expect(enKeys).toEqual(deKeys);
  });

  it("have no empty translations", () => {
    for (const [key, value] of Object.entries({ ...de, ...en })) {
      expect(value, key).not.toBe("");
    }
  });

  it("keep the same {placeholders} across languages", () => {
    for (const key of deKeys) {
      const deValue = (de as Record<string, string>)[key];
      const enValue = (en as Record<string, string>)[key];
      expect(placeholders(enValue), key).toEqual(placeholders(deValue));
    }
  });
});

describe("translate", () => {
  it("returns the value for the given locale", () => {
    expect(translate("de", "phase.adult")).toBe("Ausgewachsen");
    expect(translate("en", "phase.adult")).toBe("Mature");
  });

  it("substitutes placeholders", () => {
    expect(translate("en", "menu.slotLabel", { n: 2 })).toBe("Slot 2");
    expect(translate("en", "shop.seedName", { plant: "Monstera" })).toBe(
      "Monstera seed",
    );
  });

  it("falls back to the key when nothing matches", () => {
    expect(translate("en", "does.not.exist")).toBe("does.not.exist");
  });
});

describe("detectLocale", () => {
  it("matches a supported language tag", () => {
    expect(detectLocale(["en-US"])).toBe("en");
    expect(detectLocale(["de-DE"])).toBe("de");
  });

  it("respects preference order", () => {
    expect(detectLocale(["fr-FR", "en", "de"])).toBe("en");
  });

  it("falls back to the default when nothing is supported", () => {
    expect(detectLocale(["fr-FR", "es"])).toBe("de");
    expect(detectLocale([])).toBe("de");
  });

  it("matchLocale strips the region and rejects the unknown", () => {
    expect(matchLocale("EN-gb")).toBe("en");
    expect(matchLocale("zz")).toBeNull();
    expect(matchLocale(undefined)).toBeNull();
  });
});
