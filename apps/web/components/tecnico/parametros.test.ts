import { describe, expect, it } from "vitest";
import { destinoBusca, lerCategoria, lerFiltro, lerPrazo } from "./parametros";

describe("destinoBusca", () => {
  it("número abre o chamado direto (com ou sem #)", () => {
    expect(destinoBusca("42")).toBe("/atendimento/42");
    expect(destinoBusca(" #42 ")).toBe("/atendimento/42");
    expect(destinoBusca("042")).toBe("/atendimento/42");
  });

  it("texto filtra o quadro pelo título", () => {
    expect(destinoBusca("impressora 3º")).toBe("/atendimento?busca=impressora%203%C2%BA");
  });

  it("vazio não faz nada", () => {
    expect(destinoBusca("   ")).toBeNull();
  });
});

describe("parâmetros da URL", () => {
  it("valores desconhecidos caem no padrão", () => {
    expect(lerPrazo("vencido")).toBe("vencido");
    expect(lerPrazo("qualquer")).toBe("todos");
    expect(lerCategoria("3")).toBe(3);
    expect(lerCategoria("abc")).toBeNull();
    expect(lerFiltro(null)).toBe("todos");
    expect(lerFiltro("sem_responsavel")).toBe("sem_responsavel");
  });
});
