import { describe, expect, it } from "vitest";
import type { Categoria, Chamado, EventoHistorico } from "@/lib/dominio/tipos";
import type { PerfilPublico } from "@/lib/dados/tipos";
import { calcularMetricas, formatarHorasUteis, montarPeriodo, SEM_DEPARTAMENTO } from "./metricas";

const sp = (texto: string) => `${texto}-03:00`;
const EXPEDIENTE = { inicio: "08:00", fim: "18:00", feriados: new Set<string>() };
const AGORA = new Date(sp("2026-10-08T15:00:00"));

const PERFIS: PerfilPublico[] = [
  { id: "ana", nome: "Ana Souza", departamento: "Engenharia", papel: "solicitante" },
  { id: "bia", nome: "Bia Lima", departamento: null, papel: "solicitante" },
  { id: "raf", nome: "Rafael Lima", departamento: "TI", papel: "ti" },
  { id: "thi", nome: "Thiago Martins", departamento: "TI", papel: "ti" },
];
const CATEGORIAS: Categoria[] = [
  {
    id: 1,
    nome: "Acessos",
    nomeCurto: "Acessos",
    icone: "key",
    descricao: "",
    slaHoras: 8,
    ordem: 1,
  },
  {
    id: 2,
    nome: "Impressora",
    nomeCurto: "Impressora",
    icone: "printer",
    descricao: "",
    slaHoras: 8,
    ordem: 2,
  },
];

function chamado(id: number, dados: Partial<Chamado>): Chamado {
  return {
    id,
    titulo: `Chamado ${id}`,
    categoriaId: 1,
    solicitanteId: "ana",
    responsavelId: null,
    status: "pendente",
    prioridade: "media",
    respostasForm: {},
    prazoSla: null,
    criadoEm: sp("2026-10-05T09:00:00"),
    atualizadoEm: sp("2026-10-05T09:00:00"),
    concluidoEm: null,
    canceladoEm: null,
    motivoCancelamento: null,
    ...dados,
  };
}

let proximo = 1;
function evento(
  chamadoId: number,
  acao: string,
  criadoEm: string,
  extra: Partial<EventoHistorico> = {},
): EventoHistorico {
  return {
    id: proximo++,
    chamadoId,
    autorId: "raf",
    acao,
    de: null,
    para: null,
    detalhe: {},
    publico: true,
    criadoEm: sp(criadoEm),
    ...extra,
  };
}

const PERIODO = {
  inicio: new Date(sp("2026-10-01T00:00:00")),
  fim: new Date(sp("2026-10-09T00:00:00")),
};

const CHAMADOS: Chamado[] = [
  // 1: aberto seg 9h, iniciado seg 11h (2 h), concluído ter 9h (10 h úteis), dentro do prazo.
  chamado(1, {
    status: "concluido",
    responsavelId: "raf",
    respostasForm: { sistema: "Sienge" },
    prazoSla: sp("2026-10-06T18:00:00"),
    concluidoEm: sp("2026-10-06T09:00:00"),
  }),
  // 2: impressora, aberto sex 17h, iniciado seg 9h (2 h úteis), concluído fora do prazo.
  chamado(2, {
    categoriaId: 2,
    solicitanteId: "bia",
    status: "concluido",
    responsavelId: "thi",
    criadoEm: sp("2026-10-02T17:00:00"),
    prazoSla: sp("2026-10-05T10:00:00"),
    concluidoEm: sp("2026-10-05T12:00:00"),
  }),
  // 3: em atendimento com o Rafael, prazo vencido, passou 3 h aguardando o usuário.
  chamado(3, {
    status: "em_andamento",
    responsavelId: "raf",
    respostasForm: { sistema: "Não se aplica" },
    criadoEm: sp("2026-10-07T09:00:00"),
    prazoSla: sp("2026-10-08T10:00:00"),
  }),
  // 4: cancelado no período, com motivo.
  chamado(4, {
    status: "cancelado",
    criadoEm: sp("2026-10-07T10:00:00"),
    canceladoEm: sp("2026-10-07T11:00:00"),
    motivoCancelamento: "Duplicado do #3",
  }),
  // 5: antigo (fora do período), ainda pendente e sem prazo.
  chamado(5, { criadoEm: sp("2026-09-10T10:00:00") }),
];

