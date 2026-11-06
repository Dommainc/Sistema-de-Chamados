import { describe, expect, it } from "vitest";
import type { OpcaoEditada } from "@/lib/dados/tipos";
import { ErroApp } from "@/lib/erros/catalogo";
import {
  compararOpcoes,
  mudancaVazia,
  normalizarOpcoes,
  resumoMudanca,
  validarExpediente,
} from "./configuracoes";

// Mesmos casos de apps/api/tests/test_configuracoes.py.
const ANTES = ["Sienge", "KickIn", "Mapfry", "Não se aplica"];
const CORES = {
  Sienge: "vermelho",
  KickIn: "rosa",
  Mapfry: "laranja-claro",
  "Não se aplica": "cinza",
} as const;

const op = (nome: string, cor: OpcaoEditada["cor"] = null, antigo: string | null = null) => ({
  nome,
  cor,
  antigo,
});

function erroDe(fn: () => unknown): ErroApp {
  try {
    fn();
  } catch (e) {
    if (e instanceof ErroApp) return e;
  }
  throw new Error("não lançou ErroApp");
}

describe("configurações: opções", () => {
  it("apara espaços e recusa repetida ignorando maiúsculas", () => {
    expect(normalizarOpcoes([op("  Sienge  ERP "), op("Docusign")]).map((o) => o.nome)).toEqual([
      "Sienge ERP",
      "Docusign",
    ]);
    const erro = erroDe(() => normalizarOpcoes([op("Sienge"), op("sienge")]));
    expect(erro.codigo).toBe("NOME_DUPLICADO");
    expect(erro.campos[0]?.campo).toBe("opcoes.1");
  });

  it("recusa lista vazia, nome vazio, nome longo e cor fora da paleta", () => {
    expect(erroDe(() => normalizarOpcoes([])).codigo).toBe("OPCOES_VAZIAS");
    expect(erroDe(() => normalizarOpcoes([op("  ")])).codigo).toBe("CAMPO_OBRIGATORIO");
    expect(erroDe(() => normalizarOpcoes([op("x".repeat(81))])).codigo).toBe("TEXTO_LONGO_DEMAIS");
    expect(
      erroDe(() => normalizarOpcoes([{ nome: "X", cor: "fucsia" as never, antigo: null }])).codigo,
    ).toBe("CAMPO_OBRIGATORIO");
  });

  it("compara: renomeia, tira e adiciona, com o resumo do registro", () => {
    const m = compararOpcoes(ANTES, CORES, [
      op("Sienge", "vermelho", "Sienge"),
      op("Quickin", "rosa", "KickIn"),
      op("Paytrack", "verde"),
      op("Não se aplica", "cinza", "Não se aplica"),
    ]);
    expect(m.adicionadas).toEqual(["Paytrack"]);
    expect(m.removidas).toEqual(["Mapfry"]);
    expect(m.renomeadas).toEqual([["KickIn", "Quickin"]]);
    expect(m.coresMudaram || m.ordemMudou).toBe(false);
    expect(resumoMudanca(m)).toBe("+ Paytrack · − Mapfry · KickIn → Quickin");
  });

  it("percebe só a ordem ou só a cor; lista igual não muda nada", () => {
    const iguais = ANTES.map((n) => op(n, CORES[n as keyof typeof CORES], n));
    expect(mudancaVazia(compararOpcoes(ANTES, CORES, iguais))).toBe(true);
    expect(
      compararOpcoes(ANTES, CORES, [iguais[1]!, iguais[0]!, ...iguais.slice(2)]).ordemMudou,
    ).toBe(true);
    const cor = compararOpcoes(ANTES, CORES, [op("Sienge", "azul", "Sienge"), ...iguais.slice(1)]);
    expect(cor.coresMudaram && !cor.ordemMudou).toBe(true);
  });
});

describe("configurações: expediente", () => {
  it("aceita HH:MM com fim depois do início", () => {
    expect(() => validarExpediente("08:00", "20:00")).not.toThrow();
    expect(erroDe(() => validarExpediente("20:00", "08:00")).codigo).toBe("EXPEDIENTE_INVALIDO");
    expect(erroDe(() => validarExpediente("8h", "20:00")).codigo).toBe("CAMPO_OBRIGATORIO");
  });
});
