# 🌿 Kobelgarten

> Ein gemütliches Browser-Spiel, in dem Eichhörnchen Zimmerpflanzen züchten, pflegen und kreuzen. Seltene **Variegationen** (Panaschierungen) entstehen zufällig und sind das Sammler-Gold des Spiels.

Kein Backend, keine Accounts, keine Echtgeld-Käufe, keine Werbung – alles läuft lokal im Browser und wird kostenlos über GitHub Pages ausgeliefert. Die Oberfläche ist auf Deutsch (über i18n-Keys EN-ready).

🔗 **Spielen:** `https://<dein-github-name>.github.io/kobelgarten/`

---

## 📸 Screenshots

> _Platzhalter – echte Screenshots unter `docs/screenshots/` ablegen und hier verlinken._

| Eichhörnchen-Auswahl | Der Kobel (Regal) | Zuchtstation |
|---|---|---|
| ![Charakterwahl](docs/screenshots/character-select.png) | ![Kobel](docs/screenshots/kobel.png) | ![Zucht](docs/screenshots/zucht.png) |

| Shop | Talentbäume | Pflanzenlexikon |
|---|---|---|
| ![Shop](docs/screenshots/shop.png) | ![Talente](docs/screenshots/talente.png) | ![Lexikon](docs/screenshots/lexikon.png) |

---

## 🎮 Spielanleitung

Du bist ein Eichhörnchen mit grünem Pfötchen. In deinem Kobel ziehst du Pflanzen groß, vermehrst sie und jagst seltene Muster.

### Erster Start
1. **Wähle dein Eichhörnchen** – Hasel, Fips oder Nuka. Jedes ist rein kosmetisch und bringt einen kleinen Startbonus mit (siehe unten). Anschließend führt dich ein kurzes Tutorial durch die Kernschleife.

### Die Kernschleife
1. **Kaufen** 🛒 – Im Shop einen Samen (z. B. Efeutute für 10 🌰) und einen Topf besorgen. Die Topfgröße bestimmt das Wachstumslimit: klein → Jungpflanze, mittel → Ausgewachsen, groß → Prachtexemplar.
2. **Einpflanzen** 🪴 – Im Kobel auf einen freien Regalplatz setzen. **Fensterplatz** vs. **Schattenplatz** beeinflusst je nach Lichtbedarf der Art das Wachstum.
3. **Pflegen** 💧 – Pflanzen brauchen Wasser. Trocknet eine Pflanze aus, stoppt das Wachstum, sie welkt und stirbt irgendwann (die `hardiness` puffert das). Dünger gibt einen zeitlich begrenzten Wachstums-Buff.
4. **Wachsen lassen** ⏳ – 1 Tick = 1 reale Minute. Die Zeit läuft auch weiter, während du weg bist – beim nächsten Start werden verpasste Ticks nachsimuliert (**Offline-Fortschritt**, gedeckelt auf 48 h). Phasen: Samen → Sämling → Jungpflanze → Ausgewachsen → Prachtexemplar.
5. **Verkaufen** 🌰 – Im Shop-Tab _Verkaufen_ jede Pflanze zum Live-Wert verkaufen. Bei Verkäufen über 500 🌰 wird zur Sicherheit nachgefragt.
6. **Vermehren** 🧬 – In der **Zuchtstation**:
   - **Steckling schneiden** (ab Jungpflanze): klont das Genom mit kleiner Drift – und würfelt die Variegations-Tabelle.
   - **Kreuzen** (zwei ausgewachsene Pflanzen kompatibler Arten): ergibt 1–3 Samen mit gemischten Genen.

### Variegationen – das Herzstück
Bei **jeder** Vermehrung würfelt das Spiel: spontane Variegation, Verstärkung, Typ-Sprung oder Reversion. Seltene Typen (Halfmoon, **Albo**) vervielfachen den Wert. Variegation ist **sichtbar** – die Blätter werden prozedural als SVG aus dem Genom gerendert.

Wertformel: `basePrice × Größe × (1 + coverage × Typ-Multiplikator × 8)`.

### Fortschritt über Geld hinaus
- **XP & Level** für Verkäufe, Erstzüchtungen und Quests. Pro Level 1 Skillpunkt.
- **3 Talentbäume** – 🌱 Gärtner, 🧬 Züchter, 🛒 Händler. Tiers schalten sich per investierter Punkte frei; **Respec** gegen Haselnüsse möglich.
- **Zufallsereignisse** – Trauermücken (mit Gelbtafeln bekämpfen), Sonnenbrand und das **Sammler-Eichhörnchen**, das 2× für eine gewünschte Variegation zahlt (Quasi-Quest).
- **Pflanzenlexikon** – Sammelalbum aller entdeckten Art × Variegations-Kombis mit Komplettierungs-Belohnungen. Das Langzeitziel.

