import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ArquivoNovo } from "@/lib/dados/tipos";
import { _reiniciarParaTestes, estadoInicial, gravarEstado, lerEstado } from "./armazenamento";
import { criarFonteSimulada } from "./index";
import { USUARIOS_SIMULADOS } from "./usuarios";

const [ANA, BRUNO, RAFAEL] = USUARIOS_SIMULADOS;
// Exemplos (lib/dados/simulada/exemplos.ts): #41 aguardando a Ana (com nota interna do Rafael),
// #42 pendente da Ana, #35 concluído da Ana, #38 em andamento da Ana (já lido).

function png(): ArquivoNovo {
  return {
    arquivo: new Blob(["x"], { type: "image/png" }),
    nome: "print.png",
    mime: "image/png",
    tamanho: 100,
    origem: "colado",
  };
}

beforeEach(() => {
  localStorage.clear();
  _reiniciarParaTestes();
  gravarEstado(estadoInicial());
  globalThis.URL.createObjectURL = vi.fn(() => "blob:arquivo");
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("mensagens e visibilidade (RLS)", () => {
  it("solicitante nunca recebe nota interna; a TI recebe", async () => {
    const daAna = await criarFonteSimulada(ANA.id).listarMensagens(41);
    const doRafael = await criarFonteSimulada(RAFAEL.id).listarMensagens(41);
    expect(daAna.some((m) => m.interna)).toBe(false);
    expect(doRafael.some((m) => m.interna)).toBe(true);
    expect(doRafael.length).toBe(daAna.length + 1);
  });

  it("outro solicitante não lê a conversa", async () => {
    await expect(criarFonteSimulada(BRUNO.id).listarMensagens(41)).rejects.toMatchObject({
      codigo: "SEM_PERMISSAO",
    });
  });

  it("solicitante só vê eventos públicos do histórico", async () => {
    const daMarina = await criarFonteSimulada(RAFAEL.id).listarHistorico(39);
    expect(daMarina.some((h) => h.acao === "transferido" && !h.publico)).toBe(true);
  });

  it("anexo de nota interna: some da lista do solicitante e não abre para ele", async () => {
    await criarFonteSimulada(RAFAEL.id).enviarMensagem({
      chamadoId: 41,
      conteudo: "Print do painel de administração",
      interna: true,
      anexos: [png()],
    });
    const anexoInterno = lerEstado().anexos.at(-1)!;
    const fonteAna = criarFonteSimulada(ANA.id);
    expect((await fonteAna.listarAnexos(41)).some((a) => a.id === anexoInterno.id)).toBe(false);
    await expect(fonteAna.abrirAnexo(anexoInterno.id)).rejects.toMatchObject({
      codigo: "SEM_PERMISSAO",
    });
    expect(await criarFonteSimulada(RAFAEL.id).abrirAnexo(anexoInterno.id)).toBe("blob:arquivo");
  });
});

describe("enviarMensagem", () => {
  it("resposta da Ana em 'aguardando' volta o chamado para em_andamento sozinho", async () => {
    const fonte = criarFonteSimulada(ANA.id);
    await fonte.enviarMensagem({
      chamadoId: 41,
      conteudo: "No navegador aparecem sim!",
      anexos: [],
    });
    expect((await fonte.obterChamado(41)).status).toBe("em_andamento");
    const ultimo = lerEstado().historico.at(-1)!;
    expect(ultimo).toMatchObject({
      chamadoId: 41,
      acao: "status_alterado",
      de: "aguardando_usuario",
      para: "em_andamento",
      autorId: null,
      publico: true,
    });
  });

  it("mensagem só com anexo é aceita; sem texto nem anexo → CAMPO_OBRIGATORIO", async () => {
    const fonte = criarFonteSimulada(ANA.id);
    await expect(
      fonte.enviarMensagem({ chamadoId: 38, conteudo: "", anexos: [png()] }),
    ).resolves.toBeTruthy();
    await expect(
      fonte.enviarMensagem({ chamadoId: 38, conteudo: "   ", anexos: [] }),
    ).rejects.toMatchObject({
      codigo: "CAMPO_OBRIGATORIO",
    });
  });

  it("chamado encerrado não aceita mensagem → TRANSICAO_INVALIDA", async () => {
    await expect(
      criarFonteSimulada(ANA.id).enviarMensagem({ chamadoId: 35, conteudo: "Voltou", anexos: [] }),
    ).rejects.toMatchObject({ codigo: "TRANSICAO_INVALIDA" });
  });

  it("solicitante não escreve nota interna → SEM_PERMISSAO", async () => {
    await expect(
      criarFonteSimulada(ANA.id).enviarMensagem({
        chamadoId: 41,
        conteudo: "x",
        interna: true,
        anexos: [],
      }),
    ).rejects.toMatchObject({ codigo: "SEM_PERMISSAO" });
  });

  it("sem conexão → MENSAGEM_NAO_ENVIADA e nada é gravado", async () => {
    vi.spyOn(navigator, "onLine", "get").mockReturnValue(false);
    const antes = lerEstado().mensagens.length;
    await expect(
      criarFonteSimulada(ANA.id).enviarMensagem({ chamadoId: 41, conteudo: "Oi", anexos: [] }),
    ).rejects.toMatchObject({ codigo: "MENSAGEM_NAO_ENVIADA" });
    expect(lerEstado().mensagens.length).toBe(antes);
  });
});

describe("não lidas", () => {
  it("#41 tem mensagem nova para a Ana; #38 já foi lido", async () => {
    const naoLidos = await criarFonteSimulada(ANA.id).listarNaoLidos();
    expect(naoLidos).toContain(41);
    expect(naoLidos).not.toContain(38);
  });

  it("abrir o chamado marca como lido, e marcar de novo não grava nada", async () => {
    const fonte = criarFonteSimulada(ANA.id);
    await fonte.marcarComoLido(41);
    expect(await fonte.listarNaoLidos()).not.toContain(41);

    let gravacoes = 0;
    const cancelar = fonte.aoMudar(() => gravacoes++);
    await fonte.marcarComoLido(41);
    cancelar();
    expect(gravacoes).toBe(0);
  });

  it("nota interna nunca conta como mensagem nova para o solicitante", async () => {
    const fonte = criarFonteSimulada(ANA.id);
    await fonte.marcarComoLido(38);
    await criarFonteSimulada(RAFAEL.id).enviarMensagem({
      chamadoId: 38,
      conteudo: "anotação",
      interna: true,
      anexos: [],
    });
    expect(await fonte.listarNaoLidos()).not.toContain(38);
  });
});

describe("cancelar (só a TI — pedido do dono, 2026-10-07)", () => {
  it("o solicitante não cancela nem em Recebido: recebe a orientação do catálogo", async () => {
    await expect(
      criarFonteSimulada(ANA.id).executarAcao(42, "cancelar", { motivo: "Voltou sozinho" }),
    ).rejects.toMatchObject({ codigo: "CANCELAMENTO_NAO_PERMITIDO" });
    expect((await criarFonteSimulada(ANA.id).obterChamado(42)).status).toBe("pendente");
  });

  it("a TI cancela com motivo", async () => {
    const chamado = await criarFonteSimulada(RAFAEL.id).executarAcao(42, "cancelar", {
      motivo: "Voltou a funcionar sozinho",
    });
    expect(chamado).toMatchObject({
      status: "cancelado",
      motivoCancelamento: "Voltou a funcionar sozinho",
    });
  });

  it("a TI não conversa nem anota no relato antes de iniciar (ADR 0012)", async () => {
    const ti = criarFonteSimulada(RAFAEL.id);
    await expect(
      ti.enviarMensagem({ chamadoId: 42, conteudo: "Oi, Ana", anexos: [] }),
    ).rejects.toMatchObject({ codigo: "CHAMADO_NAO_INICIADO" });
    await expect(
      ti.enviarMensagem({ chamadoId: 42, conteudo: "Anotação", interna: true, anexos: [] }),
    ).rejects.toMatchObject({ codigo: "CHAMADO_NAO_INICIADO" });
  });

  it("prioridade: só TI, depois de iniciar, no histórico interno e sem aviso", async () => {
    const ti = criarFonteSimulada(RAFAEL.id);
    await expect(ti.definirPrioridade(42, "alta")).rejects.toMatchObject({
      codigo: "CHAMADO_NAO_INICIADO",
    });
    await expect(criarFonteSimulada(ANA.id).definirPrioridade(41, "alta")).rejects.toMatchObject({
      codigo: "SEM_PERMISSAO",
    });
    const avisosAntes = lerEstado().notificacoes.length;
    expect((await ti.definirPrioridade(41, "alta")).prioridade).toBe("alta");
    expect(lerEstado().historico.at(-1)).toMatchObject({
      acao: "prioridade_alterada",
      publico: false,
      detalhe: { de: "media", para: "alta" },
    });
    expect(lerEstado().notificacoes).toHaveLength(avisosAntes);
    const daAna = await criarFonteSimulada(ANA.id).listarHistorico(41);
    expect(daAna.some((h) => h.acao === "prioridade_alterada")).toBe(false);
  });
});
