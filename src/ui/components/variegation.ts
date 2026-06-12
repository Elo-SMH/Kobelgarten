import type { Genome, VariegationType } from "../../engine/schemas";
import { t, type MessageKey } from "../../i18n";

export const VARIEG_KEYS: Record<VariegationType, MessageKey> = {
  none: "varieg.none",
  marginata: "varieg.marginata",
  sectoral: "varieg.sectoral",
  splash: "varieg.splash",
  halfmoon: "varieg.halfmoon",
  albo: "varieg.albo",
};

/** Kurzlabel wie "Albo · 23 % hell" für Badges und Listen. */
export function variegationLabel(variegation: Genome["variegation"]): string {
  if (variegation.type === "none") return t("varieg.none");
  const coverage = t("varieg.coverageLabel", {
    percent: Math.round(variegation.coverage * 100),
  });
  return `${t(VARIEG_KEYS[variegation.type])} · ${coverage}`;
}
