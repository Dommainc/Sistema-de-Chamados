import { describe, expect, it } from "vitest";
import { ErroApp } from "@/lib/erros/catalogo";
import { validarFormulario } from "./formulario";
import type { CampoForm, TipoCampo } from "./tipos";

function campo(
  chave: string,
  tipo: TipoCampo,
  obrigatorio = true,
  opcoes: string[] = [],
  ordem = 10,
): CampoForm {
  return {
    id: 1,
    categoriaId: 1,
    chave,
    label: `Rótulo ${chave}`,
    tipo,
    obrigatorio,
    opcoes,
    cores: {},
    ajuda: null,
    ordem,
  };
}

function erroDe(fn: () => unknown): ErroApp {
  try {
    fn();
  } catch (e) {
    return e as ErroApp;
  }
  throw new Error("esperava erro");
}

const CAMPOS = [
  campo("alcance", "selecao", true, ["Só eu", "O escritório ou a obra inteira"], 10),
  campo("local", "texto", true, [], 20),
  campo("descricao", "texto_longo", true, [], 100),
  campo("patrimonio", "texto", false, [], 30),
];

describe("validarFormulario", () => {
  it("aceita respostas válidas, apara espaços e ignora chaves desconhecidas", () => {
    const r = validarFormulario(CAMPOS, "  Sem internet na obra  ", {
      alcance: "O escritório ou a obra inteira",
      local: " Obra Recreio ",
      descricao: "Roteador piscando",
      inventada: "x",
    });
    expect(r.titulo).toBe("Sem internet na obra");
    expect(r.respostas).toEqual({
      alcance: "O escritório ou a obra inteira",
      local: "Obra Recreio",
      descricao: "Roteador piscando",
    });
  });

  it("aponta cada campo obrigatório vazio, com o rótulo na mensagem", () => {
    const erro = erroDe(() => validarFormulario(CAMPOS, "", {}));
    expect(erro.codigo).toBe("CAMPO_OBRIGATORIO");
    expect(erro.campos.map((c) => c.campo)).toEqual(["titulo", "alcance", "local", "descricao"]);
    expect(erro.campos[0].mensagem).toBe("Preencha o campo Resumo do problema para continuar.");
    expect(erro.campos[1].mensagem).toBe("Preencha o campo Rótulo alcance para continuar.");
  });

  it("campo opcional vazio não dá erro", () => {
    const r = validarFormulario(CAMPOS, "Título ok", {
      alcance: "Só eu",
      local: "Sede",
      descricao: "x",
      patrimonio: "",
    });
    expect(r.respostas).not.toHaveProperty("patrimonio");
  });

  it("opção fora da lista é inválida", () => {
    const erro = erroDe(() =>
      validarFormulario(CAMPOS, "Título ok", { alcance: "Talvez", local: "a", descricao: "b" }),
    );
    expect(erro.campos.map((c) => c.campo)).toEqual(["alcance"]);
  });

  it("converte número, data, múltipla seleção e sim/não", () => {
    const campos = [
      campo("qtd", "numero"),
      campo("inicio", "data"),
      campo("itens", "multipla_selecao", true, ["Mouse", "Monitor"]),
      campo("urgente", "sim_nao"),
    ];
    const r = validarFormulario(campos, "Pedido", {
      qtd: "2,5",
      inicio: "2026-10-13",
      itens: ["Monitor"],
      urgente: "sim",
    });
    expect(r.respostas).toEqual({
      qtd: 2.5,
      inicio: "2026-10-13",
      itens: ["Monitor"],
      urgente: true,
    });
  });

  it("recusa número, data e opções inválidos", () => {
    const campos = [
      campo("qtd", "numero"),
      campo("inicio", "data"),
      campo("itens", "multipla_selecao", true, ["Mouse"]),
      campo("urgente", "sim_nao"),
    ];
    const erro = erroDe(() =>
      validarFormulario(campos, "Pedido", {
        qtd: "dois",
        inicio: "2026-02-30",
        itens: ["Teclado"],
        urgente: "talvez",
      }),
    );
    expect(erro.campos).toHaveLength(4);
  });

  it("'Não' em sim/não é uma resposta, não um campo vazio", () => {
    const r = validarFormulario([campo("urgente", "sim_nao")], "Pedido", { urgente: false });
    expect(r.respostas.urgente).toBe(false);
  });
});
