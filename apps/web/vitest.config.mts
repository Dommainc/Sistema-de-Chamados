import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { "@": import.meta.dirname },
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    include: ["**/*.test.{ts,tsx}"],
    exclude: ["node_modules", ".next"],
    // O 1º teste de cada arquivo de tela carrega jsdom + componentes e, com a suíte inteira em
    // paralelo, passa dos 5 s padrão. 15 s dá folga sem esconder teste travado.
    testTimeout: 15_000,
  },
});
