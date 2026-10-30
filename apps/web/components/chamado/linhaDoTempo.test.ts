import { describe, expect, it } from "vitest";
import type { PerfilPublico } from "@/lib/dados/tipos";
import type { Chamado, EventoHistorico, Mensagem } from "@/lib/dominio/tipos";
import { montarConversa, rotuloDia, textoEvento, textoHistorico } from "./linhaDoTempo";

// 05/10/2026 em São Paulo
const agora = new Date("2026-10-05T13:30:00Z");
const ANA = "ana";
const RAFAEL = "rafael";
const perfis: PerfilPublico[] = [
  { id: ANA, nome: "Ana Souza", departamento: "Engenharia", papel: "solicitante" },
  { id: RAFAEL, nome: "Rafael Lima", departamento: "TI", papel: "ti" },
];

const chamado: Chamado = {
  id: 41,
  titulo: "Outlook não sincroniza",
  categoriaId: 3,
  solicitanteId: ANA,
  responsavelId: RAFAEL,
  status: "aguardando_usuario",
  prioridade: "media",
  respostasForm: { descricao: "Desde ontem o Outlook não recebe e-mails novos." },
  prazoSla: "2026-10-05T17:00:00Z",
  criadoEm: "2026-10-05T11:46:00Z",
  atualizadoEm: "2026-10-05T12:52:00Z",
  concluidoEm: null,
  canceladoEm: null,
  motivoCancelamento: null,
};

const historico: EventoHistorico[] = [
  {
    id: 1,
    chamadoId: 41,
    autorId: ANA,
    acao: "criado",
    de: null,
    para: "pendente",
    detalhe: {},
    publico: true,
    criadoEm: "2026-10-05T11:46:00Z",
  },
  {
    id: 2,
    chamadoId: 41,
    autorId: RAFAEL,
    acao: "assumido",
    de: "pendente",
    para: "em_andamento",
    detalhe: {},
    publico: true,
    criadoEm: "2026-10-05T12:40:00Z",
  },
  {
    id: 3,
    chamadoId: 41,
    autorId: RAFAEL,
    acao: "status_alterado",
    de: "em_andamento",
    para: "aguardando_usuario",
    detalhe: {},
    publico: true,
    criadoEm: "2026-10-05T12:52:00Z",
  },
];

const mensagens: Mensagem[] = [
  {
    id: 1,
    chamadoId: 41,
    autorId: RAFAEL,
    conteudo: "Consegue abrir pelo navegador?",
    interna: false,
    criadoEm: "2026-10-05T12:52:00Z",
  },
];

describe("montarConversa (mockup, tela 5)", () => {
  const itens = montarConversa({
    chamado,
    mensagens,
    historico,
    anexos: [],
    perfis,
    euId: ANA,
    papel: "solicitante",
    agora,
  });

  it("começa com o separador 'Hoje' e o pedido como mensagem minha", () => {
    expect(itens[0]).toMatchObject({ tipo: "dia", texto: "Hoje" });
    expect(itens[1]).toMatchObject({
      tipo: "mensagem",
      minha: true,
      conteudo: "Desde ontem o Outlook não recebe e-mails novos.",
      autor: null, // as minhas não mostram nome
      hora: "08:46",
      inicioDeGrupo: true,
    });
  });

  it("evento do sistema em texto simples, com hora", () => {
    expect(itens[2]).toMatchObject({
      tipo: "evento",
      texto: "Rafael Lima iniciou o atendimento",
      hora: "09:40",
    });
  });

  it("mensagem da TI com nome e 'TI' no rodapé, antes do evento que causou", () => {
    expect(itens[3]).toMatchObject({
      tipo: "mensagem",
      minha: false,
      autor: "Rafael Lima · TI",
      hora: "09:52",
    });
    expect(itens[4]).toMatchObject({
      tipo: "evento",
      texto: "Status alterado para Aguardando sua resposta",
    });
  });

  it("'criado' não vira evento (o pedido já aparece)", () => {
    expect(itens.filter((i) => i.tipo === "evento")).toHaveLength(2);
  });

  it("na visão do técnico, ações dele aparecem como 'Você'", () => {
    const daTi = montarConversa({
      chamado,
      mensagens,
      historico,
      anexos: [],
      perfis,
      euId: RAFAEL,
      papel: "ti",
      agora,
    });
    expect(daTi.find((i) => i.tipo === "evento")).toMatchObject({
      texto: "Você iniciou o atendimento",
    });
    expect(daTi.find((i) => i.tipo === "evento" && i.texto.startsWith("Status"))).toMatchObject({
      texto: "Status alterado para Aguardando solicitante",
    });
  });
});

