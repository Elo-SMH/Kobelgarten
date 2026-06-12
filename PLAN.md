# 🌿 KOBELGARTEN — Vollständiger Projektplan

*Ein gemütliches Zimmerpflanzen-Zucht-Spiel mit Eichhörnchen. Browser-Spiel, kein Backend, 0 € Betriebskosten.*

---

## 1. Spielkonzept

**Elevator Pitch:** Du bist ein Eichhörnchen mit grünem Pfötchen. In deinem Kobel ziehst, pflegst, kreuzt und vermehrst du Zimmerpflanzen. Seltene Variegationen (Panaschierungen) entstehen zufällig und sind das Sammler-Gold des Spiels. Verkaufe Pflanzen für Haselnüsse, kaufe besseres Equipment, schalte Talente frei.

**Kernschleife (Core Loop):**
1. Samen/Steckling im Shop kaufen → eintopfen
2. Pflegen (Gießen, Licht, Dünger) → Pflanze wächst in Echtzeit (auch offline)
3. Vermehren: Steckling schneiden (Klon + Mutationschance) oder zwei Pflanzen kreuzen (Gen-Mix)
4. Glück: zufällige Variegation → Wert vervielfacht sich
5. Verkaufen → Haselnüsse → Talente, Töpfe, Regale, neue Arten

**Was es NICHT gibt:** Echtgeld-Käufe, Werbung, Server, Accounts. Alles lokal.

---

## 2. Spielsysteme (Design im Detail)

### 2.1 Genetik & Pflanzen-Instanzen
Jede Pflanze ist eine Instanz mit einem **Genom**:

```
Genome {
  speciesId        // z.B. "monstera-deliciosa"
  growthRate       // 0.5–1.5 (Wachstumstempo)
  size             // 0.7–1.3 (Endgröße/Blattgröße)
  hueShift         // -20..+20 (Farbton-Verschiebung der Blätter)
  hardiness        // 0.5–1.5 (Verzeiht Pflegefehler)
  variegation: {
    type           // none | marginata | sectoral | splash | halfmoon | albo
    coverage       // 0–0.6 (Anteil heller Fläche)
    stability      // 0–1 (Reversions-Risiko pro Vermehrung)
  }
}
```

**Vermehrung:**
- **Steckling:** Klon des Genoms, jedes Gen hat kleine Drift-Chance (±5 %). Variegation kann *revertieren* (stability-abhängig) oder sich *verstärken*.
- **Kreuzung:** Zwei adulte Pflanzen kompatibler Arten → 1–3 Samen. Pro Gen: 50/50 von Elternteil A/B, plus Mutationschance.

### 2.2 Variegations-System (Zufall, der Herzstück-Mechanik)
Bei JEDER Vermehrung würfelt das Spiel:

| Ereignis | Basischance | Effekt |
|---|---|---|
| Spontane Variegation | 2 % | none → zufälliger Typ, coverage 0.05–0.15 |
| Verstärkung | 10 % (wenn variegiert) | coverage +0.05–0.15 |
| Typ-Sprung | 3 % | z.B. splash → halfmoon |
| Reversion | (1 − stability) × 25 % | zurück zu none |

- Chancen werden durch Talente, Dünger-Items und Arten-Eigenschaft `mutability` modifiziert.
- **Wertformel:** `basePrice × größe × (1 + coverage × typMultiplikator × 8)` — Albo/Halfmoon = Jackpot.
- Wichtig fürs Spielgefühl: Variegation ist sichtbar! Blätter werden prozedural als SVG aus dem Genom gerendert (Seed-basiert, deterministisch pro Pflanzen-ID).

### 2.3 Pflege & Zeit
- **Tick-System:** 1 Tick = 1 reale Minute. Beim App-Start werden verpasste Ticks aus Zeitstempel-Differenz nachsimuliert (Offline-Fortschritt, gedeckelt auf 48 h).
- **Bedürfnisse pro Pflanze:** Wasser (sinkt stetig), Licht (Platzierung am Regal: Fensterplatz vs. Schatten), Dünger (Buff). Vernachlässigung → Wachstumsstopp → Welken → (mit hardiness-Puffer) Tod.
- **Wachstumsphasen:** Samen → Sämling → Jungpflanze → Adult (kreuzbar) → Prachtexemplar (Preisbonus).
- **Zufallsereignisse:** Trauermücken-Befall (Item: Gelbtafeln), Sonnenbrand, "Sammler-Eichhörnchen klopft an" (zahlt 2× für bestimmte Variegation = Quasi-Quest).

### 2.4 Talent-System (3 Bäume, Skillpunkte durch Level)
XP gibt's für Verkäufe, erste Züchtungen, Quests. Pro Level 1 Skillpunkt.

- 🌱 **Gärtner:** schnelleres Wachstum, größerer Gießkannen-Tank, Auto-Gießen (Tier 3), Welke-Schutz
- 🧬 **Züchter:** +Mutationschance, +Stabilität, Kreuzung gibt +1 Samen, "Geschultes Auge" (zeigt Genwerte an)
- 🛒 **Händler:** +Verkaufspreise, Shop-Rabatte, täglicher Sonderkunde, Regal-Slots billiger

