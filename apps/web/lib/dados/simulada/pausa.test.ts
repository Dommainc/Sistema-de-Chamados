import { describe, expect, it } from "vitest";
import type { Chamado } from "@/lib/dominio/tipos";
import { aplicarPausaDoPrazo } from "./pausa";

const base: Chamado = {
  id: 41,
  titulo: "Outlook não sincroniza",
  categoriaId: 3,
  solicitanteId: "ana",
  responsavelId: "rafael",
  status: "em_andamento",
  prioridade: "media",
  respostasForm: {},
  prazoSla: "2026-11-02T15:00:00.000Z",
  criadoEm: "2026-10-29T12:00:00.000Z",
  atualizadoEm: "2026-10-29T12:00:00.000Z",
  concluidoEm: null,
  canceladoEm: null,
  motivoCancelamento: null,
  pausadoEm: null,
};
const aguardando: Chamado = {
  ...base,
  status: "aguardando_usuario",
  pausadoEm: "2026-10-29T13:00:00.000Z",
};

describe("prazo pausado em Aguardando (ADR 0021)", () => {
  it("entrar em Aguardando marca o início da pausa", () => {
    const { chamado, evento } = aplicarPausaDoPrazo(
      base,
      { ...base, status: "aguardando_usuario" },
      "2026-10-29T13:00:00.000Z",
    );
    expect(chamado.pausadoEm).toBe("2026-10-29T13:00:00.000Z");
    expect(evento).toBeNull();
  });

  it("sair de Aguardando empurra o prazo pelo tempo parado e gera prazo_ajustado público", () => {
    const { chamado, evento } = aplicarPausaDoPrazo(
      aguardando,
      { ...aguardando, status: "em_andamento" },
      "2026-10-29T19:00:00.000Z", // 6 h depois
    );
    expect(chamado.prazoSla).toBe("2026-11-02T21:00:00.000Z");
    expect(chamado.pausadoEm).toBeNull();
    expect(evento).toMatchObject({
      acao: "prazo_ajustado",
      autorId: null,
      publico: true,
      detalhe: { pausa_minutos: "360", prazo_anterior: "2026-11-02T15:00:00.000Z" },
    });
  });

  it("concluir direto de Aguardando também empurra; sem prazo, nada muda", () => {
    const concluido = aplicarPausaDoPrazo(
      aguardando,
      { ...aguardando, status: "concluido" },
      "2026-10-29T14:00:00.000Z",
    );
    expect(concluido.chamado.prazoSla).toBe("2026-11-02T16:00:00.000Z");
    const semPrazo = aplicarPausaDoPrazo(
      { ...aguardando, prazoSla: null },
      { ...aguardando, prazoSla: null, status: "em_andamento" },
      "2026-10-29T19:00:00.000Z",
    );
    expect(semPrazo.chamado.prazoSla).toBeNull();
    expect(semPrazo.evento).toBeNull();
  });

  it("prazo novo durante a espera recomeça a pausa", () => {
    const { chamado } = aplicarPausaDoPrazo(
      aguardando,
      { ...aguardando, prazoSla: "2026-11-05T15:00:00.000Z" },
      "2026-10-29T16:00:00.000Z",
    );
    expect(chamado.pausadoEm).toBe("2026-10-29T16:00:00.000Z");
  });
});
