import { useSettingsStore } from "../state/settings";

/**
 * Dezente UI-Sounds ohne Asset-Dateien: kurze, synthetisch erzeugte Töne über
 * die Web Audio API (0 € Hosting, kein Download). Respektiert die
 * Sound-Einstellung; ist sie aus, passiert nichts. Liegt in der UI-Schicht,
 * nie in der Engine.
 */
type SoundName = "click" | "buy" | "plant" | "water" | "sell" | "levelup";

/** Frequenz (Hz) und Dauer (s) je Sound — bewusst leise und kurz gehalten. */
const TONES: Record<SoundName, { freq: number; durationMs: number }> = {
  click: { freq: 440, durationMs: 60 },
  buy: { freq: 660, durationMs: 90 },
  plant: { freq: 523, durationMs: 110 },
  water: { freq: 740, durationMs: 80 },
  sell: { freq: 880, durationMs: 120 },
  levelup: { freq: 988, durationMs: 200 },
};

let context: AudioContext | null = null;

function audioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const Ctor =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext;
  if (!Ctor) return null;
  context ??= new Ctor();
  return context;
}

export function playSound(name: SoundName): void {
  if (!useSettingsStore.getState().sound) return;
  const ctx = audioContext();
  if (!ctx) return;
  // Browser sperren Audio bis zur ersten Geste; nach einem Klick ist der
  // Context „running“, ein resume() schadet vorher aber nicht.
  if (ctx.state === "suspended") void ctx.resume();
  const { freq, durationMs } = TONES[name];
  const oscillator = ctx.createOscillator();
  const gain = ctx.createGain();
  oscillator.type = "sine";
  oscillator.frequency.value = freq;
  const now = ctx.currentTime;
  const seconds = durationMs / 1000;
  // Sanfte Hüllkurve, damit kein Knacken entsteht.
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(0.12, now + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + seconds);
  oscillator.connect(gain).connect(ctx.destination);
  oscillator.start(now);
  oscillator.stop(now + seconds);
}
