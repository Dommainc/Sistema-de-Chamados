import { describe, expect, it } from "vitest";
import { progressoPrazo, situacaoPrazo, textoPrazo } from "./prazo";

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
