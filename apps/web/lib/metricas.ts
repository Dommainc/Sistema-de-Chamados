// Métricas do Dashboard da TI (ADR 0013). Cálculo puro, igual para a versão simulada e a real:
// recebe os chamados e o histórico que a TI já pode ler (RLS) e devolve os números da tela.
// Tempos em HORAS ÚTEIS (seg–sex, 08–20, sem feriados), como as automações.

import type { Avaliacao, Categoria, Chamado, EventoHistorico } from "@/lib/dominio/tipos";
import { horasUteisEntre, type ExpedienteConfig } from "@/lib/dominio/horario-util";
import type { PerfilPublico } from "@/lib/dados/tipos";
import { CHAVE_SISTEMA, SEM_SISTEMA } from "@/lib/sistemas";

// ------------------------------------------------------------------ período

export const PERIODOS = ["7d", "30d", "mes", "mes_passado", "datas"] as const;
export type ChavePeriodo = (typeof PERIODOS)[number];

export interface Periodo {
  chave: ChavePeriodo;
  /** Início (inclusive), 00:00 de São Paulo. */
  inicio: Date;
  /** Fim (exclusivo), 00:00 de São Paulo do dia seguinte ao último dia. */
  fim: Date;
  /** Datas "AAAA-MM-DD" do primeiro e do último dia (para o campo de datas). */
  de: string;
  ate: string;
}

const DIA_MS = 86_400_000;
const SP_MS = -3 * 3_600_000; // America/Sao_Paulo sem horário de verão desde 2019
const MAX_DIAS = 366;

/** "AAAA-MM-DD" do dia em São Paulo. */
export function diaSp(instante: Date): string {
  return new Date(instante.getTime() + SP_MS).toISOString().slice(0, 10);
}

/** 00:00 de São Paulo de um dia "AAAA-MM-DD". */
function meiaNoiteSp(dia: string): Date {
  return new Date(`${dia}T00:00:00-03:00`);
}

function somarDias(dia: string, dias: number): string {
  return diaSp(new Date(meiaNoiteSp(dia).getTime() + dias * DIA_MS + 12 * 3_600_000));
}

const DATA = /^\d{4}-\d{2}-\d{2}$/;
const dataValida = (texto: string | null | undefined): texto is string =>
  !!texto && DATA.test(texto) && !Number.isNaN(meiaNoiteSp(texto).getTime());

/**
 * Período do Dashboard pela URL (`?periodo=7d|30d|mes|mes_passado|datas&de=&ate=`).
 * Padrão: últimos 30 dias (decisão do dono). Datas inválidas → últimos 30 dias.
 */
export function montarPeriodo(
  chave: string | null | undefined,
  agora: Date,
  deTexto?: string | null,
  ateTexto?: string | null,
): Periodo {
  const hoje = diaSp(agora);
  const faixa = (c: ChavePeriodo, de: string, ate: string): Periodo => ({
    chave: c,
    inicio: meiaNoiteSp(de),
    fim: meiaNoiteSp(somarDias(ate, 1)),
    de,
    ate,
  });
  switch (chave) {
    case "7d":
      return faixa("7d", somarDias(hoje, -6), hoje);
    case "mes":
      return faixa("mes", `${hoje.slice(0, 8)}01`, hoje);
    case "mes_passado": {
      const primeiroDoMes = `${hoje.slice(0, 8)}01`;
      const ultimoDoAnterior = somarDias(primeiroDoMes, -1);
      return faixa("mes_passado", `${ultimoDoAnterior.slice(0, 8)}01`, ultimoDoAnterior);
    }
    case "datas":
      if (dataValida(deTexto) && dataValida(ateTexto) && deTexto <= ateTexto) {
        const dias = (meiaNoiteSp(ateTexto).getTime() - meiaNoiteSp(deTexto).getTime()) / DIA_MS;
        if (dias < MAX_DIAS) return faixa("datas", deTexto, ateTexto);
      }
      return faixa("30d", somarDias(hoje, -29), hoje);
    default:
      return faixa("30d", somarDias(hoje, -29), hoje);
  }
}

