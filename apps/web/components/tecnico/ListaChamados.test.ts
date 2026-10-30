import { tempoDoChamado } from "./CartaoChamado";
import { describe, expect, it } from "vitest";
import type { PerfilPublico } from "@/lib/dados/tipos";
import type { Chamado } from "@/lib/dominio/tipos";
import type { DadosCartao } from "./CartaoChamado";
import { agrupar, ordenar } from "./ListaChamados";
import { lerAgrupamento, lerOrdem, lerVisao } from "./parametros";
import type { ColunaQuadro } from "./quadro";

const rafael: PerfilPublico = { id: "r", nome: "Rafael Lima", departamento: "TI", papel: "ti" };
const ana: PerfilPublico = { id: "a", nome: "Ana Souza", departamento: "TI", papel: "ti" };

function linha(
  id: number,
  coluna: ColunaQuadro,
  prazo: string | null,
  responsavel?: PerfilPublico,
  categoriaId = 1,
): DadosCartao {
  const chamado = { id, titulo: `#${id}`, categoriaId, prazoSla: prazo } as Chamado;
  return {
    chamado,
    coluna,
    solicitante: undefined,
    responsavel,
    assunto: "x",
    naoLidas: 0,
    transferidoPor: undefined,
    sistema: null,
  };
}

const vazio = (): Record<ColunaQuadro, DadosCartao[]> => ({
  novos: [],
  transferidos: [],
  em_atendimento: [],
  aguardando: [],
  concluidos: [],
  cancelados: [],
});

describe("Lista (layout novo, parte 2)", () => {
  it("agrupa por status na ordem do quadro e esconde grupos vazios", () => {
    const porColuna = {
      ...vazio(),
      novos: [linha(1, "novos", null)],
      em_atendimento: [linha(2, "em_atendimento", null, rafael)],
    };
    expect(agrupar(porColuna, "status", []).map((g) => g.titulo)).toEqual([
      "Novos",
      "Em atendimento",
    ]);
  });

  it("agrupa por responsável em ordem alfabética, com Sem responsável no fim", () => {
    const porColuna = {
      ...vazio(),
      novos: [linha(1, "novos", null)],
      em_atendimento: [
        linha(2, "em_atendimento", null, rafael),
        linha(3, "em_atendimento", null, ana),
      ],
    };
    expect(agrupar(porColuna, "responsavel", []).map((g) => g.titulo)).toEqual([
      "Ana Souza",
      "Rafael Lima",
      "Sem responsável",
    ]);
  });

  it("ordena pelo prazo (sem prazo no fim) nos dois sentidos", () => {
    const linhas = [
      linha(1, "em_atendimento", "2026-10-30T10:00:00Z"),
      linha(2, "em_atendimento", null),
      linha(3, "em_atendimento", "2026-10-28T10:00:00Z"),
    ];
    expect(ordenar(linhas, "prazo").map((l) => l.chamado.id)).toEqual([3, 1, 2]);
    expect(ordenar(linhas, "-prazo").map((l) => l.chamado.id)).toEqual([1, 3, 2]);
    expect(ordenar(linhas, "padrao").map((l) => l.chamado.id)).toEqual([1, 2, 3]);
  });

  it("lê visão, agrupamento e ordem da URL (qualquer outra coisa vira o padrão)", () => {
    expect([lerVisao("lista"), lerVisao("x"), lerVisao(undefined)]).toEqual([
      "lista",
      "quadro",
      "quadro",
    ]);
    expect([lerAgrupamento("categoria"), lerAgrupamento("x")]).toEqual(["categoria", "status"]);
    expect([lerOrdem("-prazo"), lerOrdem("x")]).toEqual(["-prazo", "padrao"]);
  });
});

describe("tempoDoChamado em Aguardando (ADR 0021)", () => {
  const agora = new Date("2026-10-29T18:00:00.000Z");
  const c = {
    id: 9,
    titulo: "x",
    categoriaId: 1,
    solicitanteId: "ana",
    responsavelId: "rafael",
    status: "aguardando_usuario" as const,
    prioridade: "media" as const,
    respostasForm: {},
    prazoSla: "2026-10-29T17:00:00.000Z", // já "passou", mas está pausado
    criadoEm: "2026-10-28T12:00:00.000Z",
    atualizadoEm: "2026-10-29T17:30:00.000Z",
    concluidoEm: null,
    canceladoEm: null,
    motivoCancelamento: null,
    pausadoEm: "2026-10-29T15:00:00.000Z",
  };

  it("com prazo: 'Pausado há 3h', nunca atrasado", () => {
    expect(tempoDoChamado("aguardando", c, agora)).toEqual({
      texto: "Pausado há 3h",
      atrasado: false,
    });
  });

  it("sem prazo: 'Aguardando há…'", () => {
    expect(tempoDoChamado("aguardando", { ...c, prazoSla: null }, agora).texto).toBe(
      "Aguardando há 3h",
    );
  });
});
