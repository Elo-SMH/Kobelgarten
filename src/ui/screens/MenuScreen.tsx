import { useRef, useState } from "react";
import { CONFIG } from "../../content/config";
import { squirrelById } from "../../content/squirrels";
import { levelForXp } from "../../engine/skills";
import { dateKey } from "../../engine/economy";
import { SUPPORTED_LOCALES, t, type Locale, type MessageKey } from "../../i18n";
import { SAVE_VERSION } from "../../state/migrations";
import { useSettingsStore } from "../../state/settings";
import { clearSlot, getActiveSlot, readSlot, SLOT_COUNT } from "../../state/slots";
import { useGameStore } from "../../state/store";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { SquirrelSprite } from "../components/SquirrelSprite";
import { playSound } from "../sound";

interface MenuScreenProps {
  /** Zurück ins Spiel nach einem Slot-Wechsel. */
  onClose: () => void;
}

/** Ein/Aus-Schalter im Cozy-Stil. */
function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-4 rounded-2xl border border-cream-300 bg-cream-50 px-4 py-3">
      <span className="text-sm font-medium text-hazel-700">{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => {
          playSound("click");
          onChange(!checked);
        }}
        className={`relative h-6 w-11 rounded-full transition ${
          checked ? "bg-leaf-500" : "bg-cream-300"
        }`}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${
            checked ? "left-[1.375rem]" : "left-0.5"
          }`}
        />
      </button>
    </label>
  );
}

const LANG_LABEL_KEYS: Record<Locale, MessageKey> = {
  de: "menu.langDe",
  en: "menu.langEn",
};

/** Segmentierter Sprachumschalter im Cozy-Stil. */
function LanguageSelect({
  value,
  onChange,
}: {
  value: Locale;
  onChange: (language: Locale) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl border border-cream-300 bg-cream-50 px-4 py-3">
      <span className="text-sm font-medium text-hazel-700">
        {t("menu.language")}
      </span>
      <div className="flex gap-1 rounded-full bg-cream-200 p-1">
        {SUPPORTED_LOCALES.map((locale) => (
          <button
            key={locale}
            type="button"
            aria-pressed={value === locale}
            onClick={() => {
              playSound("click");
              onChange(locale);
            }}
            className={`rounded-full px-3 py-1 text-xs font-medium transition ${
              value === locale
                ? "bg-leaf-500 text-white"
                : "text-hazel-700 hover:bg-cream-300"
            }`}
          >
            {t(LANG_LABEL_KEYS[locale])}
          </button>
        ))}
      </div>
    </div>
  );
}

export function MenuScreen({ onClose }: MenuScreenProps) {
  const sound = useSettingsStore((state) => state.sound);
  const reducedMotion = useSettingsStore((state) => state.reducedMotion);
  const language = useSettingsStore((state) => state.language);
  const setSound = useSettingsStore((state) => state.setSound);
  const setReducedMotion = useSettingsStore((state) => state.setReducedMotion);
  const setLanguage = useSettingsStore((state) => state.setLanguage);

  // Auf Änderungen des aktiven Slots reagieren, damit dessen Karte live bleibt.
  useGameStore((state) => state.hazelnuts);
  const switchToSlot = useGameStore((state) => state.switchToSlot);
  const resetGame = useGameStore((state) => state.resetGame);
  const importSave = useGameStore((state) => state.importSave);
  const getSave = useGameStore((state) => state.getSave);
  const squirrelId = useGameStore((state) => state.squirrelId);

  // setRefresh erzwingt nach Wechsel/Löschen/Import ein erneutes Lesen der Slots.
  const [, setRefresh] = useState(0);
  const [importMsg, setImportMsg] = useState<"ok" | "error" | null>(null);
  const [pendingDelete, setPendingDelete] = useState<number | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const activeSlot = getActiveSlot();

  const exportSave = () => {
    playSound("click");
    const envelope = {
      app: "kobelgarten" as const,
      version: SAVE_VERSION,
      exportedAt: new Date().toISOString(),
      save: getSave(),
    };
    const blob = new Blob([JSON.stringify(envelope, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `kobelgarten-slot${activeSlot + 1}-${dateKey(new Date())}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const onImportFile = async (file: File) => {
    const text = await file.text();
    const result = importSave(text);
    setImportMsg(result.ok ? "ok" : "error");
    setRefresh((value) => value + 1);
    if (fileInput.current) fileInput.current.value = "";
  };

  const confirmDelete = () => {
    if (pendingDelete === null) return;
    const slot = pendingDelete;
    clearSlot(slot);
    if (slot === activeSlot) resetGame();
    setPendingDelete(null);
    setRefresh((value) => value + 1);
  };

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-8 px-4 py-8">
      <h1 className="text-center text-3xl font-bold text-leaf-900">
        ⚙️ {t("menu.heading")}
      </h1>

      {squirrelId && squirrelById[squirrelId] && (
        <section className="flex items-center gap-4 rounded-2xl border border-cream-300 bg-cream-50 p-4 shadow-sm">
          <SquirrelSprite squirrel={squirrelById[squirrelId]} size={56} />
          <div>
            <p className="text-xs uppercase tracking-wide text-hazel-500">
              {t("menu.squirrelLabel")}
            </p>
            <p className="text-lg font-semibold text-leaf-900">
              {squirrelById[squirrelId].name}
            </p>
            <p className="text-xs text-hazel-500">
              {t(`squirrel.${squirrelId}.bonus` as MessageKey)}
            </p>
          </div>
        </section>
      )}

      <section className="flex flex-col gap-3">
        <h2 className="text-xl font-semibold text-leaf-900">
          {t("menu.settingsHeading")}
        </h2>
        <LanguageSelect value={language} onChange={setLanguage} />
        <Toggle label={t("menu.sound")} checked={sound} onChange={setSound} />
        <Toggle
          label={t("menu.reducedMotion")}
          checked={reducedMotion}
          onChange={setReducedMotion}
        />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-xl font-semibold text-leaf-900">
          {t("menu.slotsHeading")}
        </h2>
        {Array.from({ length: SLOT_COUNT }, (_, slot) => {
          const save = readSlot(slot);
          const isActive = slot === activeSlot;
          const squirrel = save?.squirrelId
            ? squirrelById[save.squirrelId]
            : undefined;
          return (
            <div
              key={slot}
              className={`flex items-center justify-between gap-3 rounded-2xl border p-4 shadow-sm ${
                isActive
                  ? "border-leaf-500 bg-leaf-100"
                  : "border-cream-300 bg-cream-50"
              }`}
            >
              <div className="flex items-center gap-3">
                {squirrel ? (
                  <SquirrelSprite squirrel={squirrel} size={40} />
                ) : (
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-cream-200 text-lg">
                    🌱
                  </span>
                )}
                <div>
                  <p className="text-sm font-semibold text-hazel-700">
                    {t("menu.slotLabel", { n: slot + 1 })}
                    {isActive && (
                      <span className="ml-2 rounded-full bg-leaf-500 px-2 py-0.5 text-xs text-white">
                        {t("menu.slotActive")}
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-hazel-500">
                    {save
                      ? t("menu.slotSummary", {
                          hazelnuts: save.hazelnuts,
                          level: levelForXp(save.xp, CONFIG.progression.xpCurve),
                          plants: Object.keys(save.plants).length,
                        })
                      : t("menu.slotEmpty")}
                  </p>
                </div>
              </div>
              <div className="flex shrink-0 gap-2">
                {!isActive && (
                  <button
                    onClick={() => {
                      playSound("click");
                      switchToSlot(slot);
                      onClose();
                    }}
                    className="rounded-full bg-hazel-500 px-3 py-1.5 text-xs font-medium text-cream-50 transition hover:bg-hazel-700"
                  >
                    {t("menu.play")}
                  </button>
                )}
                {save && (
                  <button
                    onClick={() => {
                      playSound("click");
                      setPendingDelete(slot);
                    }}
                    className="rounded-full bg-cream-200 px-3 py-1.5 text-xs font-medium text-hazel-700 transition hover:bg-cream-300"
                  >
                    {t("menu.deleteAction")}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-xl font-semibold text-leaf-900">
          {t("menu.backupHeading")}
        </h2>
        <p className="text-sm text-hazel-500">{t("menu.backupHint")}</p>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={exportSave}
            className="rounded-full bg-leaf-500 px-5 py-2 text-sm font-medium text-white transition hover:bg-leaf-700"
          >
            💾 {t("menu.exportAction")}
          </button>
          <button
            onClick={() => {
              playSound("click");
              fileInput.current?.click();
            }}
            className="rounded-full bg-hazel-500 px-5 py-2 text-sm font-medium text-cream-50 transition hover:bg-hazel-700"
          >
            📥 {t("menu.importAction")}
          </button>
          <input
            ref={fileInput}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void onImportFile(file);
            }}
          />
        </div>
        {importMsg && (
          <p
            className={`text-sm ${
              importMsg === "ok" ? "text-leaf-700" : "text-red-600"
            }`}
          >
            {t(importMsg === "ok" ? "menu.importOk" : "menu.importError")}
          </p>
        )}
      </section>

      {pendingDelete !== null && (
        <ConfirmDialog
          heading={t("menu.deleteConfirmHeading")}
          body={t("menu.deleteConfirmBody", { n: pendingDelete + 1 })}
          confirmLabel={t("menu.deleteConfirmYes")}
          cancelLabel={t("menu.deleteConfirmNo")}
          onConfirm={confirmDelete}
          onCancel={() => setPendingDelete(null)}
        />
      )}
    </main>
  );
}
