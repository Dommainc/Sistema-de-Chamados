import { afterEach, describe, expect, it, vi } from "vitest";
import {
  CATALOGO,
  ErroApp,
  gerarRefErro,
  mensagemErro,
  paraErroApp,
  type CodigoErro,
} from "./catalogo";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("catálogo de erros", () => {
  it("tem os 14 códigos da seção 8 do escopo", () => {
    expect(Object.keys(CATALOGO).sort()).toEqual(
      [
        "CAMPO_OBRIGATORIO",
        "ANEXO_MUITO_GRANDE",
        "ANEXO_TIPO_INVALIDO",
        "COLAR_SEM_IMAGEM",
        "UPLOAD_FALHOU",
        "SESSAO_EXPIRADA",
        "SEM_PERMISSAO",
        "CHAMADO_NAO_ENCONTRADO",
        "TRANSICAO_INVALIDA",
        "MOTIVO_OBRIGATORIO",
        "CANCELAMENTO_NAO_PERMITIDO",
        "MENSAGEM_NAO_ENVIADA",
        "SEM_CONEXAO",
        "ERRO_INESPERADO",
      ].sort(),
    );
  });

  it("preenche os placeholders", () => {
    expect(mensagemErro("CAMPO_OBRIGATORIO", { campo: "Departamento" })).toBe(
      "Preencha o campo Departamento para continuar.",
    );
    expect(mensagemErro("CHAMADO_NAO_ENCONTRADO", { numero: "42" })).toContain("#42");
    expect(mensagemErro("TRANSICAO_INVALIDA", { de: "Concluído", para: "Pendente" })).toBe(
      "Não é possível mudar de Concluído para Pendente.",
    );
  });

  it("nenhuma mensagem fica com placeholder sobrando", () => {
    for (const codigo of Object.keys(CATALOGO) as CodigoErro[]) {
      const texto = mensagemErro(codigo, {
        campo: "X",
        numero: "1",
        de: "A",
        para: "B",
        ref: "ERR-0000",
      });
      expect(texto).not.toMatch(/\{\w+\}/);
    }
  });
});

describe("ErroApp", () => {
  it("usa a mensagem do catálogo", () => {
    const erro = new ErroApp("SEM_PERMISSAO");
    expect(erro.codigo).toBe("SEM_PERMISSAO");
    expect(erro.message).toBe(CATALOGO.SEM_PERMISSAO);
    expect(erro.ref).toBeNull();
  });

  it("erro inesperado ganha referência ERR-XXXX na mensagem", () => {
    const erro = new ErroApp("ERRO_INESPERADO");
    expect(erro.ref).toMatch(/^ERR-[0-9A-F]{4}$/);
    expect(erro.message).toContain(erro.ref!);
  });

  it("gera referências no formato curto", () => {
    expect(gerarRefErro()).toMatch(/^ERR-[0-9A-F]{4}$/);
  });
});

describe("paraErroApp", () => {
  it("mantém ErroApp como está", () => {
    const erro = new ErroApp("MOTIVO_OBRIGATORIO");
    expect(paraErroApp(erro)).toBe(erro);
  });

  it("nunca vaza a mensagem técnica original", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const convertido = paraErroApp(new Error('duplicate key value violates unique constraint "x"'));
    expect(convertido.codigo).toBe("ERRO_INESPERADO");
    expect(convertido.message).not.toContain("duplicate");
    expect(console.error).toHaveBeenCalled();
  });
});
