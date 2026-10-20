// PDFs do guia (docs/guia/guia-solicitante.pdf e guia-ti.pdf), gerados das próprias páginas de Ajuda.
// Rodar com: pnpm guias   (modo de demonstração; refaça depois de `pnpm prints` quando as telas mudarem)

import path from "node:path";
import { expect, test } from "@playwright/test";
import { entrar, trocarPara } from "./ajuda";

const PASTA = path.resolve(__dirname, "../../../docs/guia");

test("PDFs do guia @guias", async ({ page, context }, info) => {
  test.skip(info.project.name !== "computador", "um PDF só, a partir do computador");
  const salvar = async (arquivo: string) => {
    await page.emulateMedia({ media: "print" });
    await page.waitForLoadState("networkidle");
    await page.pdf({
      path: path.join(PASTA, arquivo),
      format: "A4",
      printBackground: true,
      margin: { top: "16mm", bottom: "16mm", left: "14mm", right: "14mm" },
    });
    await page.emulateMedia({ media: "screen" });
  };

  await entrar(page, "Ana Souza");
  await page.goto("/ajuda");
  await expect(page.getByRole("heading", { name: "Como pedir ajuda para a TI" })).toBeVisible();
  await salvar("guia-solicitante.pdf");

  await trocarPara(context, page, "Rafael Lima");
  await page.goto("/atendimento/ajuda");
  await expect(page.getByRole("heading", { name: "Guia da TI" })).toBeVisible();
  await salvar("guia-ti.pdf");
});
