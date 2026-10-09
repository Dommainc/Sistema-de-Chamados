// Arrastar cartões no quadro (ADR 0010, P-029): com o mouse no computador e com o dedo no celular.

import { expect, test, type Locator, type Page } from "@playwright/test";
import { entrar } from "./ajuda";

const cartao = (page: Page, numero: number) =>
  page.getByRole("article", { name: new RegExp(`^Chamado ${numero}:`) });
const coluna = (page: Page, titulo: string) =>
  page.getByRole("region", { name: new RegExp(`^${titulo}:`) });

/** Ponto do canhoto "Nº" do cartão (nem link nem botão: é por onde se pega o cartão). */
async function pontoDoNumero(alvo: Locator) {
  await alvo.scrollIntoViewIfNeeded();
  const caixa = await alvo.boundingBox();
  if (!caixa) throw new Error("cartão sem posição na tela");
  return { x: caixa.x + 24, y: caixa.y + caixa.height / 2 };
}

test.describe("computador (mouse)", () => {
  test.beforeEach(({}, info) => {
    test.skip(info.project.name !== "computador", "Teste do mouse.");
  });

  test("arrastar de Novos para Em atendimento inicia o chamado", async ({ page }) => {
    await entrar(page, "Rafael Lima");
    // O primeiro da fila (Novos segue a ordem de chegada): fica no topo, à vista.
    const primeiro = coluna(page, "Novos").getByRole("article").first();
    const numero = ((await primeiro.getAttribute("aria-label")) ?? "").match(/Chamado (\d+)/)?.[1];
    const inicio = await pontoDoNumero(primeiro);
    const destino = await coluna(page, "Em atendimento").boundingBox();
    if (!destino || !numero) throw new Error("coluna ou cartão sem posição");

    await page.mouse.move(inicio.x, inicio.y);
    await page.mouse.down();
    await page.mouse.move(destino.x + destino.width / 2, destino.y + 120, { steps: 12 });
    await page.mouse.up();

    await expect(page.getByText(`Você iniciou o chamado #${numero}.`)).toBeVisible();
    await expect(cartao(page, Number(numero))).toBeVisible();
  });

  test("clicar no título continua abrindo o chamado (não vira arraste)", async ({ page }) => {
    await entrar(page, "Rafael Lima");
    await cartao(page, 41).getByRole("link", { name: "Outlook não sincroniza" }).click();
    await expect(page).toHaveURL(/\/atendimento\/41$/);
  });
});

test.describe("celular (dedo)", () => {
  test.beforeEach(({}, info) => {
    test.skip(info.project.name !== "celular", "Teste do toque.");
  });

  test("segurar e arrastar de Novos para Em atendimento assume o chamado", async ({ page }) => {
    await entrar(page, "Rafael Lima");
    const inicio = await pontoDoNumero(cartao(page, 36));
    const largura = page.viewportSize()?.width ?? 393;
    // Toque de verdade (eventos touch), como o dedo na tela.
    const cdp = await page.context().newCDPSession(page);
    const tocar = (type: "touchStart" | "touchMove" | "touchEnd", x: number, y: number) =>
      cdp.send("Input.dispatchTouchEvent", {
        type,
        touchPoints: type === "touchEnd" ? [] : [{ x, y }],
      });

    const aviso = page.getByRole("status").filter({ hasText: /Chamado #36/ });

    await tocar("touchStart", inicio.x, inicio.y);
    await page.waitForTimeout(400); // segurar ~0,25 s ativa o arraste
    await expect(aviso).toContainText(/pego|sobre a coluna Novos/); // arraste começou
    // Como uma pessoa faria: leva até a borda (a tela rola sozinha) e, quando "Em atendimento"
    // aparece, volta o dedo para o meio e solta.
    const borda = largura - 8;
    const meio = largura / 2;
    for (let i = 1; i <= 8; i++) {
      await tocar("touchMove", inicio.x + ((borda - inicio.x) * i) / 8, inicio.y);
      await page.waitForTimeout(20);
    }
    let sobreEmAtendimento = false;
    for (let tentativa = 0; tentativa < 30 && !sobreEmAtendimento; tentativa++) {
      await tocar("touchMove", borda, inicio.y);
      await page.waitForTimeout(120);
      await tocar("touchMove", meio, inicio.y);
      await page.waitForTimeout(150);
      sobreEmAtendimento = (await aviso.textContent())?.includes("Em atendimento") ?? false;
    }
    expect(sobreEmAtendimento).toBe(true);
    await tocar("touchEnd", meio, inicio.y);

    await expect(page.getByText("Você iniciou o chamado #36.")).toBeVisible();
  });

  test("toque rápido no título abre o chamado (não vira arraste)", async ({ page }) => {
    await entrar(page, "Rafael Lima");
    await cartao(page, 36).getByRole("link").tap();
    await expect(page).toHaveURL(/\/atendimento\/36$/);
  });
});
