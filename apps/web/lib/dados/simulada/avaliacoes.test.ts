// Pesquisa de satisfação no modo de demonstração (ADR 0015): as mesmas regras da API.

import { beforeEach, describe, expect, it } from "vitest";
import { _reiniciarParaTestes, estadoInicial, gravarEstado, lerEstado } from "./armazenamento";
import { criarFonteSimulada } from "./index";
import { USUARIOS_SIMULADOS } from "./usuarios";

const [ANA, BRUNO, RAFAEL] = USUARIOS_SIMULADOS;

beforeEach(() => {
  localStorage.clear();
  _reiniciarParaTestes();
  gravarEstado(estadoInicial());
});

describe("avaliarChamado", () => {
  it("a Ana avalia o #35 (concluído) uma vez; vai para o histórico e a TI vê", async () => {
    const ana = criarFonteSimulada(ANA.id);
    expect(await ana.obterAvaliacao(35)).toBeNull();
    const avaliacao = await ana.avaliarChamado(35, 5, "  Muito bom  ");
    expect(avaliacao).toMatchObject({ chamadoId: 35, nota: 5, comentario: "Muito bom" });
    await expect(ana.avaliarChamado(35, 4)).rejects.toMatchObject({
      codigo: "AVALIACAO_JA_ENVIADA",
    });
    expect(lerEstado().historico.at(-1)).toMatchObject({ acao: "avaliado", publico: true });
    expect(await criarFonteSimulada(RAFAEL.id).obterAvaliacao(35)).toMatchObject({ nota: 5 });
    expect((await ana.listarAvaliacoes()).map((a) => a.chamadoId)).toEqual([35]);
  });

  it("só concluído, só o solicitante; nota 1 ou 2 exige o texto", async () => {
    const ana = criarFonteSimulada(ANA.id);
    await expect(ana.avaliarChamado(41, 5)).rejects.toMatchObject({
      codigo: "AVALIACAO_INDISPONIVEL",
    });
    await expect(criarFonteSimulada(RAFAEL.id).avaliarChamado(35, 5)).rejects.toMatchObject({
      codigo: "SEM_PERMISSAO",
    });
    await expect(criarFonteSimulada(BRUNO.id).avaliarChamado(35, 5)).rejects.toMatchObject({
      codigo: "SEM_PERMISSAO",
    });
    const erro = await ana.avaliarChamado(35, 2, " ").catch((e: unknown) => e);
    expect(erro).toMatchObject({ codigo: "CAMPO_OBRIGATORIO" });
    expect((erro as { campos: { campo: string }[] }).campos[0].campo).toBe("comentario");
    expect(await ana.obterAvaliacao(35)).toBeNull();
  });

  it("exemplos: há avaliações nos concluídos antigos (para o Dashboard) e a TI vê todas", async () => {
    const todas = await criarFonteSimulada(RAFAEL.id).listarAvaliacoes();
    expect(todas.length).toBeGreaterThan(5);
    expect(todas.every((a) => a.nota >= 1 && a.nota <= 5)).toBe(true);
    expect(todas.filter((a) => a.nota <= 2).every((a) => (a.comentario ?? "").length >= 3)).toBe(
      true,
    );
  });
});
