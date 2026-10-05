import { describe, expect, it } from "vitest";
import {
  formatarDataHora,
  formatarNumeroChamado,
  formatarPrevisao,
  tempoRelativo,
} from "./formato";

describe("formatarNumeroChamado", () => {
  it("exibe como #42", () => {
    expect(formatarNumeroChamado(42)).toBe("#42");
    expect(formatarNumeroChamado(1)).toBe("#1");
  });
});

describe("datas em America/Sao_Paulo", () => {
  it("converte UTC para o horário de São Paulo (dd/MM/yyyy HH:mm)", () => {
    expect(formatarDataHora("2026-10-06T14:00:00Z")).toBe("06/10/2026 11:00");
  });

  it("vira o dia corretamente perto da meia-noite UTC", () => {
    expect(formatarDataHora("2026-10-07T01:30:00Z")).toBe("06/10/2026 22:30");
  });

  it("formata a previsão de atendimento", () => {
    expect(formatarPrevisao("2026-10-06T14:00:00Z")).toBe("06/10 às 11:00");
  });
});

describe("tempoRelativo", () => {
  const agora = new Date("2026-10-06T15:00:00Z");
  const antes = (ms: number) => new Date(agora.getTime() - ms).toISOString();

  it("descreve o tempo em linguagem simples", () => {
    expect(tempoRelativo(antes(20_000), agora)).toBe("agora mesmo");
    expect(tempoRelativo(antes(5 * 60_000), agora)).toBe("há 5 min");
    expect(tempoRelativo(antes(2 * 3_600_000), agora)).toBe("há 2h");
    expect(tempoRelativo(antes(26 * 3_600_000), agora)).toBe("há 1 dia");
    expect(tempoRelativo(antes(3 * 86_400_000), agora)).toBe("há 3 dias");
  });

  it("data no futuro não fica negativa", () => {
    expect(tempoRelativo(new Date(agora.getTime() + 60_000).toISOString(), agora)).toBe(
      "agora mesmo",
    );
  });
});
