import { describe, expect, it } from "vitest";
import type { PerfilPublico } from "@/lib/dados/tipos";
import type { Chamado, EventoHistorico, Mensagem } from "@/lib/dominio/tipos";
import { contarRelato, montarConversa, montarRelato, rotuloDia } from "./linhaDoTempo";

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
      texto: "Rafael Lima assumiu o chamado",
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
      texto: "Você assumiu o chamado",
    });
    expect(daTi.find((i) => i.tipo === "evento" && i.texto.startsWith("Status"))).toMatchObject({
      texto: "Status alterado para Aguardando usuário",
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

describe("Relato técnico (só TI)", () => {
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

  it("junta as notas internas e a transferência com motivo, em ordem de tempo", () => {
    const relato = montarRelato({
      mensagens: notas,
      historico: [...historico, transferencia],
      anexos: [],
      perfis,
      euId: RAFAEL,
    });
    expect(relato).toEqual([
      expect.objectContaining({
        tipo: "anotacao",
        autor: "Você",
        conteudo: "Caixa com 49,8 GB",
        quando: "05/10/2026 09:45",
      }),
      expect.objectContaining({
        tipo: "registro",
        texto: "Você transferiu para Ana Souza",
        motivo: "Ana cuida de e-mail",
      }),
    ]);
    expect(contarRelato(notas, [...historico, transferencia])).toBe(2);
  });

  it("a conversa não mostra a nota interna nem o motivo da transferência", () => {
    const conversa = montarConversa({
      chamado,
      mensagens: notas,
      historico: [...historico, transferencia],
      anexos: [],
      perfis,
      euId: RAFAEL,
      papel: "ti",
      agora,
    });
    const textos = conversa.map((i) => (i.tipo === "mensagem" ? i.conteudo : i.texto));
    expect(textos).not.toContain("Caixa com 49,8 GB");
    expect(textos).toContain("Você transferiu para Ana");
  });
});

describe("rotuloDia", () => {
  it("Hoje, Ontem ou a data", () => {
    expect(rotuloDia("2026-10-05T12:00:00Z", agora)).toBe("Hoje");
    expect(rotuloDia("2026-10-04T12:00:00Z", agora)).toBe("Ontem");
    expect(rotuloDia("2026-10-01T12:00:00Z", agora)).toBe("01/10/2026");
  });
});
