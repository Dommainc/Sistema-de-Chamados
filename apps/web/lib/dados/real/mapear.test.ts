import { describe, expect, it } from "vitest";
import { chamadoDaLinha, eventoDaLinha, type LinhaChamado } from "./mapear";

describe("conversões do Supabase", () => {
  it("chamado: snake_case → camelCase, respostas vazias viram {}", () => {
    const linha: LinhaChamado = {
      id: 42,
      titulo: "Sem internet",
      categoria_id: 2,
      solicitante_id: "ana",
      responsavel_id: null,
      status: "pendente",
      prioridade: "media",
      respostas_form: null,
      prazo_sla: null,
      criado_em: "2026-10-15T12:00:00Z",
      atualizado_em: "2026-10-15T12:00:00Z",
      concluido_em: null,
      cancelado_em: null,
      motivo_cancelamento: null,
    };
    expect(chamadoDaLinha(linha)).toMatchObject({
      id: 42,
      categoriaId: 2,
      solicitanteId: "ana",
      respostasForm: {},
      prazoSla: null,
    });
  });

  it("histórico: o detalhe (jsonb) vira texto para as telas", () => {
    const evento = eventoDaLinha({
      id: 1,
      chamado_id: 42,
      autor_id: null,
      acao: "avaliado",
      de: "concluido",
      para: "concluido",
      detalhe: { nota: 4, motivo: "ok", vazio: null },
      publico: true,
      criado_em: "2026-10-15T12:00:00Z",
    });
    expect(evento.detalhe).toEqual({ nota: "4", motivo: "ok" });
  });
});
