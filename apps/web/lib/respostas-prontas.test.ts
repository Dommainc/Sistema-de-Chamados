import { describe, expect, it } from "vitest";
import { preencherNome } from "./respostas-prontas";

describe("preencherNome", () => {
  it("troca {nome} pelo primeiro nome", () => {
    expect(preencherNome("Oi, {nome}! Pode testar?", "Ana")).toBe("Oi, Ana! Pode testar?");
    expect(preencherNome("{nome}, vou acessar.", "Bruno")).toBe("Bruno, vou acessar.");
  });

  it("sem nome, tira o {nome} sem deixar vírgula sobrando", () => {
    expect(preencherNome("Oi, {nome}! Pode testar?", "")).toBe("Oi! Pode testar?");
    expect(preencherNome("{nome}, vou acessar.", "")).toBe("Vou acessar.");
    expect(preencherNome("Pronto, {nome}! Fiz o ajuste.", "")).toBe("Pronto! Fiz o ajuste.");
  });
});