describe("agrupamento (estilo WhatsApp)", () => {
  it("mensagens seguidas da mesma pessoa ficam no mesmo grupo; outra pessoa abre outro; nota interna não entra", () => {
    const seguidas: Mensagem[] = [
      {
        id: 1,
        chamadoId: 41,
        autorId: RAFAEL,
        conteudo: "Oi",
        interna: false,
        criadoEm: "2026-10-05T12:50:00Z",
      },
      {
        id: 2,
        chamadoId: 41,
        autorId: RAFAEL,
        conteudo: "Tudo bem?",
        interna: false,
        criadoEm: "2026-10-05T12:51:00Z",
      },
      {
        id: 3,
        chamadoId: 41,
        autorId: RAFAEL,
        conteudo: "nota",
        interna: true,
        criadoEm: "2026-10-05T12:52:00Z",
      },
      {
        id: 4,
        chamadoId: 41,
        autorId: ANA,
        conteudo: "Oi!",
        interna: false,
        criadoEm: "2026-10-05T12:53:00Z",
      },
      {
        id: 5,
        chamadoId: 41,
        autorId: ANA,
        conteudo: "Tudo",
        interna: false,
        criadoEm: "2026-10-05T12:54:00Z",
      },
    ];
    const itens = montarConversa({
      chamado: { ...chamado, criadoEm: "2026-10-05T12:00:00Z" },
      mensagens: seguidas,
      historico: [],
      anexos: [],
      perfis,
      euId: RAFAEL,
      papel: "ti",
      agora,
    });
    const grupos = itens.flatMap((i) =>
      i.tipo === "mensagem" ? [[i.chave, i.inicioDeGrupo]] : [],
    );
    expect(grupos).toEqual([
      ["pedido", true],
      ["m1", true],
      ["m2", false],
      ["m4", true],
      ["m5", false],
    ]);
  });
});

describe("notas internas na conversa da TI", () => {
  const notas: Mensagem[] = [
    {
      id: 7,
      chamadoId: 41,
      autorId: RAFAEL,
      conteudo: "Caixa com 49,8 GB",
      interna: true,
      criadoEm: "2026-10-05T12:45:00Z",
    },
    ...mensagens,
  ];
  const transferencia: EventoHistorico = {
    id: 9,
    chamadoId: 41,
    autorId: RAFAEL,
    acao: "transferido",
    de: "em_andamento",
    para: "transferido",
    detalhe: { para_responsavel_id: ANA, motivo: "Ana cuida de e-mail" },
    publico: false,
    criadoEm: "2026-10-05T13:00:00Z",
  };
  const prioridade: EventoHistorico = {
    id: 10,
    chamadoId: 41,
    autorId: RAFAEL,
    acao: "prioridade_alterada",
    de: "em_andamento",
    para: "em_andamento",
    detalhe: { de: "media", para: "alta" },
    publico: false,
    criadoEm: "2026-10-05T13:05:00Z",
  };
  const entrada = {
    chamado,
    mensagens: notas,
    historico: [...historico, transferencia, prioridade],
    anexos: [],
    perfis,
    euId: RAFAEL,
    papel: "ti" as const,
    agora,
  };

  it("na tela de atendimento: a nota entra marcada e sem ✓; nenhum evento (ficam no Histórico)", () => {
    const itens = montarConversa({ ...entrada, telaAtendimento: true });
    const nota = itens.find((i) => i.tipo === "mensagem" && i.chave === "m7");
    expect(nota).toEqual(
      expect.objectContaining({ interna: true, conteudo: "Caixa com 49,8 GB", visto: null }),
    );
    expect(itens.some((i) => i.tipo === "evento")).toBe(false);
  });

  it("Histórico da lateral: transferência com o motivo e prioridade", () => {
    const nome = (id: string | null | undefined) => perfis.find((p) => p.id === id)?.nome ?? null;
    expect(textoHistorico(transferencia, nome)).toBe(
      "Transferido por Rafael Lima para Ana Souza — Ana cuida de e-mail",
    );
    expect(textoHistorico(prioridade, nome)).toBe(
      "Prioridade alterada por Rafael Lima: Média → Alta",
    );
  });

  it("nota interna nunca agrupa com a mensagem anterior da mesma pessoa", () => {
    const seguidas: Mensagem[] = [
      {
        id: 1,
        chamadoId: 41,
        autorId: RAFAEL,
        conteudo: "Oi",
        interna: false,
        criadoEm: "2026-10-05T12:50:00Z",
      },
      {
        id: 2,
        chamadoId: 41,
        autorId: RAFAEL,
        conteudo: "nota",
        interna: true,
        criadoEm: "2026-10-05T12:51:00Z",
      },
      {
        id: 3,
        chamadoId: 41,
        autorId: RAFAEL,
        conteudo: "outra",
        interna: true,
        criadoEm: "2026-10-05T12:52:00Z",
      },
    ];
    const itens = montarConversa({
      ...entrada,
      chamado: { ...chamado, criadoEm: "2026-10-05T12:00:00Z" },
      mensagens: seguidas,
      historico: [],
      telaAtendimento: true,
    });
    const grupos = itens.flatMap((i) =>
      i.tipo === "mensagem" ? [[i.chave, i.inicioDeGrupo]] : [],
    );
    expect(grupos).toEqual([
      ["pedido", true],
      ["m1", true],
      ["m2", true],
      ["m3", true],
    ]);
  });

  it("portal (sem telaAtendimento): sem nota, sem motivo da transferência, sem prioridade", () => {
    const conversa = montarConversa(entrada);
    const textos = conversa.map((i) => (i.tipo === "mensagem" ? i.conteudo : i.texto));
    expect(textos).not.toContain("Caixa com 49,8 GB");
    expect(textos).toContain("Você transferiu para Ana");
    expect(textos.some((t) => t.includes("prioridade"))).toBe(false);
  });
});