const HISTORICO: EventoHistorico[] = [
  evento(1, "assumido", "2026-10-05T11:00:00", { de: "pendente", para: "em_andamento" }),
  evento(2, "assumido", "2026-10-05T09:00:00", {
    de: "pendente",
    para: "em_andamento",
    autorId: "thi",
  }),
  evento(3, "assumido", "2026-10-07T09:30:00", { de: "pendente", para: "em_andamento" }),
  evento(3, "status_alterado", "2026-10-07T10:00:00", {
    de: "em_andamento",
    para: "aguardando_usuario",
    autorId: null,
  }),
  evento(3, "status_alterado", "2026-10-07T13:00:00", {
    de: "aguardando_usuario",
    para: "em_andamento",
    autorId: "ana",
  }),
  evento(3, "transferido", "2026-10-07T13:30:00", {
    de: "em_andamento",
    para: "transferido",
    autorId: "thi",
    detalhe: { para_responsavel_id: "raf" },
  }),
  evento(4, "cancelado", "2026-10-07T11:00:00", {
    de: "pendente",
    para: "cancelado",
    autorId: "thi",
  }),
];

const m = calcularMetricas({
  chamados: CHAMADOS,
  historico: HISTORICO,
  perfis: PERFIS,
  categorias: CATEGORIAS,
  periodo: PERIODO,
  agora: AGORA,
  expediente: EXPEDIENTE,
});

describe("calcularMetricas — resumo", () => {
  it("abertos, vencidos, abertos e concluídos no período", () => {
    expect(m.resumo).toMatchObject({
      abertosAgora: 2, // #3 e #5
      vencidosAgora: 1, // #3
      abertosNoPeriodo: 4, // #1–#4 (o #5 é de setembro)
      concluidosNoPeriodo: 2,
    });
  });

  it("tempos médios em horas úteis (fim de semana não conta)", () => {
    // Iniciar: #1 2 h, #2 2 h (sex 17h → seg 9h), #3 0,5 h → média 1,5 h.
    expect(m.resumo.tempoMedioIniciar).toBeCloseTo(1.5);
    // Concluir: #1 10 h (seg 9h → ter 9h), #2 5 h (sex 17h → seg 12h: 1 h + 4 h) → média 7,5 h.
    expect(m.resumo.tempoMedioConcluir).toBeCloseTo(7.5);
  });

  it("% no prazo entre os concluídos que tinham prazo", () => {
    expect(m.resumo.noPrazo).toEqual({ dentro: 1, comPrazo: 2 });
  });
});

describe("calcularMetricas — volume", () => {
  it("um ponto por dia do período, mesmo sem chamado", () => {
    expect(m.volume.porDia).toHaveLength(8);
    expect(m.volume.porDia.find((d) => d.dia === "2026-10-07")?.total).toBe(2);
    expect(m.volume.porDia.find((d) => d.dia === "2026-10-03")?.total).toBe(0);
  });

  it("rankings por categoria, sistema (sem 'Não se aplica') e departamento", () => {
    expect(m.volume.porCategoria).toEqual([
      { nome: "Acessos", total: 3 },
      { nome: "Impressora", total: 1 },
    ]);
    expect(m.volume.porSistema).toEqual([{ nome: "Sienge", total: 1 }]);
    expect(m.volume.porDepartamento).toEqual([
      { nome: "Engenharia", total: 3 },
      { nome: SEM_DEPARTAMENTO, total: 1 },
    ]);
  });
});

describe("calcularMetricas — equipe", () => {
  it("por técnico: concluídos, em atendimento, tempo médio e transferências", () => {
    expect(m.equipe).toEqual([
      {
        id: "raf",
        nome: "Rafael Lima",
        concluidos: 1,
        emAtendimento: 1,
        tempoMedioConcluir: 10,
        transferenciasFeitas: 0,
        transferenciasRecebidas: 1,
      },
      {
        id: "thi",
        nome: "Thiago Martins",
        concluidos: 1,
        emAtendimento: 0,
        tempoMedioConcluir: 5,
        transferenciasFeitas: 1,
        transferenciasRecebidas: 0,
      },
    ]);
  });
});

