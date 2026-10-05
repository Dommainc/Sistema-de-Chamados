import { describe, expect, it } from "vitest";
import {
  formatarAtualizacao,
  formatarDataHora,
  formatarHora,
  formatarNumeroChamado,
  formatarPrevisao,
  formatarQuando,
  iniciais,
  maiuscula,
  tempoRelativo,
} from "./formato";

// 06/10/2026 (terça) 12:00 em São Paulo
const agora = new Date("2026-10-06T15:00:00Z");

describe("textos simples", () => {
  it("número do chamado", () => {
    expect(formatarNumeroChamado(42)).toBe("#42");
  });

  it("iniciais do nome", () => {
    expect(iniciais("Ana Souza")).toBe("AS");
    expect(iniciais("Rafael de Lima")).toBe("RL");
    expect(iniciais("Técnico")).toBe("T");
  });

  it("primeira letra maiúscula", () => {
    expect(maiuscula("hoje, 11:30")).toBe("Hoje, 11:30");
  });
});

describe("datas em America/Sao_Paulo", () => {
  it("converte UTC para o horário de São Paulo", () => {
    expect(formatarDataHora("2026-10-06T14:00:00Z")).toBe("06/10/2026 11:00");
    expect(formatarHora("2026-10-06T14:30:00Z")).toBe("11:30");
  });

  it("vira o dia pelo fuso de São Paulo, não pelo UTC", () => {
    expect(formatarDataHora("2026-10-07T01:30:00Z")).toBe("06/10/2026 22:30");
    expect(formatarQuando("2026-10-07T01:30:00Z", agora)).toBe("hoje, 22:30");
  });

  it("formatarQuando: hoje, amanhã, ontem ou data", () => {
    expect(formatarQuando("2026-10-06T14:30:00Z", agora)).toBe("hoje, 11:30");
    expect(formatarQuando("2026-10-07T20:00:00Z", agora)).toBe("amanhã, 17:00");
    expect(formatarQuando("2026-10-05T12:00:00Z", agora)).toBe("ontem, 09:00");
    expect(formatarQuando("2026-10-13T12:00:00Z", agora)).toBe("13/10, 09:00");
  });

  it("previsão de atendimento", () => {
    expect(formatarPrevisao("2026-10-06T14:30:00Z", agora)).toBe("hoje, até 11:30");
    expect(formatarPrevisao("2026-10-07T20:00:00Z", agora)).toBe("amanhã, até 17:00");
    expect(formatarPrevisao("2026-10-13T12:00:00Z", agora)).toBe("até 13/10 às 09:00");
  });
});

describe("tempo decorrido", () => {
  const antes = (ms: number) => new Date(agora.getTime() - ms).toISOString();

  it("tempoRelativo", () => {
    expect(tempoRelativo(antes(20_000), agora)).toBe("agora mesmo");
    expect(tempoRelativo(antes(12 * 60_000), agora)).toBe("há 12 min");
    expect(tempoRelativo(antes(2 * 3_600_000), agora)).toBe("há 2h");
    expect(tempoRelativo(antes(3 * 86_400_000), agora)).toBe("há 3 dias");
    expect(tempoRelativo(new Date(agora.getTime() + 60_000).toISOString(), agora)).toBe(
      "agora mesmo",
    );
  });

  it("formatarAtualizacao: há X hoje, ontem, ou dia da semana", () => {
    expect(formatarAtualizacao(antes(12 * 60_000), agora)).toBe("há 12 min");
    expect(formatarAtualizacao("2026-10-05T18:00:00Z", agora)).toBe("ontem");
    expect(formatarAtualizacao("2026-10-02T18:00:00Z", agora)).toBe("sex, 02/10");
  });
});
