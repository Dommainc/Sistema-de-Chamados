// Relatório do Dashboard em Excel (pedido do gestor, 2026-10-18): uma linha por chamado, com uma aba "Todos",
// uma aba por status e uma aba "Resumo" com os mesmos números da tela. Funções puras (testáveis); quem gera o
// .xlsx é o BotaoRelatorio. Os chamados são os mesmos do Dashboard (listarDadosMetricas): abertos agora + os
// abertos, concluídos ou cancelados no período.

import type { PerfilPublico } from "@/lib/dados/tipos";
import { horasUteisEntre, type ExpedienteConfig } from "@/lib/dominio/horario-util";
import type {
  Avaliacao,
  Categoria,
  Chamado,
  EventoHistorico,
  StatusChamado,
} from "@/lib/dominio/tipos";
import { formatarDataHora } from "@/lib/formato";
import { formatarHorasUteis, formatarNota, type Metricas } from "@/lib/metricas";
import { CHAVE_SISTEMA } from "@/lib/sistemas";
import { rotuloStatus } from "@/lib/status";

export interface LinhaRelatorio {
  numero: number;
  titulo: string;
  status: StatusChamado;
  statusTexto: string;
  categoria: string;
  sistema: string;
  modulo: string;
  solicitante: string;
  departamento: string;
  tecnico: string;
  prioridade: string;
  abertoEm: string;
  iniciadoEm: string;
  encerradoEm: string;
  prazo: string;
  dentroDoPrazo: string;
  /** Horas úteis (1 casa); null = ainda não aconteceu. */
  horasAteIniciar: number | null;
  horasAteConcluir: number | null;
  transferencias: number;
  nota: number | null;
  comentario: string;
  motivoCancelamento: string;
}

/** Colunas na ordem do Excel: título e largura (em caracteres). */
export const COLUNAS: { chave: keyof LinhaRelatorio; titulo: string; largura: number }[] = [
  { chave: "numero", titulo: "Nº", largura: 7 },
  { chave: "titulo", titulo: "Título", largura: 40 },
  { chave: "statusTexto", titulo: "Status", largura: 18 },
  { chave: "categoria", titulo: "Categoria", largura: 30 },
  { chave: "sistema", titulo: "Sistema", largura: 16 },
  { chave: "modulo", titulo: "Módulo", largura: 20 },
  { chave: "solicitante", titulo: "Solicitante", largura: 24 },
  { chave: "departamento", titulo: "Departamento", largura: 18 },
  { chave: "tecnico", titulo: "Técnico", largura: 22 },
  { chave: "prioridade", titulo: "Prioridade", largura: 11 },
  { chave: "abertoEm", titulo: "Aberto em", largura: 17 },
  { chave: "iniciadoEm", titulo: "Iniciado em", largura: 17 },
  { chave: "encerradoEm", titulo: "Concluído/cancelado em", largura: 22 },
  { chave: "prazo", titulo: "Prazo", largura: 17 },
  { chave: "dentroDoPrazo", titulo: "Dentro do prazo", largura: 15 },
  { chave: "horasAteIniciar", titulo: "Horas úteis até iniciar", largura: 22 },
  { chave: "horasAteConcluir", titulo: "Horas úteis até concluir", largura: 23 },
  { chave: "transferencias", titulo: "Transferências", largura: 14 },
  { chave: "nota", titulo: "Nota (1 a 5)", largura: 12 },
  { chave: "comentario", titulo: "Comentário da avaliação", largura: 40 },
  { chave: "motivoCancelamento", titulo: "Motivo do cancelamento", largura: 36 },
];

/** Abas por status, na ordem do quadro. */
export const ABAS_STATUS: { status: StatusChamado; aba: string }[] = [
  { status: "pendente", aba: "Novos" },
  { status: "em_andamento", aba: "Em atendimento" },
  { status: "aguardando_usuario", aba: "Aguardando solicitante" },
  { status: "transferido", aba: "Transferidos" },
  { status: "concluido", aba: "Concluídos" },
  { status: "cancelado", aba: "Cancelados" },
];

const PRIORIDADE: Record<string, string> = { alta: "Alta", media: "Média", baixa: "Baixa" };

export interface EntradaRelatorio {
  chamados: readonly Chamado[];
  historico: readonly EventoHistorico[];
  avaliacoes: readonly Avaliacao[];
  perfis: readonly PerfilPublico[];
  categorias: readonly Categoria[];
  expediente: ExpedienteConfig;
}

const umaCasa = (horas: number) => Math.round(horas * 10) / 10;