// ------------------------------------------------------------------ métricas

export interface EntradaMetricas {
  chamados: readonly Chamado[];
  historico: readonly EventoHistorico[];
  /** Pesquisa de satisfação (ADR 0015). */
  avaliacoes: readonly Avaliacao[];
  perfis: readonly PerfilPublico[];
  categorias: readonly Categoria[];
  periodo: Pick<Periodo, "inicio" | "fim">;
  agora: Date;
  expediente: ExpedienteConfig;
}

export interface ItemRanking {
  nome: string;
  total: number;
}

export interface MetricaTecnico {
  id: string;
  nome: string;
  concluidos: number;
  emAtendimento: number;
  /** Horas úteis; null = nenhum concluído no período. */
  tempoMedioConcluir: number | null;
  transferenciasFeitas: number;
  transferenciasRecebidas: number;
  /** Média das notas dos chamados que ele concluiu no período; null = nenhuma avaliação. */
  notaMedia: number | null;
  avaliacoes: number;
}

export interface PrazoCategoria {
  nome: string;
  noPrazo: number;
  comPrazo: number;
}

export interface Cancelamento {
  id: number;
  titulo: string;
  motivo: string | null;
  canceladoEm: string;
  porNome: string | null;
}

export interface Metricas {
  resumo: {
    abertosAgora: number;
    vencidosAgora: number;
    abertosNoPeriodo: number;
    concluidosNoPeriodo: number;
    /** Horas úteis; null = sem dados no período. */
    tempoMedioIniciar: number | null;
    tempoMedioConcluir: number | null;
    /** Concluídos no período que tinham prazo: quantos antes do prazo. */
    noPrazo: { dentro: number; comPrazo: number };
    /** Avaliações dos chamados concluídos no período (ADR 0015). */
    satisfacao: { media: number | null; avaliacoes: number; concluidos: number };
  };
  volume: {
    porDia: { dia: string; total: number }[];
    porCategoria: ItemRanking[];
    porSistema: ItemRanking[];
    porDepartamento: ItemRanking[];
  };
  equipe: MetricaTecnico[];
  prazoEspera: {
    porCategoria: PrazoCategoria[];
    /** Concluídos no período sem prazo definido. */
    concluidosSemPrazo: number;
    /** Abertos agora, já iniciados, ainda sem prazo. */
    abertosSemPrazo: number;
    /** Horas úteis em "Aguardando usuário", média por chamado que passou por lá no período. */
    tempoMedioAguardando: number | null;
    chamadosQueAguardaram: number;
    ultimosCancelamentos: Cancelamento[];
  };
}

const ENCERRADOS = new Set(["concluido", "cancelado"]);
const EM_ATENDIMENTO = new Set(["em_andamento", "aguardando_usuario"]);
export const SEM_DEPARTAMENTO = "Sem departamento";

const media = (valores: number[]) =>
  valores.length ? valores.reduce((a, b) => a + b, 0) / valores.length : null;

function ranking(nomes: string[]): ItemRanking[] {
  const contagem = new Map<string, number>();
  for (const n of nomes) contagem.set(n, (contagem.get(n) ?? 0) + 1);
  return [...contagem.entries()]
    .map(([nome, total]) => ({ nome, total }))
    .sort((a, b) => b.total - a.total || a.nome.localeCompare(b.nome, "pt-BR"));
}

