// Testes de ponta a ponta no navegador (modo simulado, ADR 0006).
// `pnpm e2e` roda os fluxos; `pnpm prints` gera os prints de docs/guia/img.

import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  timeout: 90_000,
  expect: { timeout: 15_000 },
  // O servidor de desenvolvimento compila as páginas na primeira visita: um teste por vez.
  workers: 1,
  // Na primeira visita o servidor de desenvolvimento compila a página e pode estourar o tempo: 1 nova tentativa.
  retries: 1,
  reporter: [["list"]],
  use: {
    baseURL: "http://localhost:3000",
    locale: "pt-BR",
    timezoneId: "America/Sao_Paulo",
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "computador",
      use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 800 } },
    },
    { name: "celular", use: { ...devices["Pixel 5"] } },
  ],
  webServer: {
    command: "pnpm dev",
    url: "http://localhost:3000/login",
    reuseExistingServer: true,
    timeout: 180_000,
  },
});