/** Uma linha por chamado, do mais novo para o mais antigo. */
export function linhasRelatorio(e: EntradaRelatorio): LinhaRelatorio[] {
  const perfil = new Map(e.perfis.map((p) => [p.id, p]));
  const categoria = new Map(e.categorias.map((c) => [c.id, c.nome]));
  const avaliacao = new Map(e.avaliacoes.map((a) => [a.chamadoId, a]));
  const eventos = new Map<number, EventoHistorico[]>();
  for (const h of e.historico) eventos.set(h.chamadoId, [...(eventos.get(h.chamadoId) ?? []), h]);

  return [...e.chamados]
    .sort((a, b) => b.id - a.id)
    .map((c): LinhaRelatorio => {
      const doChamado = (eventos.get(c.id) ?? []).sort((a, b) =>
        a.criadoEm.localeCompare(b.criadoEm),
      );
      const iniciado = doChamado.find((h) => h.acao === "assumido")?.criadoEm ?? null;
      const encerrado = c.concluidoEm ?? c.canceladoEm;
      const respostas = c.respostasForm;
      const sistema = respostas[CHAVE_SISTEMA];
      const modulo = Object.entries(respostas).find(([k]) => k.startsWith("modulo_"))?.[1];
      const solicitante = perfil.get(c.solicitanteId);
      const nota = avaliacao.get(c.id);
      return {
        numero: c.id,
        titulo: c.titulo,
        status: c.status,
        statusTexto: rotuloStatus(c.status, "ti").texto,
        categoria: categoria.get(c.categoriaId) ?? "",
        sistema: typeof sistema === "string" ? sistema : "",
        modulo: typeof modulo === "string" ? modulo : "",
        solicitante: solicitante?.nome ?? "",
        departamento: solicitante?.departamento ?? "",
        tecnico: c.responsavelId ? (perfil.get(c.responsavelId)?.nome ?? "") : "",
        // Prioridade só existe depois de iniciar (ADR 0012): nos Novos fica em branco.
        prioridade: c.status === "pendente" ? "" : (PRIORIDADE[c.prioridade] ?? c.prioridade),
        abertoEm: formatarDataHora(c.criadoEm),
        iniciadoEm: iniciado ? formatarDataHora(iniciado) : "",
        encerradoEm: encerrado ? formatarDataHora(encerrado) : "",
        prazo: c.prazoSla ? formatarDataHora(c.prazoSla) : "",
        dentroDoPrazo:
          c.status === "concluido" && c.prazoSla && c.concluidoEm
            ? c.concluidoEm <= c.prazoSla
              ? "Sim"
              : "Não"
            : "",
        horasAteIniciar: iniciado
          ? umaCasa(horasUteisEntre(new Date(c.criadoEm), new Date(iniciado), e.expediente))
          : null,
        horasAteConcluir:
          c.status === "concluido" && c.concluidoEm
            ? umaCasa(horasUteisEntre(new Date(c.criadoEm), new Date(c.concluidoEm), e.expediente))
            : null,
        transferencias: doChamado.filter((h) => h.acao === "transferido").length,
        nota: nota?.nota ?? null,
        comentario: nota?.comentario ?? "",
        motivoCancelamento: c.motivoCancelamento ?? "",
      };
    });
}

/** Aba "Resumo": os números da tela do Dashboard, como pares rótulo → valor. */
export function linhasResumo(m: Metricas, periodo: string): [string, string | number][] {
  const r = m.resumo;
  const porcento = (a: number, b: number) => (b ? `${Math.round((a / b) * 100)}%` : "—");
  return [
    ["Período", periodo],
    ["Abertos agora", r.abertosAgora],
    ["Vencidos agora", r.vencidosAgora],
    ["Abertos no período", r.abertosNoPeriodo],
    ["Concluídos no período", r.concluidosNoPeriodo],
    ["Tempo médio até iniciar (horas úteis)", formatarHorasUteis(r.tempoMedioIniciar)],
    ["Tempo médio até concluir (horas úteis)", formatarHorasUteis(r.tempoMedioConcluir)],
    [
      "Concluídos no prazo",
      `${porcento(r.noPrazo.dentro, r.noPrazo.comPrazo)} (${r.noPrazo.dentro} de ${r.noPrazo.comPrazo} com prazo)`,
    ],
    [
      "Satisfação média",
      `${formatarNota(r.satisfacao.media)} (${r.satisfacao.avaliacoes} avaliação(ões))`,
    ],
  ];
}

/** Nome do arquivo: relatorio-chamados-01-10-2026-a-31-10-2026.xlsx */
export function nomeDoArquivo(de: string, ate: string): string {
  const dma = (dia: string) => `${dia.slice(8, 10)}-${dia.slice(5, 7)}-${dia.slice(0, 4)}`;
  return `relatorio-chamados-${dma(de)}-a-${dma(ate)}.xlsx`;
}
