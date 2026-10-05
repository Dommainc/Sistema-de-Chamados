import { describe, expect, it } from "vitest";
import type { PerfilPublico } from "@/lib/dados/tipos";
import type { Chamado, EventoHistorico, Mensagem } from "@/lib/dominio/tipos";
import { montarConversa, rotuloDia } from "./linhaDoTempo";

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
      rodape: "Você · 08:46",
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
      rodape: "Rafael Lima · TI · 09:52",
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

describe("rotuloDia", () => {
  it("Hoje, Ontem ou a data", () => {
    expect(rotuloDia("2026-10-05T12:00:00Z", agora)).toBe("Hoje");
    expect(rotuloDia("2026-10-04T12:00:00Z", agora)).toBe("Ontem");
    expect(rotuloDia("2026-10-01T12:00:00Z", agora)).toBe("01/10/2026");
  });
});
