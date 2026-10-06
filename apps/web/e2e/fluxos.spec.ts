// Critérios de pronto da Fase 1 (docs/escopo.md, seção 13) que dá para provar no modo simulado.
// Cada teste começa com um navegador limpo (dados de exemplo recém-criados).

import { expect, test } from "@playwright/test";
import { colarImagem, entrar, preencherInternet, trocarPara } from "./ajuda";

test.beforeEach(({}, info) => {
  test.skip(info.project.name !== "computador", "Fluxos completos rodam na tela de computador.");
});

test("Ana abre um chamado colando um print e recebe o número (previsão vem da TI)", async ({
  page,
}) => {
  await entrar(page, "Ana Souza");
  await page.getByRole("link", { name: "Internet, rede ou VPN" }).click();
  await expect(page.getByRole("heading", { name: "Conte o que está acontecendo" })).toBeVisible();

  await preencherInternet(page, "Sem internet na obra Recreio");
  await colarImagem(page, "textarea");
  await expect(page.getByText(/^print-\d{8}-\d{6}\.png$/)).toBeVisible();

  await page.getByRole("button", { name: "Enviar pedido" }).click();
  await expect(page.getByText("Pronto! Seu chamado é o")).toBeVisible();
  await expect(page.getByText("#46")).toBeVisible();
  await expect(page.getByText(/Você vai receber avisos no/)).toBeVisible();
  await expect(page.getByText("A TI vai analisar e informar")).toBeVisible();

  await page.getByRole("link", { name: "Acompanhar meu chamado" }).click();
  await expect(page).toHaveURL(/\/meus-chamados\/46$/);
  await expect(
    page.getByRole("region", { name: "Conversa" }).getByText("Roteador com luz vermelha piscando."),
  ).toBeVisible();
});

test("abrir o chamado de outra pessoa pela URL mostra 'sem acesso'", async ({ page }) => {
  await entrar(page, "Ana Souza");
  await page.goto("/meus-chamados/36"); // da Carla
  await expect(
    page.getByText(
      "Você não tem acesso a este chamado. Se acha que isso é um erro, fale com a TI.",
    ),
  ).toBeVisible();
  await page.goto("/atendimento");
  await expect(page.getByText("Você não tem acesso a esta área")).toBeVisible();
});

test("técnico assume, conversa, anota no relato técnico, transfere; outro técnico assume e conclui", async ({
  page,
  context,
}) => {
  await entrar(page, "Rafael Lima");
  await page
    .getByRole("article", { name: /^Chamado 42:/ })
    .getByRole("button", { name: "Assumir" })
    .click();
  await expect(page.getByText("Você assumiu o chamado #42.")).toBeVisible();

  await page.goto("/atendimento/42");
  const mensagem = page.getByRole("textbox", { name: "Mensagem" });
  await mensagem.fill("Oi, Ana! Já estou olhando o roteador.");
  await page.getByRole("button", { name: "Enviar mensagem" }).click();
  await expect(page.getByText("Oi, Ana! Já estou olhando o roteador.")).toBeVisible();

  await page.getByRole("tab", { name: /Relato técnico/ }).click();
  await page.getByRole("textbox", { name: "Anotação" }).fill("Trocar fonte do roteador.");
  await page.getByRole("button", { name: "Adicionar ao relato" }).click();
  await expect(page.getByText("Trocar fonte do roteador.")).toBeVisible();

  const acoes = page.getByRole("region", { name: "Ações" });
  await acoes.getByRole("button", { name: "Transferir" }).click();
  const modal = page.getByRole("dialog");
  await modal.getByRole("combobox").selectOption({ label: "Thiago Martins" });
  await modal.getByRole("textbox").fill("Thiago está na obra Recreio hoje.");
  await modal.getByRole("button", { name: "Transferir" }).click();
  await expect(page.getByText("Chamado #42 transferido.")).toBeVisible();

  await trocarPara(context, page, "Thiago Martins");
  await page.goto("/atendimento/42");
  await page
    .getByRole("region", { name: "Ações" })
    .getByRole("button", { name: "Assumir" })
    .click();
  await expect(page.getByText("Você assumiu o chamado #42.")).toBeVisible();
  await page
    .getByRole("region", { name: "Ações" })
    .getByRole("button", { name: "Marcar como concluído" })
    .click();
  await page.getByRole("dialog").getByRole("button", { name: "Marcar como concluído" }).click();
  await expect(page.getByText("Chamado #42 concluído.")).toBeVisible();

  const historico = page.getByRole("region", { name: "Histórico" });
  await expect(historico.getByText("Assumido por Rafael Lima")).toBeVisible();
  await expect(
    historico.getByText(
      "Transferido por Rafael Lima para Thiago Martins — Thiago está na obra Recreio hoje.",
    ),
  ).toBeVisible();
  await expect(historico.getByText("Concluído por Thiago Martins")).toBeVisible();
});

