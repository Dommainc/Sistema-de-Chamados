import { describe, expect, it } from "vitest";
import { decidirRota, destinoLinkUniversal, inicioDoPapel } from "./rotas";

describe("decidirRota", () => {
  it("sem sessão vai para /login, exceto na própria tela de login", () => {
    expect(decidirRota("/", null)).toEqual({ tipo: "redirecionar", para: "/login" });
    expect(decidirRota("/atendimento", null)).toEqual({ tipo: "redirecionar", para: "/login" });
    expect(decidirRota("/meus-chamados/42", null)).toEqual({
      tipo: "redirecionar",
      para: "/login",
    });
    expect(decidirRota("/login", null)).toEqual({ tipo: "seguir" });
  });

  it("logado que abre /login vai para a sua área", () => {
    expect(decidirRota("/login", "solicitante")).toEqual({ tipo: "redirecionar", para: "/" });
    expect(decidirRota("/login", "ti")).toEqual({ tipo: "redirecionar", para: "/atendimento" });
  });

  it("solicitante usa o portal e é barrado na área técnica", () => {
    for (const caminho of ["/", "/meus-chamados", "/meus-chamados/42", "/primeiro-acesso"]) {
      expect(decidirRota(caminho, "solicitante")).toEqual({ tipo: "seguir" });
    }
    for (const caminho of ["/atendimento", "/atendimento/42", "/atendimento/novo"]) {
      expect(decidirRota(caminho, "solicitante")).toEqual({
        tipo: "redirecionar",
        para: "/sem-acesso",
      });
    }
  });

  it("TI usa a área técnica e é levada para lá se abrir o portal", () => {
    for (const caminho of ["/atendimento", "/atendimento/42", "/atendimento/novo"]) {
      expect(decidirRota(caminho, "ti")).toEqual({ tipo: "seguir" });
    }
    for (const caminho of ["/", "/meus-chamados", "/meus-chamados/42", "/primeiro-acesso"]) {
      expect(decidirRota(caminho, "ti")).toEqual({ tipo: "redirecionar", para: "/atendimento" });
    }
  });

  it("link universal e /sem-acesso ficam liberados para os dois papéis", () => {
    for (const papel of ["solicitante", "ti"] as const) {
      expect(decidirRota("/chamados/42", papel)).toEqual({ tipo: "seguir" });
      expect(decidirRota("/sem-acesso", papel)).toEqual({ tipo: "seguir" });
    }
  });

  it("não confunde prefixos parecidos", () => {
    expect(decidirRota("/atendimentos-antigos", "solicitante")).toEqual({ tipo: "seguir" });
    expect(decidirRota("/meus-chamadosx", "ti")).toEqual({ tipo: "seguir" });
  });
});

describe("destinoLinkUniversal", () => {
  it("leva cada papel para a sua tela do chamado", () => {
    expect(destinoLinkUniversal("42", "solicitante")).toBe("/meus-chamados/42");
    expect(destinoLinkUniversal("42", "ti")).toBe("/atendimento/42");
  });

  it("número inválido volta para o início", () => {
    expect(destinoLinkUniversal("abc", "solicitante")).toBe("/");
    expect(destinoLinkUniversal("42; drop", "ti")).toBe("/atendimento");
  });

  it("início de cada papel", () => {
    expect(inicioDoPapel("solicitante")).toBe("/");
    expect(inicioDoPapel("ti")).toBe("/atendimento");
  });
});
