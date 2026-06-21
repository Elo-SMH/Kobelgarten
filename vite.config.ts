import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  // Relative Asset-Pfade: funktioniert unter jedem Pages-Unterpfad,
  // unabhängig von der Groß-/Kleinschreibung des Repo-Namens
  // (z.B. /Kobelgarten/ vs. /kobelgarten/).
  base: "./",
  plugins: [react()],
  test: {
    include: ["src/**/*.test.ts"],
  },
});
