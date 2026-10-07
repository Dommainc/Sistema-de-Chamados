// Automações por tempo (ADR 0011) com relógio fixo — o mesmo comportamento do app.processar_inatividade.

import { describe, expect, it } from "vitest";
import type { Chamado, Mensagem } from "@/lib/dominio/tipos";
import type { EstadoSimulado } from "./armazenamento";
import { estadoInicial } from "./armazenamento";
import { processarInatividade } from "./inatividade";
import { USUARIOS_SIMULADOS } from "./usuarios";

const [ANA, , RAFAEL] = USUARIOS_SIMULADOS;
// Terça, 06/10/2026, 15:00 em São Paulo.
const AGORA = new Date("2026-10-06T18:00:00Z");

function cenario(mensagens: Omit<Mensagem, "id" | "chamadoId">[]): EstadoSimulado {
  const base = estadoInicial(AGORA);
  const chamado: Chamado = {
    ...base.chamados[0],
    id: 900,
    solicitanteId: ANA.id,
    responsavelId: RAFAEL.id,
    status: "em_andamento",
    concluidoEm: null,
    canceladoEm: null,
  };
  return {
    ...base,
    chamados: [chamado],
    historico: [],
    notificacoes: [],
    mensagens: mensagens.map((m, i) => ({ ...m, id: i + 1, chamadoId: 900 })),
  };
}

const daTi = (criadoEm: string) => ({
  autorId: RAFAEL.id,
  conteudo: "Testa?",
  interna: false,
  criadoEm,
});

describe("automações por tempo (modo de demonstração)", () => {
  it("mensagem da TI há 1 h útil: nada muda", () => {
    expect(processarInatividade(cenario([daTi("2026-10-06T17:00:00Z")]), AGORA)).toBeNull();
  });

  it("2 h úteis sem resposta → Aguardando usuário, com histórico do sistema e aviso ao solicitante", () => {
    const novo = processarInatividade(cenario([daTi("2026-10-06T15:30:00Z")]), AGORA)!;
    expect(novo.chamados[0].status).toBe("aguardando_usuario");
    expect(novo.historico.at(-1)).toMatchObject({
      autorId: null,
      para: "aguardando_usuario",
      detalhe: { motivo: "sem_resposta_2h_uteis" },
    });
    expect(novo.notificacoes.at(-1)).toMatchObject({ destinatarioId: ANA.id });
    expect(novo.mensagens).toHaveLength(1); // ainda não é hora do aviso
  });

  it("horas úteis: mensagem às 17h de sexta só vence às 9h de segunda", () => {
    const sexta17h = "2026-10-09T20:00:00Z";
    const estado = cenario([daTi(sexta17h)]);
    expect(processarInatividade(estado, new Date("2026-10-10T15:00:00Z"))).toBeNull(); // sábado
    expect(processarInatividade(estado, new Date("2026-10-13T12:05:00Z"))?.chamados[0].status).toBe(
      "aguardando_usuario",
    ); // terça 9h05 (segunda 12/10 é feriado)
  });

  it("24 h úteis sem resposta → um aviso automático no chat, que não se repete", () => {
    const estado = cenario([daTi("2026-10-01T13:00:00Z")]);
    const depois = processarInatividade(estado, AGORA)!;
    const aviso = depois.mensagens.at(-1)!;
    expect(aviso).toMatchObject({ autorId: null, interna: false });
    expect(aviso.conteudo).toMatch(/^Olá, Ana! Estamos aguardando sua resposta .*#900/);
    expect(depois.notificacoes.some((n) => n.tipo === "aviso_inatividade")).toBe(true);
    expect(processarInatividade(depois, AGORA)).toBeNull();
  });

  it("se o solicitante respondeu por último, nada acontece", () => {
    const estado = cenario([
      daTi("2026-10-01T13:00:00Z"),
      { autorId: ANA.id, conteudo: "Testei", interna: false, criadoEm: "2026-10-01T14:00:00Z" },
    ]);
    expect(processarInatividade(estado, AGORA)).toBeNull();
  });

  it("nota interna não conta como mensagem da TI para o solicitante", () => {
    const estado = cenario([{ ...daTi("2026-10-01T13:00:00Z"), interna: true }]);
    expect(processarInatividade(estado, AGORA)).toBeNull();
  });
});
