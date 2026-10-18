import { describe, expect, it } from "vitest";
import type { Chamado, EventoHistorico } from "@/lib/dominio/tipos";
import { ABAS_STATUS, COLUNAS, linhasRelatorio, nomeDoArquivo } from "./relatorio";

const EXPEDIENTE = { inicio: "08:00", fim: "20:00", feriados: new Set<string>() };

function chamado(id: number, extra: Partial<Chamado> = {}): Chamado {
  return {
    id,
    titulo: `Chamado ${id}`,
    categoriaId: 1,
    solicitanteId: "ana",
    responsavelId: "rafael",
    status: "concluido",
    prioridade: "alta",
    respostasForm: { sistema: "Sienge", modulo_sienge: "Financeiro" },
    // Segunda 05/10/2026 09:00 em São Paulo
    criadoEm: "2026-10-05T12:00:00Z",
    atualizadoEm: "2026-10-05T12:00:00Z",
    prazoSla: "2026-10-05T20:00:00Z",
    concluidoEm: "2026-10-05T15:00:00Z",
    canceladoEm: null,
    motivoCancelamento: null,
    ...extra,
  };
}

const iniciado: EventoHistorico = {
  id: 1,
  chamadoId: 42,
  autorId: "rafael",
  acao: "assumido",
  de: "pendente",
  para: "em_andamento",
  detalhe: {},
  publico: true,
  criadoEm: "2026-10-05T13:00:00Z",
};

const base = {
  historico: [iniciado],
  avaliacoes: [
    {
      chamadoId: 42,
      avaliadorId: "ana",
      nota: 5,
      comentario: "Rápido",
      criadoEm: "2026-10-05T16:00:00Z",
    },
  ],
  perfis: [
    { id: "ana", nome: "Ana Souza", departamento: "Engenharia", papel: "solicitante" as const },
    { id: "rafael", nome: "Rafael Lima", departamento: "TI", papel: "ti" as const },
  ],
  categorias: [
    {
      id: 1,
      nome: "Solicitações de acesso e Permissões",
      nomeCurto: "Acessos",
      icone: "key-round",
    },
  ] as never,
  expediente: EXPEDIENTE,
};

describe("relatório do Dashboard (Excel)", () => {
  it("uma linha por chamado com nomes, sistema, módulo, tempos em horas úteis e avaliação", () => {
    const [linha] = linhasRelatorio({ ...base, chamados: [chamado(42)] });
    expect(linha).toMatchObject({
      numero: 42,
      statusTexto: expect.any(String),
      categoria: "Solicitações de acesso e Permissões",
      sistema: "Sienge",
      modulo: "Financeiro",
      solicitante: "Ana Souza",
      departamento: "Engenharia",
      tecnico: "Rafael Lima",
      prioridade: "Alta",
      abertoEm: "05/10/2026 09:00",
      iniciadoEm: "05/10/2026 10:00",
      encerradoEm: "05/10/2026 12:00",
      dentroDoPrazo: "Sim",
      horasAteIniciar: 1,
      horasAteConcluir: 3,
      transferencias: 0,
      nota: 5,
      comentario: "Rápido",
    });
  });

  it("chamado ainda aberto: sem tempos de conclusão nem 'dentro do prazo'", () => {
    const [linha] = linhasRelatorio({
      ...base,
      historico: [],
      chamados: [chamado(7, { status: "pendente", concluidoEm: null, responsavelId: null })],
    });
    expect(linha).toMatchObject({
      tecnico: "",
      prioridade: "",
      iniciadoEm: "",
      dentroDoPrazo: "",
      horasAteIniciar: null,
      horasAteConcluir: null,
    });
  });

  it("do mais novo para o mais antigo, e toda coluna tem título", () => {
    const linhas = linhasRelatorio({ ...base, chamados: [chamado(1), chamado(3), chamado(2)] });
    expect(linhas.map((l) => l.numero)).toEqual([3, 2, 1]);
    expect(COLUNAS.every((c) => c.titulo.length > 0)).toBe(true);
  });

  it("uma aba para cada um dos 6 status", () => {
    expect(ABAS_STATUS.map((a) => a.status)).toEqual([
      "pendente",
      "em_andamento",
      "aguardando_usuario",
      "transferido",
      "concluido",
      "cancelado",
    ]);
  });

  it("nome do arquivo com as datas do período", () => {
    expect(nomeDoArquivo("2026-10-01", "2026-10-31")).toBe(
      "relatorio-chamados-01-10-2026-a-31-10-2026.xlsx",
    );
  });
});
