import { describe, expect, it } from "vitest";
import type { Chamado, StatusChamado } from "@/lib/dominio/tipos";
import {
  acaoDoArraste,
  colunaDoStatus,
  ehNovo,
  filtrarChamados,
  montarQuadro,
  ordenarNovos,
  proporcaoPrazos,
  type FiltrosQuadro,
} from "./quadro";

const agora = new Date("2026-10-06T15:00:00Z");
const daqui = (min: number) => new Date(agora.getTime() + min * 60_000).toISOString();

function chamado(
  id: number,
  status: StatusChamado,
  prazoEm: number,
  responsavelId: string | null = null,
  categoriaId = 1,
): Chamado {
  return {
    id,
    titulo: `Chamado ${id}`,
    categoriaId,
    solicitanteId: "sol",
    responsavelId,
    status,
    prioridade: "media",
    respostasForm: {},
    prazoSla: daqui(prazoEm),
    criadoEm: daqui(-120),
    atualizadoEm: daqui(-60),
    concluidoEm: null,
    canceladoEm: null,
    motivoCancelamento: null,
  };
}

const TODOS: FiltrosQuadro = { responsavel: "todos", categoriaId: null, prazo: "todos", busca: "" };

describe("colunas", () => {
  it("pendente e transferido vão para Novos; encerrados ficam fora", () => {
    expect(colunaDoStatus("pendente")).toBe("novos");
    expect(colunaDoStatus("transferido")).toBe("novos");
    expect(colunaDoStatus("em_andamento")).toBe("em_atendimento");
    expect(colunaDoStatus("aguardando_usuario")).toBe("aguardando");
    expect(colunaDoStatus("concluido")).toBeNull();
    expect(colunaDoStatus("cancelado")).toBeNull();
  });

  it("monta as colunas com o prazo mais próximo primeiro", () => {
    const quadro = montarQuadro([
      chamado(1, "pendente", 300),
      chamado(2, "pendente", -30),
      chamado(3, "em_andamento", 60, "tec"),
      chamado(4, "concluido", 10, "tec"),
    ]);
    expect(quadro.novos.map((c) => c.id)).toEqual([2, 1]);
    expect(quadro.em_atendimento.map((c) => c.id)).toEqual([3]);
    expect(quadro.aguardando).toEqual([]);
  });
});

describe("filtros", () => {
  const lista = [
    chamado(1, "pendente", -10),
    chamado(2, "em_andamento", 30, "eu", 2),
    chamado(3, "em_andamento", 600, "outro"),
    chamado(4, "transferido", 600, "eu"),
  ];

  it("Só os meus = responsável sou eu (inclui transferido para mim)", () => {
    expect(
      filtrarChamados(lista, { ...TODOS, responsavel: "meus" }, "eu", agora).map((c) => c.id),
    ).toEqual([2, 4]);
  });

  it("Sem responsável", () => {
    expect(
      filtrarChamados(lista, { ...TODOS, responsavel: "sem_responsavel" }, "eu", agora).map(
        (c) => c.id,
      ),
    ).toEqual([1]);
  });

  it("por categoria e por prazo", () => {
    expect(
      filtrarChamados(lista, { ...TODOS, categoriaId: 2 }, "eu", agora).map((c) => c.id),
    ).toEqual([2]);
    expect(
      filtrarChamados(lista, { ...TODOS, prazo: "vencido" }, "eu", agora).map((c) => c.id),
    ).toEqual([1]);
    expect(
      filtrarChamados(lista, { ...TODOS, prazo: "vence_em_breve" }, "eu", agora).map((c) => c.id),
    ).toEqual([2]);
  });
});

describe("busca", () => {
  it("filtra pelo título, sem ligar para acentos e maiúsculas", () => {
    const lista = [
      { ...chamado(1, "pendente", 60), titulo: "Impressora não imprime" },
      { ...chamado(2, "pendente", 60), titulo: "VPN caiu" },
    ];
    expect(
      filtrarChamados(lista, { ...TODOS, busca: "IMPRESSAO" }, "eu", agora).map((c) => c.id),
    ).toEqual([]);
    expect(
      filtrarChamados(lista, { ...TODOS, busca: "imprime" }, "eu", agora).map((c) => c.id),
    ).toEqual([1]);
    expect(
      filtrarChamados(lista, { ...TODOS, busca: "vpn" }, "eu", agora).map((c) => c.id),
    ).toEqual([2]);
  });
});

describe("ordem da coluna Novos", () => {
  it("vencidos, depois transferido para mim, depois pelo prazo", () => {
    const ordem = ordenarNovos(
      [
        chamado(1, "pendente", 30),
        chamado(2, "transferido", 900, "eu"),
        chamado(3, "pendente", -10),
        chamado(4, "transferido", 20, "outro"),
      ],
      "eu",
      agora,
    ).map((c) => c.id);
    expect(ordem).toEqual([3, 2, 4, 1]);
  });
});

describe("proporção de prazos", () => {
  it("conta vencidos, vencendo em menos de 1 h e no prazo", () => {
    expect(
      proporcaoPrazos(
        [chamado(1, "pendente", -5), chamado(2, "pendente", 50), chamado(3, "pendente", 500)],
        agora,
      ),
    ).toEqual({ vencido: 1, vence_em_breve: 1, no_prazo: 1 });
  });
});

describe("arrastar entre colunas", () => {
  it("só três movimentos valem", () => {
    expect(acaoDoArraste("novos", "em_atendimento")).toBe("assumir");
    expect(acaoDoArraste("em_atendimento", "aguardando")).toBe("aguardar_usuario");
    expect(acaoDoArraste("aguardando", "em_atendimento")).toBe("retomar");
    expect(acaoDoArraste("novos", "aguardando")).toBeNull();
    expect(acaoDoArraste("em_atendimento", "novos")).toBeNull();
    expect(acaoDoArraste("novos", "novos")).toBeNull();
  });
});

describe("selo NOVO", () => {
  it("aberto há menos de 15 minutos", () => {
    expect(ehNovo({ ...chamado(1, "pendente", 60), criadoEm: daqui(-3) }, agora)).toBe(true);
    expect(ehNovo({ ...chamado(1, "pendente", 60), criadoEm: daqui(-20) }, agora)).toBe(false);
  });
});