test("Ana cancela antes do atendimento e não consegue cancelar depois", async ({ page }) => {
  await entrar(page, "Ana Souza");
  await page.goto("/meus-chamados/42");
  await page.getByRole("button", { name: "Cancelar chamado" }).click();
  const modal = page.getByRole("dialog");
  await modal.getByRole("button", { name: "Cancelar chamado" }).click();
  await expect(modal.getByText("Informe o motivo para continuar.")).toBeVisible();
  await modal.getByRole("textbox").fill("A internet voltou sozinha.");
  await modal.getByRole("button", { name: "Cancelar chamado" }).click();
  await expect(page.getByText("Chamado #42 cancelado.")).toBeVisible();
  await expect(page.getByText("Este chamado foi encerrado.")).toBeVisible();

  await page.goto("/meus-chamados/38"); // já em atendimento
  await expect(page.getByRole("heading", { name: "Instalar AutoCAD no notebook" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Cancelar chamado" })).toHaveCount(0);
});

test("conversa em tempo real entre Ana e Rafael; relato técnico nunca chega à Ana", async ({
  context,
}) => {
  const ana = await context.newPage();
  await entrar(ana, "Ana Souza");
  await ana.goto("/meus-chamados/41");
  await expect(ana.getByText(/Consegue abrir o Outlook pelo navegador/)).toBeVisible();

  // Outra aba do mesmo navegador como Rafael (a aba da Ana segue como Ana até recarregar).
  const rafael = await context.newPage();
  await context.clearCookies();
  await entrar(rafael, "Rafael Lima");
  await rafael.goto("/atendimento/41");

  await ana.getByRole("textbox", { name: "Mensagem" }).fill("No navegador aparecem sim!");
  await ana.getByRole("button", { name: "Enviar mensagem" }).click();
  await expect(rafael.getByText("No navegador aparecem sim!")).toBeVisible();

  await rafael.getByRole("tab", { name: /Relato técnico/ }).click();
  await rafael.getByRole("textbox", { name: "Anotação" }).fill("Segredo interno da TI");
  await rafael.getByRole("button", { name: "Adicionar ao relato" }).click();
  await expect(rafael.getByText("Segredo interno da TI")).toBeVisible();
  await rafael.getByRole("tab", { name: /Conversa com Ana/ }).click();
  await rafael
    .getByRole("textbox", { name: "Mensagem" })
    .fill("Ótimo! Vou arquivar e-mails antigos.");
  await rafael.getByRole("button", { name: "Enviar mensagem" }).click();

  await expect(ana.getByText("Ótimo! Vou arquivar e-mails antigos.")).toBeVisible();
  await expect(ana.getByText("Segredo interno da TI")).toHaveCount(0);
  await expect(ana.getByText(/voltou para Em atendimento/)).toBeVisible();

  // Prazo definido pela TI (ADR 0009): alterar pede motivo, e a Ana vê a nova previsão e o motivo.
  await rafael
    .getByRole("region", { name: "Prazo" })
    .getByRole("button", { name: "Alterar prazo" })
    .click();
  const modal = rafael.getByRole("dialog");
  await modal.getByRole("button", { name: "Em 3 dias úteis" }).click();
  await modal
    .getByRole("textbox", { name: /Por que está mudando o prazo/ })
    .fill("Licença em compra");
  await modal.getByRole("button", { name: "Alterar prazo" }).click();
  await expect(rafael.getByText(/Prazo do chamado #41/)).toBeVisible();
  await expect(
    ana.getByText(/Previsão de conclusão alterada para .*: Licença em compra/),
  ).toBeVisible();
});

test("busca: número abre o chamado; texto filtra o quadro", async ({ page }) => {
  await entrar(page, "Rafael Lima");
  await page
    .getByRole("searchbox", { name: /Buscar chamado/ })
    .first()
    .fill("impressora");
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/atendimento\?busca=impressora$/);
  await expect(page.getByRole("article", { name: /^Chamado 36:/ })).toBeVisible();
  await expect(page.getByRole("article", { name: /^Chamado 41:/ })).toHaveCount(0);
});

test("busca por 41 na barra técnica abre o chamado 41", async ({ page }) => {
  await entrar(page, "Rafael Lima");
  await page
    .getByRole("searchbox", { name: /Buscar chamado/ })
    .first()
    .fill("41");
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/atendimento\/41$/);
  await expect(page.getByRole("heading", { name: "Outlook não sincroniza" })).toBeVisible();
});

test("erros aparecem com a mensagem amigável do catálogo", async ({ page, context }) => {
  await entrar(page, "Ana Souza");
  await page.goto("/abrir/2");

  await page.getByRole("button", { name: "Enviar pedido" }).click();
  await expect(page.getByText("Preencha o campo Resumo do problema para continuar.")).toBeVisible();

  const arquivo = page.locator('input[type="file"]');
  await arquivo.setInputFiles({
    name: "setup.exe",
    mimeType: "application/x-msdownload",
    buffer: Buffer.from("MZ"),
  });
  await expect(
    page.getByText("Esse tipo de arquivo não é aceito. Envie imagem, PDF ou documento do Office."),
  ).toBeVisible();
  await arquivo.setInputFiles({
    name: "video.png",
    mimeType: "image/png",
    buffer: Buffer.alloc(11 * 1024 * 1024),
  });
  await expect(
    page.getByText(
      "Esse arquivo tem mais de 10 MB. Tente um arquivo menor ou envie um print da tela.",
    ),
  ).toBeVisible();

  await page.goto("/meus-chamados/41");
  await expect(page.getByText(/Consegue abrir o Outlook/)).toBeVisible();
  await context.setOffline(true);
  await expect(
    page.getByText("Sem conexão. As mensagens novas vão aparecer quando a conexão voltar."),
  ).toBeVisible();
  await page.getByRole("textbox", { name: "Mensagem" }).fill("Mensagem sem internet");
  await page.getByRole("button", { name: "Enviar mensagem" }).click();
  const tentar = page.getByRole("button", {
    name: "Sua mensagem não foi enviada. Toque para tentar de novo.",
  });
  await expect(tentar).toBeVisible();
  await context.setOffline(false);
  await tentar.click();
  await expect(tentar).toHaveCount(0);
  await expect(page.getByText("Mensagem sem internet")).toBeVisible();
});
