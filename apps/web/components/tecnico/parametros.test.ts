import { describe, expect, it } from "vitest";
import { destinoBusca, lerFiltro, lerModo } from "./parametros";

describe("destinoBusca", () => {
  it("número abre o chamado direto (com ou sem #)", () => {
    expect(destinoBusca("42")).toBe("/atendimento/42");
    expect(destinoBusca(" #42 ")).toBe("/atendimento/42");
    expect(destinoBusca("042")).toBe("/atendimento/42");
  });

  it("texto filtra a lista pelo título", () => {
    expect(destinoBusca("impressora 3º")).toBe(
      "/atendimento?modo=lista&busca=impressora%203%C2%BA",
    );
  });

  it("vazio não faz nada", () => {
    expect(destinoBusca("   ")).toBeNull();
  });
});

describe("parâmetros da URL", () => {
  it("valores desconhecidos caem no padrão", () => {
    expect(lerModo("xyz")).toBe("lista");
    expect(lerModo("quadro")).toBe("quadro");
    expect(lerFiltro(null)).toBe("todos");
    expect(lerFiltro("sem_responsavel")).toBe("sem_responsavel");
  });
});