export function calcularMetricas(e: EntradaMetricas): Metricas {
  const { agora, expediente } = e;
  const ini = e.periodo.inicio.getTime();
  const fim = e.periodo.fim.getTime();
  const noPeriodo = (iso: string | null) => {
    if (!iso) return false;
    const t = new Date(iso).getTime();
    return t >= ini && t < fim;
  };
  const uteis = (a: string, b: string | Date) =>
    horasUteisEntre(new Date(a), typeof b === "string" ? new Date(b) : b, expediente);

  const perfil = new Map(e.perfis.map((p) => [p.id, p]));
  const categoria = new Map(e.categorias.map((c) => [c.id, c]));
  const eventosDe = new Map<number, EventoHistorico[]>();
  for (const h of [...e.historico].sort((a, b) => a.criadoEm.localeCompare(b.criadoEm))) {
    const lista = eventosDe.get(h.chamadoId) ?? [];
    lista.push(h);
    eventosDe.set(h.chamadoId, lista);
  }
  const nomeCategoria = (c: Chamado) => categoria.get(c.categoriaId)?.nomeCurto ?? "—";

  const abertos = e.chamados.filter((c) => !ENCERRADOS.has(c.status));
  const criados = e.chamados.filter((c) => noPeriodo(c.criadoEm));
  const concluidos = e.chamados.filter((c) => c.status === "concluido" && noPeriodo(c.concluidoEm));
  const cancelados = e.chamados.filter((c) => c.status === "cancelado" && noPeriodo(c.canceladoEm));

  // Tempo até iniciar: da abertura até o primeiro "Iniciar" (chamados abertos no período).
  const tempoIniciar = criados.flatMap((c) => {
    const inicio = eventosDe.get(c.id)?.find((h) => h.acao === "assumido");
    return inicio ? [uteis(c.criadoEm, inicio.criadoEm)] : [];
  });
  const tempoConcluir = (c: Chamado) => uteis(c.criadoEm, c.concluidoEm!);
  const dentroDoPrazo = (c: Chamado) =>
    !!c.prazoSla && new Date(c.concluidoEm!).getTime() <= new Date(c.prazoSla).getTime();
  const comPrazo = concluidos.filter((c) => c.prazoSla);
  // Avaliação de cada chamado concluído no período (a nota conta no período da conclusão).
  const notaDe = new Map(e.avaliacoes.map((a) => [a.chamadoId, a.nota]));
  const notas = (lista: Chamado[]) =>
    lista.flatMap((c) => (notaDe.has(c.id) ? [notaDe.get(c.id)!] : []));

  // Volume por dia (todos os dias do período, mesmo sem chamado).
  const porDia: { dia: string; total: number }[] = [];
  for (let t = ini; t < fim; t += DIA_MS) {
    const dia = diaSp(new Date(t + 12 * 3_600_000));
    porDia.push({ dia, total: criados.filter((c) => diaSp(new Date(c.criadoEm)) === dia).length });
  }

  // Equipe: todos os técnicos da TI (mesmo quem não teve chamado no período).
  const transferencias = e.historico.filter(
    (h) => h.acao === "transferido" && noPeriodo(h.criadoEm),
  );
  const equipe: MetricaTecnico[] = e.perfis
    .filter((p) => p.papel === "ti")
    .map((t) => {
      const meus = concluidos.filter((c) => c.responsavelId === t.id);
      return {
        id: t.id,
        nome: t.nome,
        concluidos: meus.length,
        emAtendimento: abertos.filter(
          (c) => c.responsavelId === t.id && EM_ATENDIMENTO.has(c.status),
        ).length,
        tempoMedioConcluir: media(meus.map(tempoConcluir)),
        transferenciasFeitas: transferencias.filter((h) => h.autorId === t.id).length,
        transferenciasRecebidas: transferencias.filter(
          (h) => h.detalhe.para_responsavel_id === t.id,
        ).length,
        notaMedia: media(notas(meus)),
        avaliacoes: notas(meus).length,
      };
    })
    .sort((a, b) => b.concluidos - a.concluidos || a.nome.localeCompare(b.nome, "pt-BR"));

  // Prazo por categoria (concluídos no período que tinham prazo).
  const prazoPorCategoria = new Map<string, PrazoCategoria>();
  for (const c of comPrazo) {
    const nome = nomeCategoria(c);
    const item = prazoPorCategoria.get(nome) ?? { nome, noPrazo: 0, comPrazo: 0 };
    item.comPrazo += 1;
    if (dentroDoPrazo(c)) item.noPrazo += 1;
    prazoPorCategoria.set(nome, item);
  }

  // Tempo em "Aguardando usuário": cada trecho que começou no período, somado por chamado.
  const aguardandoPorChamado = new Map<number, number>();
  for (const [chamadoId, eventos] of eventosDe) {
    let desde: string | null = null;
    const fechar = (ate: string | Date) => {
      if (desde && noPeriodo(desde)) {
        aguardandoPorChamado.set(
          chamadoId,
          (aguardandoPorChamado.get(chamadoId) ?? 0) + uteis(desde, ate),
        );
      }
      desde = null;
    };
    for (const h of eventos) {
      if (h.para === "aguardando_usuario" && h.de !== "aguardando_usuario") desde = h.criadoEm;
      else if (h.de === "aguardando_usuario" && h.para !== "aguardando_usuario") fechar(h.criadoEm);
    }
    if (desde) fechar(agora);
  }

  return {
    resumo: {
      abertosAgora: abertos.length,
      vencidosAgora: abertos.filter(
        (c) => c.prazoSla && new Date(c.prazoSla).getTime() < agora.getTime(),
      ).length,
      abertosNoPeriodo: criados.length,
      concluidosNoPeriodo: concluidos.length,
      tempoMedioIniciar: media(tempoIniciar),
      tempoMedioConcluir: media(concluidos.map(tempoConcluir)),
      noPrazo: { dentro: comPrazo.filter(dentroDoPrazo).length, comPrazo: comPrazo.length },
      satisfacao: {
        media: media(notas(concluidos)),
        avaliacoes: notas(concluidos).length,
        concluidos: concluidos.length,
      },
    },
    volume: {
      porDia,
      porCategoria: ranking(criados.map(nomeCategoria)),
      porSistema: ranking(
        criados.flatMap((c) => {
          const s = c.respostasForm[CHAVE_SISTEMA];
          return typeof s === "string" && s !== SEM_SISTEMA ? [s] : [];
        }),
      ),
      porDepartamento: ranking(
        criados.map((c) => perfil.get(c.solicitanteId)?.departamento?.trim() || SEM_DEPARTAMENTO),
      ),
    },
    equipe,
    prazoEspera: {
      porCategoria: [...prazoPorCategoria.values()].sort(
        (a, b) => b.comPrazo - a.comPrazo || a.nome.localeCompare(b.nome, "pt-BR"),
      ),
      concluidosSemPrazo: concluidos.length - comPrazo.length,
      abertosSemPrazo: abertos.filter((c) => EM_ATENDIMENTO.has(c.status) && !c.prazoSla).length,
      tempoMedioAguardando: media([...aguardandoPorChamado.values()]),
      chamadosQueAguardaram: aguardandoPorChamado.size,
      ultimosCancelamentos: [...cancelados]
        .sort((a, b) => (b.canceladoEm ?? "").localeCompare(a.canceladoEm ?? ""))
        .slice(0, 5)
        .map((c) => {
          const autor = eventosDe.get(c.id)?.findLast((h) => h.acao === "cancelado")?.autorId;
          return {
            id: c.id,
            titulo: c.titulo,
            motivo: c.motivoCancelamento,
            canceladoEm: c.canceladoEm!,
            porNome: autor ? (perfil.get(autor)?.nome ?? null) : null,
          };
        }),
    },
  };
}

/** "45 min" · "3 h 20 min" · "26 h" (horas úteis). */
export function formatarHorasUteis(horas: number | null): string {
  if (horas === null) return "—";
  const minutos = Math.round(horas * 60);
  if (minutos < 60) return `${minutos} min`;
  const h = Math.floor(minutos / 60);
  const m = minutos % 60;
  if (h >= 10 || m === 0) return `${Math.round(minutos / 60)} h`;
  return `${h} h ${m} min`;
}

/** Nota média com uma casa: "4,6" (— sem avaliações). */
export function formatarNota(nota: number | null): string {
  return nota === null
    ? "—"
    : nota.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}