describe("rotuloDia", () => {
  it("Hoje, Ontem ou a data", () => {
    expect(rotuloDia("2026-10-05T12:00:00Z", agora)).toBe("Hoje");
    expect(rotuloDia("2026-10-04T12:00:00Z", agora)).toBe("Ontem");
    expect(rotuloDia("2026-10-01T12:00:00Z", agora)).toBe("01/10/2026");
  });
});

describe("prazo definido pela TI (ADR 0009)", () => {
  const nome = (id: string | null | undefined) => (id === RAFAEL ? "Rafael Lima" : null);
  const evento = (detalhe: Record<string, string>): EventoHistorico => ({
    id: 99,
    chamadoId: 41,
    autorId: RAFAEL,
    acao: "prazo_definido",
    de: "em_andamento",
    para: "em_andamento",
    detalhe,
    publico: true,
    criadoEm: "2026-10-05T13:00:00Z",
  });
  const definido = evento({ prazo: "2026-10-08T21:00:00Z" });
  const alterado = evento({
    prazo: "2026-10-09T21:00:00Z",
    prazo_anterior: "2026-10-08T21:00:00Z",
    motivo: "Aguardando a peça",
  });

  it("o solicitante vê a previsão e, se mudou, o motivo", () => {
    expect(textoEvento(definido, nome, ANA, "solicitante")).toBe(
      "Previsão de conclusão: 08/10 às 18:00",
    );
    expect(textoEvento(alterado, nome, ANA, "solicitante")).toBe(
      "Previsão de conclusão alterada para 09/10 às 18:00 (Aguardando a peça)",
    );
  });

  it("a TI vê quem definiu ou alterou", () => {
    expect(textoEvento(definido, nome, RAFAEL, "ti")).toBe(
      "Você definiu o prazo para 08/10 às 18:00",
    );
    expect(textoEvento(alterado, nome, RAFAEL, "ti")).toBe(
      "Você alterou o prazo para 09/10 às 18:00 (Aguardando a peça)",
    );
  });
});

describe("visto (✓/✓✓) — só a TI, nas mensagens dela", () => {
  const base = { chamado, mensagens, historico, anexos: [], perfis, agora };
  const daTi = (lido: string | null) =>
    montarConversa({ ...base, euId: RAFAEL, papel: "ti", lidoPeloSolicitanteAte: lido }).find(
      (i) => i.chave === "m1",
    );

  it("✓ enquanto o solicitante não leu; ✓✓ depois que leu", () => {
    expect(daTi(null)).toMatchObject({ visto: false });
    expect(daTi("2026-10-05T12:51:00Z")).toMatchObject({ visto: false });
    expect(daTi("2026-10-05T12:52:00Z")).toMatchObject({ visto: true });
  });

  it("não marca as mensagens do solicitante nem aparece para o solicitante", () => {
    const ti = montarConversa({ ...base, euId: RAFAEL, papel: "ti", lidoPeloSolicitanteAte: null });
    expect(ti.find((i) => i.chave === "pedido")).toMatchObject({ visto: null });
    const ana = montarConversa({ ...base, euId: ANA, papel: "solicitante" });
    expect(ana.filter((i) => i.tipo === "mensagem").every((i) => i.visto === null)).toBe(true);
  });
});