Je Baum 6–8 Talente, Tiers schalten sich per investierter Punkte frei. Respec gegen Haselnüsse.

### 2.5 Shop (Haselnuss-Ökonomie)
Ein zentraler Shop-Screen mit Tabs:
- **Kaufen:** Samen (Basis-Genom der Art), Stecklinge (selten mit Mini-Variegation), Töpfe (Größen = Wachstumslimit), Dünger, Gießkannen-Upgrades, Gelbtafeln, Regale/Slots, Deko (kosmetisch).
- **Verkaufen:** Jede Pflanze per Klick verkaufbar, Preis live aus Wertformel. Bestätigung bei Pflanzen > 500 🌰 (Fehlklick-Schutz).
- Tagesrotation: 1 "Angebot des Tages" (Seed-basiert aus Datum, kein Server nötig).
- Startkapital: 50 🌰, Pothos-Samen kostet 10 🌰 → sanfter Einstieg.

### 2.6 Charaktere
Spieler wählt 1 von 3 Eichhörnchen (rein kosmetisch + 1 Mini-Startbonus):
- **Hasel** (rot): +5 % Verkaufspreis
- **Fips** (grau): +5 % Wachstum
- **Nuka** (schwarz): +1 % Mutationschance
Eichhörnchen-Sprite kommentiert Ereignisse mit Sprechblasen (Flavor, Tutorial-Vermittlung).

### 2.7 Weitere Inhalte für v1 (selbst entschieden)
- **Pflanzenlexikon (Kodex):** Sammelalbum aller entdeckten Art × Variegations-Kombis → Komplettierungs-Belohnungen. Das ist das Langzeitziel.
- **Tutorial:** geskriptete erste 10 Minuten (Hasel erklärt: kaufen → gießen → wachsen → verkaufen → Steckling).
- **Speichersystem:** Autosave in localStorage (alle 30 s + bei Aktionen), Export/Import als JSON-Datei (Backup & Gerätewechsel — ersetzt Cloud-Save kostenlos), 3 Save-Slots.
- **Einstellungen:** Sound an/aus, Sprache DE (EN-ready via i18n-Keys), Reduzierte Animationen.
- **Audio:** dezente Lo-Fi-Loop + UI-Sounds (kostenlos: Kenney.nl / freesound CC0).

### 2.8 Start-Pflanzenarten (8 Stück, v1)
| Art | Preis | Wachstum | mutability | Besonderheit |
|---|---|---|---|---|
| Efeutute (Pothos) | 10 | schnell | mittel | Einsteiger |
| Grünlilie | 15 | schnell | niedrig | macht Kindel (Gratis-Stecklinge) |
| Syngonium | 25 | mittel | hoch | Variegations-Farm |
| Philodendron | 40 | mittel | mittel | kreuzbar mit Monstera-Gruppe |
| Monstera | 80 | langsam | mittel | Albo = Endgame-Jackpot |
| Calathea | 60 | mittel | niedrig | pflegeintensiv, hoher Basiswert |
| Alocasia | 120 | langsam | hoch | riskant: niedrige hardiness |
| Hoya | 100 | sehr langsam | mittel | Blüte = einmaliger Bonus-Verkaufswert |

---

## 3. Technik-Entscheidungen

| Bereich | Entscheidung | Begründung |
|---|---|---|
| Sprache | TypeScript (strict) | Genom/Item-Daten brauchen Typsicherheit |
| Framework | React 18 + Vite | UI-getriebenes Spiel, kein Game-Engine-Overhead |
| State | Zustand (+ persist-Middleware) | simpel, localStorage-Persistenz eingebaut |
| Rendering | DOM/CSS + prozedurale SVG-Pflanzen | leicht, skaliert, kein Canvas nötig |
| Styling | Tailwind CSS | schnelle, konsistente Cozy-UI |
| Validierung | zod | Content-Dateien & Save-Import absichern |
| Tests | Vitest | Genetik/Ökonomie sind pure Funktionen → perfekt testbar |
| Zeit | Tick-Engine, `requestAnimationFrame`-unabhängig | Offline-Progress via Timestamp |
| Backend | **keins** | 0 € Kosten, kein Datenschutz-Aufwand |
| Deploy | GitHub Pages (Actions) — Alternative: Cloudflare Pages | beides dauerhaft kostenlos |

