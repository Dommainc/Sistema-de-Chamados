// Chamada à API da camada `real`: erros sempre pelo catálogo (nunca a mensagem crua).

import { afterEach, describe, expect, it, vi } from "vitest";
import { chamarApi, erroDaApi } from "./api";

afterEach(() => vi.restoreAllMocks());

describe("erroDaApi", () => {
  it("usa o código, os campos e o texto que vieram da API", () => {
    const erro = erroDaApi(422, {
      erro: {
        codigo: "CAMPO_OBRIGATORIO",
        mensagem: "Preencha o campo titulo para continuar.",
        campos: [{ campo: "titulo", mensagem: "Preencha o campo titulo para continuar." }],
      },
    });
    expect(erro).toMatchObject({ codigo: "CAMPO_OBRIGATORIO", campos: [{ campo: "titulo" }] });
    expect(erro.message).toBe("Preencha o campo titulo para continuar.");
  });

  it("erro inesperado mantém o ref da API (o usuário passa para a TI)", () => {
    const erro = erroDaApi(500, { erro: { codigo: "ERRO_INESPERADO", ref: "ERR-7K2Q" } });
    expect(erro.ref).toBe("ERR-7K2Q");
    expect(erro.message).toContain("ERR-7K2Q");
  });

  it("sem corpo conhecido: 401 → sessão expirada; 403 → sem permissão; resto → inesperado", () => {
    expect(erroDaApi(401, null).codigo).toBe("SESSAO_EXPIRADA");
    expect(erroDaApi(403, "html de proxy").codigo).toBe("SEM_PERMISSAO");
    expect(erroDaApi(502, { erro: { codigo: "INVENTADO" } }).codigo).toBe("ERRO_INESPERADO");
  });
});

describe("chamarApi", () => {
  it("manda o token e o corpo em JSON; 204 devolve vazio", async () => {
    const espiao = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response(null, { status: 204 }));
    await expect(
      chamarApi("/chamados/1/lido", { metodo: "POST", corpo: { a: 1 }, token: "tk" }),
    ).resolves.toBeUndefined();
    const [, init] = espiao.mock.calls[0];
    expect(init?.headers).toMatchObject({
      Authorization: "Bearer tk",
      "Content-Type": "application/json",
    });
    expect(init?.body).toBe('{"a":1}');
  });

  it("sem token → SESSAO_EXPIRADA sem nem chamar a rede", async () => {
    const espiao = vi.spyOn(globalThis, "fetch");
    await expect(chamarApi("/me", { token: null })).rejects.toMatchObject({
      codigo: "SESSAO_EXPIRADA",
    });
    expect(espiao).not.toHaveBeenCalled();
  });

  it("falha de rede vira o código pedido (ex.: mensagem não enviada)", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new TypeError("Failed to fetch"));
    await expect(
      chamarApi("/x", { token: "tk", erroDeRede: "MENSAGEM_NAO_ENVIADA" }),
    ).rejects.toMatchObject({ codigo: "MENSAGEM_NAO_ENVIADA" });
  });
});
