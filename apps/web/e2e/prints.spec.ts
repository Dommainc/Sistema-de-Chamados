// Prints das telas para o guia do usuário e para a revisão visual (docs/guia/img).
// Rodar com: pnpm prints  (as duas larguras: computador e celular)

import path from "node:path";
import { expect, test, type Page } from "@playwright/test";
import { colarImagem, entrar, preencherInternet, trocarPara } from "./ajuda";

const PASTA = path.resolve(__dirname, "../../../docs/guia/img");

async function print(page: Page, nome: string, projeto: string) {
  await page.waitForTimeout(400); // fim de animações e carregamentos
  await page.screenshot({ path: path.join(PASTA, `${projeto}-${nome}.png`), fullPage: true });
}

test("prints de todas as telas @prints", async ({ page, context }, info) => {
  const p = info.project.name;

  await page.goto("/login");
  await expect(page.getByText("Entrar como:")).toBeVisible();
  await print(page, "01-login", p);

  await entrar(page, "Ana Souza");
  await expect(page.getByRole("link", { name: "Infraestrutura" })).toBeVisible();
  await print(page, "02-abrir-passo1", p);

  await page.getByRole("link", { name: "Infraestrutura" }).click();
  await preencherInternet(page, "Sem internet na obra Recreio");
  await colarImagem(page, "textarea");
  await expect(page.getByText(/^print-\d{8}-\d{6}\.png$/)).toBeVisible();
  await print(page, "03-abrir-passo2", p);

  await page.getByRole("button", { name: "Enviar chamado" }).click();
  await expect(page.getByText("Pronto! Seu chamado é o")).toBeVisible();
  await print(page, "04-abrir-passo3", p);

  // Acessos e permissões: sistemas com as cores de cada um.
  await page.goto("/abrir/1");
  await page.getByRole("radio", { name: "Sienge" }).check();
  await expect(page.getByRole("radio", { name: "Não se aplica" })).toBeVisible();
  await print(page, "03b-abrir-acessos", p);

  await page.goto("/meus-chamados");
  await expect(page.getByText("Outlook não sincroniza")).toBeVisible();
  await print(page, "05-meus-chamados", p);

  await page.goto("/meus-chamados/41");
  await expect(page.getByText(/Consegue abrir o Outlook/)).toBeVisible();
  await print(page, "06-chamado-solicitante", p);

  await trocarPara(context, page, "Rafael Lima");
  await expect(page.getByText("Próximo da fila")).toBeVisible();
  await print(page, "07-quadro", p);

  await page.goto("/atendimento?sistema=Construmanager");
  await expect(page.getByRole("article", { name: /^Chamado 40:/ })).toBeVisible();
  await print(page, "07b-quadro-filtro-sistema", p);

  await page.goto("/atendimento/41");
  await expect(page.getByText(/Consegue abrir o Outlook pelo navegador/)).toBeVisible();
  await print(page, "08-atendimento", p);

  await page.getByRole("button", { name: "Respostas prontas" }).click();
  await expect(page.getByRole("button", { name: /^Acesso remoto/ })).toBeVisible();
  await print(page, "08c-respostas-prontas", p);
  await page.keyboard.press("Escape");

  await page.getByRole("tab", { name: /Relato técnico/ }).click();
  await expect(page.getByText(/49,8 GB/)).toBeVisible();
  await print(page, "08b-relato-tecnico", p);

  await page.goto("/atendimento/encerrados");
  await expect(page.getByRole("heading", { name: /Chamados encerrados/ })).toBeVisible();
  await print(page, "09-encerrados", p);

  await page.getByRole("link", { name: "Dashboard" }).click();
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
  await expect(page.getByText("Abertos agora")).toBeVisible();
  await print(page, "10-dashboard", p);
});
