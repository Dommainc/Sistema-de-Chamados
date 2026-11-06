// Configurações no modo de demonstração (ADR 0022): as mesmas regras da API.

import { beforeEach, describe, expect, it } from "vitest";
import type { OpcaoEditada } from "@/lib/dados/tipos";
import { _reiniciarParaTestes, estadoInicial, gravarEstado } from "./armazenamento";
import { criarFonteSimulada } from "./index";
import { USUARIOS_SIMULADOS } from "./usuarios";

const [ANA, , RAFAEL] = USUARIOS_SIMULADOS;

beforeEach(() => {
  localStorage.clear();
  _reiniciarParaTestes();
  gravarEstado(estadoInicial());
});

async function sistema() {
  const dados = await criarFonteSimulada(RAFAEL.id).obterConfiguracoes();
  return dados.campos.find((c) => c.chave === "sistema")!;
}

const comoEditadas = (opcoes: string[], cores: Partial<Record<string, string>>): OpcaoEditada[] =>
  opcoes.map((nome) => ({ nome, cor: (cores[nome] ?? null) as OpcaoEditada["cor"], antigo: nome }));

describe("configurações (modo de demonstração)", () => {
  it("só a TI abre e grava", async () => {
    const ana = criarFonteSimulada(ANA.id);
    await expect(ana.obterConfiguracoes()).rejects.toMatchObject({ codigo: "SEM_PERMISSAO" });
    await expect(ana.salvarExpediente("07:00", "19:00")).rejects.toMatchObject({
      codigo: "SEM_PERMISSAO",
    });
  });

  it("renomear o Sienge leva o módulo junto; o formulário e o registro mostram a mudança", async () => {
    const ti = criarFonteSimulada(RAFAEL.id);
    const campo = await sistema();
    expect(campo.travadas.sort()).toEqual(["CVCRM", "Sienge"]);
    const editadas = comoEditadas(campo.opcoes, campo.cores).map((o) =>
      o.nome === "Sienge" ? { ...o, nome: "Sienge ERP" } : o,
    );
    await ti.salvarOpcoes(campo.id, [
      ...editadas,
      { nome: "Paytrack 2", cor: "azul", antigo: null },
    ]);

    const campos = await ti.listarCamposForm(campo.categoriaId);
    expect(campos.find((c) => c.chave === "sistema")!.opcoes).toContain("Sienge ERP");
    expect(campos.find((c) => c.chave === "modulo_sienge")!.mostrarSe).toEqual({
      campo: "sistema",
      igual: "Sienge ERP",
    });
    const [ultima] = (await ti.obterConfiguracoes()).alteracoes;
    expect(ultima).toMatchObject({
      area: "formularios",
      autorId: RAFAEL.id,
      resumo: "Qual sistema?: + Paytrack 2 · Sienge → Sienge ERP",
    });
  });

  it("não tira opção que abre pergunta", async () => {
    const campo = await sistema();
    const semCvcrm = comoEditadas(campo.opcoes, campo.cores).filter((o) => o.nome !== "CVCRM");
    await expect(
      criarFonteSimulada(RAFAEL.id).salvarOpcoes(campo.id, semCvcrm),
    ).rejects.toMatchObject({ codigo: "OPCAO_COM_PERGUNTAS" });
  });

  it("assunto desativado some da tela inicial; resposta desativada some do chat", async () => {
    const ti = criarFonteSimulada(RAFAEL.id);
    const { assuntos, respostas } = await ti.obterConfiguracoes();
    const microsoft = assuntos.find((a) => a.nome === "Microsoft")!;
    await ti.editarAssunto(microsoft.id, { ativo: false });
    expect((await ti.listarCategorias()).map((c) => c.nome)).not.toContain("Microsoft");
    await ti.editarRespostaPronta(respostas[0]!.id, { ativo: false });
    expect((await ti.listarRespostasProntas()).map((r) => r.id)).not.toContain(respostas[0]!.id);
    await expect(
      ti.criarRespostaPronta({ titulo: respostas[1]!.titulo.toUpperCase(), texto: "x" }),
    ).rejects.toMatchObject({ codigo: "NOME_DUPLICADO" });
  });

  it("assunto novo aparece na tela inicial com a pergunta de descrição", async () => {
    const ti = criarFonteSimulada(RAFAEL.id);
    await ti.criarAssunto({
      nome: "Compras de TI",
      nomeCurto: "Compras",
      descricao: "Pedir equipamento",
      icone: "package",
    });
    const nova = (await ti.listarCategorias()).find((c) => c.nome === "Compras de TI")!;
    expect(nova).toMatchObject({ nomeCurto: "Compras", icone: "package" });
    expect((await ti.listarCamposForm(nova.id)).map((c) => c.chave)).toEqual(["descricao"]);
  });

  it("feriado repetido é recusado; expediente vale para o Dashboard", async () => {
    const ti = criarFonteSimulada(RAFAEL.id);
    await expect(
      ti.criarFeriado({ data: "2026-12-25", nome: "Natal", escopo: "nacional" }),
    ).rejects.toMatchObject({ codigo: "FERIADO_DUPLICADO" });
    await ti.criarFeriado({ data: "2028-12-25", nome: "Natal", escopo: "nacional" });
    await expect(ti.salvarExpediente("20:00", "08:00")).rejects.toMatchObject({
      codigo: "EXPEDIENTE_INVALIDO",
    });
    await ti.salvarExpediente("07:00", "19:00");
    const { expediente } = await ti.listarDadosMetricas("2026-01-01", "2026-02-01");
    expect(expediente).toMatchObject({ inicio: "07:00", fim: "19:00" });
    expect(expediente.feriados).toContain("2028-12-25");
  });
});
