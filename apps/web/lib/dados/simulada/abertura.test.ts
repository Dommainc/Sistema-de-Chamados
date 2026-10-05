import { beforeEach, describe, expect, it } from "vitest";
import type { ArquivoNovo } from "@/lib/dados/tipos";
import { ErroApp } from "@/lib/erros/catalogo";
import { _reiniciarParaTestes, estadoInicial, gravarEstado, lerEstado } from "./armazenamento";
import { lerArquivo } from "./arquivos";
import { CATEGORIAS } from "./exemplos";
import { criarFonteSimulada } from "./index";
import { USUARIOS_SIMULADOS } from "./usuarios";

const [ANA, BRUNO, RAFAEL] = USUARIOS_SIMULADOS;
const INTERNET = CATEGORIAS.find((c) => c.nome === "Internet, rede ou VPN")!;

const RESPOSTAS_OK = {
  alcance: "O escritório ou a obra inteira",
  local: "Obra Recreio — container do canteiro",
  descricao: "Desde as 8h ninguém consegue acessar a internet.",
};

function arquivo(nome: string, mime: string, tamanho = 1000): ArquivoNovo {
  return {
    arquivo: new Blob(["x".repeat(10)], { type: mime }),
    nome,
    mime,
    tamanho,
    origem: "upload",
  };
}

beforeEach(() => {
  localStorage.clear();
  _reiniciarParaTestes();
  gravarEstado(estadoInicial(new Date("2026-10-06T15:00:00Z")));
});

describe("criarChamado", () => {
  it("abre como pendente, sem responsável, com o próximo número e prazo em horas úteis", async () => {
    const fonte = criarFonteSimulada(ANA.id);
    const maior = Math.max(...lerEstado().chamados.map((c) => c.id));
    const criado = await fonte.criarChamado({
      categoriaId: INTERNET.id,
      titulo: "Sem internet na obra Recreio",
      respostas: RESPOSTAS_OK,
      anexos: [],
    });
    expect(criado.id).toBe(maior + 1);

    const chamado = await fonte.obterChamado(criado.id);
    expect(chamado).toMatchObject({
      status: "pendente",
      responsavelId: null,
      solicitanteId: ANA.id,
      titulo: "Sem internet na obra Recreio",
      respostasForm: RESPOSTAS_OK,
    });
    expect(new Date(chamado.prazoSla).getTime()).toBeGreaterThan(
      new Date(chamado.criadoEm).getTime(),
    );
  });

  it("registra 'criado' no histórico", async () => {
    const criado = await criarFonteSimulada(ANA.id).criarChamado({
      categoriaId: INTERNET.id,
      titulo: "Sem internet",
      respostas: RESPOSTAS_OK,
      anexos: [],
    });
    const eventos = lerEstado().historico.filter((h) => h.chamadoId === criado.id);
    expect(eventos).toMatchObject([
      { acao: "criado", para: "pendente", publico: true, autorId: ANA.id },
    ]);
  });

  it("guarda os anexos do chamado (arquivo no IndexedDB/memória)", async () => {
    const criado = await criarFonteSimulada(ANA.id).criarChamado({
      categoriaId: INTERNET.id,
      titulo: "Sem internet",
      respostas: RESPOSTAS_OK,
      anexos: [{ ...arquivo("print-20261006-090000.png", "image/png"), origem: "colado" }],
    });
    const anexos = lerEstado().anexos.filter((a) => a.chamadoId === criado.id);
    expect(anexos).toMatchObject([
      { nome: "print-20261006-090000.png", origem: "colado", mensagemId: null, enviadoPor: ANA.id },
    ]);
    expect(await lerArquivo(anexos[0].id)).not.toBeNull();
  });

  it("campos obrigatórios vazios → CAMPO_OBRIGATORIO com a lista de campos e nada é gravado", async () => {
    const antes = lerEstado().chamados.length;
    const erro = await criarFonteSimulada(ANA.id)
      .criarChamado({ categoriaId: INTERNET.id, titulo: "", respostas: {}, anexos: [] })
      .catch((e: unknown) => e as ErroApp);
    expect(erro).toBeInstanceOf(ErroApp);
    expect((erro as ErroApp).campos.map((c) => c.campo)).toEqual([
      "titulo",
      "alcance",
      "local",
      "descricao",
    ]);
    expect(lerEstado().chamados.length).toBe(antes);
  });

  it("anexo inválido é recusado com a mensagem da API", async () => {
    const fonte = criarFonteSimulada(ANA.id);
    const base = { categoriaId: INTERNET.id, titulo: "Sem internet", respostas: RESPOSTAS_OK };
    await expect(
      fonte.criarChamado({ ...base, anexos: [arquivo("setup.exe", "application/x-msdownload")] }),
    ).rejects.toMatchObject({ codigo: "ANEXO_TIPO_INVALIDO" });
    await expect(
      fonte.criarChamado({
        ...base,
        anexos: [arquivo("video.png", "image/png", 11 * 1024 * 1024)],
      }),
    ).rejects.toMatchObject({ codigo: "ANEXO_MUITO_GRANDE" });
  });

  it("o novo chamado só aparece para o dono e para a TI", async () => {
    const criado = await criarFonteSimulada(ANA.id).criarChamado({
      categoriaId: INTERNET.id,
      titulo: "Sem internet",
      respostas: RESPOSTAS_OK,
      anexos: [],
    });
    await expect(criarFonteSimulada(BRUNO.id).obterChamado(criado.id)).rejects.toMatchObject({
      codigo: "SEM_PERMISSAO",
    });
    const fila = await criarFonteSimulada(RAFAEL.id).listarChamados({ escopo: "fila" });
    expect(fila.some((c) => c.id === criado.id)).toBe(true);
  });

  it("técnico também abre chamado (ADR 0005)", async () => {
    const criado = await criarFonteSimulada(RAFAEL.id).criarChamado({
      categoriaId: INTERNET.id,
      titulo: "Wi-Fi da sala de reunião",
      respostas: RESPOSTAS_OK,
      anexos: [],
    });
    expect((await criarFonteSimulada(RAFAEL.id).obterChamado(criado.id)).solicitanteId).toBe(
      RAFAEL.id,
    );
  });
});

describe("calcularPrevisao", () => {
  it("devolve um instante futuro", async () => {
    const previsao = await criarFonteSimulada(ANA.id).calcularPrevisao(INTERNET.id);
    expect(new Date(previsao).getTime()).toBeGreaterThan(Date.now());
  });
});
