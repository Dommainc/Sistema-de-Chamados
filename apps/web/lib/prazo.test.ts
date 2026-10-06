import { describe, expect, it } from "vitest";
import {
  atalhosPrazo,
  compararPrazo,
  doCampoDataHora,
  paraCampoDataHora,
  progressoPrazo,
  situacaoPrazo,
  textoPrazo,
} from "./prazo";

// 06/10/2026 12:00 em São Paulo
const agora = new Date("2026-10-06T15:00:00Z");
const daqui = (min: number) => new Date(agora.getTime() + min * 60_000).toISOString();

describe("situacaoPrazo", () => {
  it("vencido, vence em menos de 1 h ou no prazo", () => {
    expect(situacaoPrazo(daqui(-1), agora)).toBe("vencido");
    expect(situacaoPrazo(daqui(50), agora)).toBe("vence_em_breve");
    expect(situacaoPrazo(daqui(59), agora)).toBe("vence_em_breve");
    expect(situacaoPrazo(daqui(60), agora)).toBe("no_prazo");
  });
});

describe("textoPrazo (textos do mockup)", () => {
  it("vencido", () => {
    expect(textoPrazo(daqui(-180), agora)).toBe("Venceu há 3 h");
    expect(textoPrazo(daqui(-40), agora)).toBe("Venceu há 40 min");
    expect(textoPrazo(daqui(-2 * 24 * 60), agora)).toBe("Venceu há 2 dias");
  });

  it("vence em breve", () => {
    expect(textoPrazo(daqui(50), agora)).toBe("Vence em 50 min");
  });

  it("no prazo mostra quando vence", () => {
    expect(textoPrazo("2026-10-06T14:30:00Z", new Date("2026-10-06T12:00:00Z"))).toBe(
      "Hoje, 11:30",
    );
    expect(textoPrazo("2026-10-07T20:00:00Z", agora)).toBe("Amanhã, 17:00");
    expect(textoPrazo("2026-10-13T12:00:00Z", agora)).toBe("13/10, 09:00");
  });
});

describe("progressoPrazo", () => {
  it("fração consumida entre abertura e prazo, limitada a 0–1", () => {
    expect(progressoPrazo(daqui(-60), daqui(60), agora)).toBeCloseTo(0.5);
    expect(progressoPrazo(daqui(-60), daqui(-10), agora)).toBe(1);
    expect(progressoPrazo(daqui(10), daqui(60), agora)).toBe(0);
  });
});

describe("prazo definido pela TI (ADR 0009)", () => {
  it("sem prazo: situação e texto próprios", () => {
    expect(situacaoPrazo(null, agora)).toBe("sem_prazo");
    expect(textoPrazo(null, agora)).toBe("Sem prazo");
  });

  it("campo data e hora sempre no horário de São Paulo", () => {
    expect(paraCampoDataHora("2026-10-08T21:00:00.000Z")).toBe("2026-10-08T18:00");
    expect(doCampoDataHora("2026-10-08T18:00")).toBe("2026-10-08T21:00:00.000Z");
    expect(doCampoDataHora("")).toBeNull();
    expect(doCampoDataHora("08/10/2026")).toBeNull();
  });

  it("atalhos: hoje 18h só se ainda não passou; 3 dias úteis pulam o fim de semana", () => {
    // Terça, 06/10/2026, 12:00 em São Paulo.
    const terca = atalhosPrazo(agora);
    expect(terca.map((a) => [a.rotulo, paraCampoDataHora(a.iso)])).toEqual([
      ["Hoje 18h", "2026-10-06T18:00"],
      ["Amanhã 12h", "2026-10-07T12:00"],
      ["Amanhã 18h", "2026-10-07T18:00"],
      ["Em 3 dias úteis", "2026-10-09T18:00"],
    ]);
    // Sexta, 09/10/2026, 19:00: hoje 18h já passou; 3 dias úteis = quarta 14/10.
    const sexta = atalhosPrazo(new Date("2026-10-09T22:00:00Z"));
    expect(sexta.map((a) => a.rotulo)).toEqual(["Amanhã 12h", "Amanhã 18h", "Em 3 dias úteis"]);
    expect(paraCampoDataHora(sexta[2].iso)).toBe("2026-10-14T18:00");
  });

  it("ordem: com prazo primeiro (mais próximo antes); sem prazo depois, o mais antigo antes", () => {
    const c = (id: string, prazoSla: string | null, criadoEm: string) => ({
      id,
      prazoSla,
      criadoEm,
    });
    const lista = [
      c("sem-novo", null, "2026-10-06T14:00:00Z"),
      c("prazo-longe", "2026-10-09T20:00:00Z", "2026-10-06T10:00:00Z"),
      c("sem-antigo", null, "2026-10-06T09:00:00Z"),
      c("prazo-perto", "2026-10-06T20:00:00Z", "2026-10-06T13:00:00Z"),
    ];
    expect([...lista].sort(compararPrazo).map((x) => x.id)).toEqual([
      "prazo-perto",
      "prazo-longe",
      "sem-antigo",
      "sem-novo",
    ]);
  });
});
