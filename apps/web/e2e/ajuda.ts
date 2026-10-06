// Auxiliares dos testes E2E.

import { expect, type BrowserContext, type Page } from "@playwright/test";

export type Usuario = "Ana Souza" | "Bruno Teixeira" | "Rafael Lima" | "Thiago Martins";

/** Entra pela tela "Entrar como". Ana passa pelo primeiro acesso (ela começa sem departamento). */
export async function entrar(page: Page, usuario: Usuario): Promise<void> {
  await page.goto("/login");
  await page.getByRole("button", { name: new RegExp(usuario) }).click();
  if (usuario === "Ana Souza") {
    await expect(page).toHaveURL(/\/primeiro-acesso$/);
    await page.getByLabel(/Departamento/).fill("Engenharia");
    await page.getByRole("button", { name: "Continuar" }).click();
    await expect(page).toHaveURL(/\/$/);
  } else if (usuario === "Bruno Teixeira") {
    await expect(page).toHaveURL(/\/$/);
  } else {
    await expect(page).toHaveURL(/\/atendimento$/);
  }
}

/** Troca de usuário no mesmo navegador (o modo simulado guarda a sessão num cookie). */
export async function trocarPara(
  context: BrowserContext,
  page: Page,
  usuario: Usuario,
): Promise<void> {
  await context.clearCookies();
  await entrar(page, usuario);
}

/** Cola uma imagem com Ctrl+V no elemento (simula Win+Shift+S → Ctrl+V). */
export async function colarImagem(page: Page, seletor: string): Promise<void> {
  await page
    .locator(seletor)
    .first()
    .evaluate((alvo) => {
      // PNG 1x1 transparente
      const bytes = Uint8Array.from(
        atob(
          "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=",
        ),
        (c) => c.charCodeAt(0),
      );
      const dados = new DataTransfer();
      dados.items.add(new File([bytes], "image.png", { type: "image/png" }));
      alvo.dispatchEvent(new ClipboardEvent("paste", { clipboardData: dados, bubbles: true }));
    });
}

/** Preenche o formulário de "Internet, rede ou VPN" (categoria 2 nos exemplos). */
export async function preencherInternet(page: Page, resumo: string): Promise<void> {
  await page.getByLabel(/Resumo do problema/).fill(resumo);
  await page.getByRole("radio", { name: "Só eu" }).check();
  await page.getByLabel(/Onde você está/).fill("Obra Recreio");
  await page
    .getByLabel(/Descreva o que está acontecendo/)
    .fill("Roteador com luz vermelha piscando.");
}