describe("calcularMetricas — prazo e espera", () => {
  it("no prazo por categoria, sem prazo, aguardando e cancelamentos", () => {
    expect(m.prazoEspera.porCategoria).toEqual([
      { nome: "Acessos", noPrazo: 1, comPrazo: 1 },
      { nome: "Impressora", noPrazo: 0, comPrazo: 1 },
    ]);
    expect(m.prazoEspera.concluidosSemPrazo).toBe(0);
    expect(m.prazoEspera.abertosSemPrazo).toBe(0);
    expect(m.prazoEspera.tempoMedioAguardando).toBeCloseTo(3);
    expect(m.prazoEspera.chamadosQueAguardaram).toBe(1);
    expect(m.prazoEspera.ultimosCancelamentos).toEqual([
      {
        id: 4,
        titulo: "Chamado 4",
        motivo: "Duplicado do #3",
        canceladoEm: sp("2026-10-07T11:00:00"),
        porNome: "Thiago Martins",
      },
    ]);
  });

  it("aguardando ainda em aberto conta até agora", () => {
    const r = calcularMetricas({
      chamados: [chamado(9, { status: "aguardando_usuario", responsavelId: "raf" })],
      historico: [
        evento(9, "status_alterado", "2026-10-08T13:00:00", {
          de: "em_andamento",
          para: "aguardando_usuario",
        }),
      ],
      perfis: PERFIS,
      categorias: CATEGORIAS,
      periodo: PERIODO,
      agora: AGORA,
      expediente: EXPEDIENTE,
    });
    expect(r.prazoEspera.tempoMedioAguardando).toBeCloseTo(2);
  });

  it("sem dados: médias vazias (—)", () => {
    const r = calcularMetricas({
      chamados: [],
      historico: [],
      perfis: PERFIS,
      categorias: CATEGORIAS,
      periodo: PERIODO,
      agora: AGORA,
      expediente: EXPEDIENTE,
    });
    expect(r.resumo.tempoMedioConcluir).toBeNull();
    expect(formatarHorasUteis(r.resumo.tempoMedioConcluir)).toBe("—");
  });
});

describe("montarPeriodo", () => {
  it("padrão: últimos 30 dias até hoje (São Paulo)", () => {
    const p = montarPeriodo(null, AGORA);
    expect(p).toMatchObject({ chave: "30d", de: "2026-09-09", ate: "2026-10-08" });
    expect(p.inicio).toEqual(new Date(sp("2026-09-09T00:00:00")));
    expect(p.fim).toEqual(new Date(sp("2026-10-09T00:00:00")));
  });

  it("7 dias, este mês e mês passado", () => {
    expect(montarPeriodo("7d", AGORA)).toMatchObject({ de: "2026-10-02", ate: "2026-10-08" });
    expect(montarPeriodo("mes", AGORA)).toMatchObject({ de: "2026-10-01", ate: "2026-10-08" });
    expect(montarPeriodo("mes_passado", AGORA)).toMatchObject({
      de: "2026-09-01",
      ate: "2026-09-30",
    });
  });

  it("datas escolhidas; inválidas ou invertidas voltam para 30 dias", () => {
    expect(montarPeriodo("datas", AGORA, "2026-08-01", "2026-08-15")).toMatchObject({
      chave: "datas",
      de: "2026-08-01",
      ate: "2026-08-15",
    });
    expect(montarPeriodo("datas", AGORA, "2026-08-15", "2026-08-01").chave).toBe("30d");
    expect(montarPeriodo("datas", AGORA, "ontem", "2026-08-01").chave).toBe("30d");
    expect(montarPeriodo("datas", AGORA, "2024-01-01", "2026-08-01").chave).toBe("30d");
  });
});

describe("formatarHorasUteis", () => {
  it("minutos, horas e minutos, horas cheias", () => {
    expect(formatarHorasUteis(0.75)).toBe("45 min");
    expect(formatarHorasUteis(3 + 20 / 60)).toBe("3 h 20 min");
    expect(formatarHorasUteis(2)).toBe("2 h");
    expect(formatarHorasUteis(26.4)).toBe("26 h");
  });
});
