import { describe, expect, it } from "vitest";
import {
  caminhosAbertura,
  comReferente,
  decidirRota,
  destinoLinkUniversal,
  inicioDoPapel,
} from "./rotas";

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

describe("abrir chamado", () => {
  it("/abrir é do portal: TI é levada para a própria área", () => {
    expect(decidirRota("/abrir/3", "solicitante")).toEqual({ tipo: "seguir" });
    expect(decidirRota("/abrir/pronto/46", "ti")).toEqual({
      tipo: "redirecionar",
      para: "/atendimento",
    });
  });

  it("cada papel abre chamado na sua área", () => {
    expect(caminhosAbertura("solicitante").formulario(3)).toBe("/abrir/3");
    expect(caminhosAbertura("solicitante").acompanhar(46)).toBe("/meus-chamados/46");
    expect(caminhosAbertura("ti").formulario(3)).toBe("/atendimento/novo/3");
    expect(caminhosAbertura("ti").pronto(46)).toBe("/atendimento/novo/pronto/46");
  });

  it("mantém o chamado de referência", () => {
    expect(comReferente("/abrir/3", 42)).toBe("/abrir/3?referente=42");
    expect(comReferente("/abrir/3", null)).toBe("/abrir/3");
  });
});
