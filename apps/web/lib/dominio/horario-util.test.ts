// Mesmos casos do teste do banco (supabase/tests/database/001_rls_e_regras.test.sql).

import { describe, expect, it } from "vitest";
import { adicionarHorasUteis, horasUteisEntre, type ExpedienteConfig } from "./horario-util";

const CONFIG: ExpedienteConfig = {
  inicio: "08:00",
  fim: "18:00",
  feriados: new Set(["2026-10-12"]),
};

const sp = (texto: string) => new Date(`${texto}-03:00`);

describe("adicionarHorasUteis", () => {
  it("sexta 17h + 2h úteis = segunda 9h", () => {
    expect(adicionarHorasUteis(sp("2026-10-02T17:00:00"), 2, CONFIG)).toEqual(
      sp("2026-10-05T09:00:00"),
    );
  });

  it("feriado (12/10) é pulado", () => {
    expect(adicionarHorasUteis(sp("2026-10-09T17:00:00"), 2, CONFIG)).toEqual(
      sp("2026-10-13T09:00:00"),
    );
  });

  it("antes do expediente, o prazo começa às 8h", () => {
    expect(adicionarHorasUteis(sp("2026-10-05T07:00:00"), 3, CONFIG)).toEqual(
      sp("2026-10-05T11:00:00"),
    );
  });

  it("depois do expediente, começa no próximo dia útil", () => {
    expect(adicionarHorasUteis(sp("2026-10-05T19:30:00"), 1, CONFIG)).toEqual(
      sp("2026-10-06T09:00:00"),
    );
  });

  it("dentro do expediente e no mesmo dia", () => {
    expect(adicionarHorasUteis(sp("2026-10-06T09:30:00"), 2, CONFIG)).toEqual(
      sp("2026-10-06T11:30:00"),
    );
  });

  it("SLA de 40 h atravessa a semana", () => {
    // seg 10:00 + 40 h úteis (4 dias de 10 h) = sex 10:00
    expect(adicionarHorasUteis(sp("2026-10-05T10:00:00"), 40, CONFIG)).toEqual(
      sp("2026-10-09T10:00:00"),
    );
  });

  it("horas zero ou negativas não mudam o instante", () => {
    const inicio = sp("2026-10-05T10:00:00");
    expect(adicionarHorasUteis(inicio, 0, CONFIG)).toEqual(inicio);
  });
});

describe("horasUteisEntre", () => {
  it("sexta 17h → segunda 9h = 2 h úteis (fim de semana não conta)", () => {
    expect(horasUteisEntre(sp("2026-10-02T17:00:00"), sp("2026-10-05T09:00:00"), CONFIG)).toBe(2);
  });

  it("fora do expediente não conta; feriado também não", () => {
    expect(horasUteisEntre(sp("2026-10-06T19:00:00"), sp("2026-10-07T07:00:00"), CONFIG)).toBe(0);
    // 09/10 (sex) 17h → 13/10 (ter) 9h: 1 h na sexta + 12/10 feriado + 1 h na terça.
    expect(horasUteisEntre(sp("2026-10-09T17:00:00"), sp("2026-10-13T09:00:00"), CONFIG)).toBe(2);
  });

  it("mesmo dia e ordem invertida", () => {
    expect(horasUteisEntre(sp("2026-10-06T09:30:00"), sp("2026-10-06T11:00:00"), CONFIG)).toBe(1.5);
    expect(horasUteisEntre(sp("2026-10-06T11:00:00"), sp("2026-10-06T09:00:00"), CONFIG)).toBe(0);
  });

  it("é o inverso de adicionarHorasUteis", () => {
    const inicio = sp("2026-10-08T15:20:00");
    const fim = adicionarHorasUteis(inicio, 13.5, CONFIG);
    expect(horasUteisEntre(inicio, fim, CONFIG)).toBeCloseTo(13.5);
  });
});