### Die Eichhörnchen (Startbonus)
| Charakter | Fell | Bonus |
|---|---|---|
| **Hasel** | rot | +5 % Verkaufspreis |
| **Fips** | grau | +5 % Wachstum |
| **Nuka** | schwarz | +10 % Variegations-Chancen |

### Einstellungen & Speichern (⚙️ Menü)
- **Einstellungen:** Sound an/aus, reduzierte Animationen.
- **3 Save-Slots** – wechsle zwischen drei getrennten Gärten.
- **Export / Import** – sichere deinen Spielstand als JSON-Datei (Backup oder Gerätewechsel) und importiere ihn wieder. Der Import wird per zod-Schema validiert; fremde oder beschädigte Dateien werden abgewiesen.
- **Autosave** läuft permanent in `localStorage` (pro Slot, versioniert mit Migrationen – Updates brechen alte Saves nicht).

---

## 🛠️ Entwicklung

```bash
npm install
npm run dev      # Vite-Dev-Server
npm run build    # Produktions-Build (tsc --noEmit && vite build)
npm run test     # Vitest (Engine & Content sind reine, testbare Funktionen)
npm run lint     # ESLint + tsc --noEmit
npm run sim      # Headless-Ökonomie-Simulation (Balance-Check)
```

### Balance-Check
`npm run sim` spielt mit seeded RNG hunderte simulierte Spielstunden ausschließlich über Engine-Funktionen durch und berichtet Geldkurve, Zeit bis zur ersten Variegation, Leistbarkeit jeder Art und Einkommen pro Stunde. Parameter optional: `npm run sim -- <Stunden> <Seeds>`. Genutzt, um die Konstanten in [`src/content/config.ts`](src/content/config.ts) zu justieren (M6-Balance-Pass).

---

## 🏗️ Architektur

Strikte Trennung von Logik und UI – das ist die zentrale Projektregel:

```
src/
  engine/     # PURE TypeScript: Genetik, Wachstum, Ökonomie, Talente, Ereignisse, Tutorial.
              # Kein React, kein DOM, kein Date.now()/Math.random() – Zeit & RNG werden übergeben.
  content/    # DATEN, kein Verhalten: Pflanzen, Items, Talente, Eichhörnchen, Tutorial – per zod validiert.
  state/      # Zustand-Stores, Save/Load, Migrationen, Save-Slots, Settings.
  ui/         # React-Komponenten (Screens & Components) + Sound.
  i18n/       # de.json (key-basiert).
```

- **Seeded RNG** (mulberry32) – das gesamte Spiel ist deterministisch und unit-testbar. Das Tagesangebot leitet seinen Seed aus dem Kalenderdatum ab (kein Server nötig).
- **Erweiterbarkeit:** Eine neue Pflanzenart = eine neue Datei in `content/plants/` + ein Eintrag im Index. Ein Vitest-Contract-Test validiert automatisch alle Content-Dateien gegen die zod-Schemas.
- **Versionierte Saves:** Jede Änderung der Save-Form bumpt `SAVE_VERSION` und ergänzt eine Migration in `state/migrations.ts`.

**Tech-Stack:** TypeScript (strict) · React 18 + Vite · Zustand (persist) · Tailwind CSS · zod · Vitest. UI-Sounds werden synthetisch über die Web Audio API erzeugt (keine Asset-Dateien, 0 € Hosting).

---

## 🚀 Deployment (GitHub Pages, 0 €)

1. Public-Repo erstellen und Code pushen.
2. Repo → **Settings → Pages → Source: GitHub Actions**.
3. Jeder Push auf `main` baut & deployt automatisch über [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) → `https://<user>.github.io/kobelgarten/`.

`base: "/kobelgarten/"` ist in [`vite.config.ts`](vite.config.ts) gesetzt, damit die Asset-Pfade unter dem Pages-Unterpfad stimmen. Der Workflow läuft `npm ci`, `npm run lint`, `npm run test`, `npm run build` und veröffentlicht `dist/`.

---

## 💸 Kostenbilanz & Prinzipien

Hosting 0 €, kein Backend, keine Datenbank, keine Laufzeit-APIs, kein Tracking. Währung sind **Haselnüsse** (🌰) – es gibt **kein** Echtgeld-System. Optionale Audio-Assets stammen aus CC0-Quellen (z. B. Kenney.nl / freesound).