### Architektur: strikte Trennung von Logik und UI
```
src/
  engine/          # PURE Spiellogik, kein React-Import!
    genetics.ts    # Genome, mutate(), cross(), Variegations-Würfel
    growth.ts      # Tick-Simulation, Bedürfnisse, Phasen
    economy.ts     # Wertformel, Shop-Preise, Tagesangebot
    skills.ts      # Talentbaum-Effekte als Modifikator-Pipeline
    events.ts      # Zufallsereignisse, Sammler-Quests
    rng.ts         # Seeded RNG (mulberry32) → testbar & deterministisch
  content/         # DATEN, kein Code-Verhalten (→ Erweiterbarkeit!)
    plants/        # eine Datei pro Art, zod-validiert
    items.ts  skills.ts  events.ts  squirrels.ts
  state/           # Zustand-Stores (game, settings), Save/Load, Migrationen
  ui/              # React-Komponenten
    screens/       # Kobel(Regal), Shop, Talente, Lexikon, Zuchtstation
    components/    # PlantCard, PlantSVG, Tooltip, Sprechblase...
  i18n/de.json
```

**Erweiterbarkeits-Regel:** Eine neue Pflanzenart = 1 neue Datei in `content/plants/` + Registrierung im Index. Null Änderungen an Engine oder UI. Das zod-Schema erzwingt Vollständigkeit; ein Vitest-Contract-Test validiert automatisch alle Content-Dateien.

```ts
// content/plants/monstera.ts (Beispiel-Shape)
export const monstera: PlantSpecies = {
  id: "monstera-deliciosa", name: "Monstera",
  basePrice: 80, growthTicks: 2400, mutability: 0.02,
  waterDrainPerTick: 0.0008, lightNeed: "bright-indirect",
  crossGroup: "araceae",           // bestimmt Kreuz-Kompatibilität
  allowedVariegations: ["sectoral", "splash", "halfmoon", "albo"],
  leafShape: "fenestrated",        // Key für den SVG-Renderer
  palette: { base: "#2d6a4f", varieg: "#f1faee" },
};
```

---

## 4. Roadmap (6 Meilensteine für Claude Code)

Jeder Meilenstein endet lauffähig und getestet. Detaillierte Prompts: siehe `PROMPTS.md`.

- **M1 – Fundament:** Vite/React/TS/Tailwind-Setup, Engine-Skelett, seeded RNG, Tick-Loop, Zustand-Store mit Persistenz, leerer Kobel-Screen. ✅ *"App läuft, Zeit vergeht, Save überlebt Reload."*
- **M2 – Pflanzen & Pflege:** Genom-Typen, 3 Arten, SVG-Renderer, Wachstumsphasen, Gießen/Licht/Welken, Offline-Progress. ✅ *"Pothos wächst von Samen zu Adult und verwelkt bei Vernachlässigung."*
- **M3 – Ökonomie:** Shop (Kaufen/Verkaufen), Wertformel, Inventar, Töpfe/Regal-Slots, Startgeld, Tagesangebot. ✅ *"Kompletter Geldkreislauf spielbar."*
- **M4 – Genetik:** Steckling, Kreuzung, komplettes Variegations-Würfelsystem, sichtbare Variegation im SVG, restliche 5 Arten. ✅ *"Erste Albo-Monstera ist züchtbar (und sieht geil aus)."*
- **M5 – Progression:** XP/Level, 3 Talentbäume, Zufallsereignisse, Sammler-Quests, Pflanzenlexikon. ✅ *"Es gibt Ziele über Geld hinaus."*
- **M6 – Polish & Release:** Tutorial, Eichhörnchen-Auswahl + Sprechblasen, Sound, Settings, Export/Import, Balancing-Pass, GitHub-Pages-Deploy. ✅ *"Öffentliche URL, von Fremden spielbar."*

Geschätzter Umfang: mit Claude Code ca. 6 fokussierte Sessions (1 pro Meilenstein).

---

## 5. Deployment (0 € dauerhaft)

**Empfehlung: GitHub Pages via Actions** (Workflow-Datei liegt bei: `deploy.yml`).
1. GitHub-Repo erstellen (public), Code pushen
2. Repo → Settings → Pages → Source: *GitHub Actions*
3. Jeder Push auf `main` baut & deployt automatisch → `https://<user>.github.io/kobelgarten/`
4. In `vite.config.ts`: `base: "/kobelgarten/"` setzen (im Plan bereits vorgesehen)

Alternative (ebenfalls 0 €): Cloudflare Pages — Repo verbinden, Build-Command `npm run build`, Output `dist`. Vorteil: eigene Domain + schnelleres CDN, falls später gewünscht.

**Kostenbilanz:** Hosting 0 €, kein Backend, keine Datenbank, keine APIs zur Laufzeit. Einzige optionale Kosten: eigene Domain (~10 €/Jahr).

---

## 6. Risiken & Gegenmaßnahmen
- **Balancing kippt (Inflation):** Ökonomie-Konstanten zentral in `content/config.ts`; M6 enthält Simulations-Skript (1000 simulierte Spielstunden → Geldkurve).
- **Save-Brüche bei Updates:** Save enthält `version`; Migrationsfunktionen in `state/migrations.ts` von Tag 1 an.
- **Scope Creep:** Alles außerhalb M1–M6 (Multiplayer, Tauschbörse, Jahreszeiten) wandert in `BACKLOG.md`, nicht in v1.
