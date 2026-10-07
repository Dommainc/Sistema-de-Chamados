// Verificações na tela de celular (mockup: portal pensado para obra; técnico no celular, telas 8 e 9).

import { expect, test } from "@playwright/test";
import { entrar } from "./ajuda";

test.beforeEach(({}, info) => {
  test.skip(info.project.name !== "celular", "Só na tela de celular.");
});

test("portal no celular: menu inferior com contador e chat do chamado", async ({ page }) => {
  await entrar(page, "Ana Souza");
  const menu = page.getByRole("navigation", { name: "Menu principal" });
  await expect(menu.getByRole("link", { name: /Meus chamados/ })).toBeVisible();
  await menu.getByRole("link", { name: /Meus chamados/ }).click();
  await expect(page.getByText("Nova mensagem")).toBeVisible();
  await page.getByRole("link", { name: /Outlook não sincroniza/ }).click();
  // O painel do computador também tem este aviso (escondido no celular).
  await expect(
    page.getByText("Rafael está esperando sua resposta.").filter({ visible: true }),
  ).toBeVisible();
  await expect(page.getByRole("textbox", { name: "Mensagem" })).toBeVisible();
});

test("técnico no celular: colunas viram botões e o atendimento tem abas", async ({ page }) => {
  await entrar(page, "Rafael Lima");
  await page.getByRole("tab", { name: /Em atendimento/ }).click();
  await expect(page.getByText("Instalar AutoCAD no notebook")).toBeVisible();
  await page.getByText("Instalar AutoCAD no notebook").click();
  await expect(page).toHaveURL(/\/atendimento\/38$/);
  await page.getByRole("tab", { name: "Histórico" }).click();
  await expect(page.getByText("Iniciado por Rafael Lima")).toBeVisible();
});
