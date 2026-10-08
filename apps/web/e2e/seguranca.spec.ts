// Proteções do site (next.config.ts): cabeçalhos de segurança e nenhuma tela bloqueada pela CSP.

import { expect, test } from "@playwright/test";
import { entrar, trocarPara } from "./ajuda";

test.beforeEach(({}, info) => {
  test.skip(info.project.name !== "computador", "Cabeçalhos são iguais em qualquer tela.");
});

test("páginas saem com os cabeçalhos de segurança", async ({ page }) => {
  const resposta = await page.goto("/login");
  const cabecalhos = resposta?.headers() ?? {};
  expect(cabecalhos["content-security-policy"]).toContain("frame-ancestors 'none'");
  expect(cabecalhos["content-security-policy"]).toContain("object-src 'none'");
  expect(cabecalhos["x-frame-options"]).toBe("DENY");
  expect(cabecalhos["x-content-type-options"]).toBe("nosniff");
  expect(cabecalhos["x-powered-by"]).toBeUndefined();
});

test("nenhuma tela é bloqueada pela política de conteúdo (CSP)", async ({ page, context }) => {
  const bloqueios: string[] = [];
  page.on("console", (msg) => {
    if (/Content Security Policy|Refused to/i.test(msg.text())) bloqueios.push(msg.text());
  });

  await entrar(page, "Ana Souza");
  await page.goto("/abrir/3");
  await expect(page.getByText("Qual programa?")).toBeVisible();
  await page.goto("/meus-chamados/41");
  await expect(page.getByText(/Consegue abrir o Outlook/)).toBeVisible();
  await trocarPara(context, page, "Rafael Lima");
  await expect(page.getByRole("region", { name: /^Novos:/ })).toBeVisible();
  await page.goto("/atendimento/41");
  await expect(page.getByRole("region", { name: "Ações" })).toBeVisible();

  expect(bloqueios).toEqual([]);
});
