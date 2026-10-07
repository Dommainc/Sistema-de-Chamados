// Automações por tempo no modo de demonstração — espelho de app.processar_inatividade (migration 0021,
// docs/adr/0011). No banco roda a cada 5 minutos (pg_cron); aqui roda a cada leitura dos dados.
//   1) "Em andamento", última mensagem pública da TI, 2 horas úteis sem resposta → "Aguardando usuário".
//   2) Última mensagem pública da TI há 24 horas úteis → aviso automático no chat (uma vez).

import { adicionarHorasUteis } from "@/lib/dominio/horario-util";
import type { Chamado, EventoHistorico, Mensagem, Notificacao } from "@/lib/dominio/tipos";
import type { EstadoSimulado } from "./armazenamento";
import { EXPEDIENTE_SIMULADO } from "./feriados";

export const HORAS_PARA_AGUARDANDO = 2;
export const HORAS_PARA_AVISO = 24;

/** Texto da mensagem automática (igual ao do banco). */
export function textoAvisoInatividade(primeiroNome: string, chamadoId: number): string {
  return (
    `Olá, ${primeiroNome}! Estamos aguardando sua resposta para continuar o atendimento do chamado ` +
    `#${chamadoId}. Se o problema já foi resolvido, é só avisar por aqui.`
  );
}

function proximo<T extends { id: number }>(lista: readonly T[]): number {
  return lista.reduce((maior, item) => Math.max(maior, item.id), 0) + 1;
}

const passou = (inicioIso: string, horasUteis: number, agora: Date) =>
  adicionarHorasUteis(new Date(inicioIso), horasUteis, EXPEDIENTE_SIMULADO).getTime() <=
  agora.getTime();

/** Devolve o estado novo se alguma automação disparou; null se nada mudou. */
export function processarInatividade(estado: EstadoSimulado, agora: Date): EstadoSimulado | null {
  const chamados: Chamado[] = [...estado.chamados];
  const mensagens: Mensagem[] = [...estado.mensagens];
  const historico: EventoHistorico[] = [...estado.historico];
  const notificacoes: Notificacao[] = [...estado.notificacoes];
  const criadoEm = agora.toISOString();
  let mudou = false;

  chamados.forEach((c, i) => {
    if (c.status !== "em_andamento" && c.status !== "aguardando_usuario") return;
    const ultima = mensagens
      .filter((m) => m.chamadoId === c.id && !m.interna)
      .sort((a, b) => a.criadoEm.localeCompare(b.criadoEm) || a.id - b.id)
      .at(-1);
    // Só conta quando a última palavra é da TI (nem do solicitante, nem do sistema).
    if (!ultima || ultima.autorId === null || ultima.autorId === c.solicitanteId) return;

    const emAtendimentoDesde = historico
      .filter((h) => h.chamadoId === c.id && h.para === "em_andamento")
      .map((h) => h.criadoEm)
      .sort()
      .at(-1);
    const base =
      emAtendimentoDesde && emAtendimentoDesde > ultima.criadoEm
        ? emAtendimentoDesde
        : ultima.criadoEm;

    if (c.status === "em_andamento" && passou(base, HORAS_PARA_AGUARDANDO, agora)) {
      chamados[i] = { ...c, status: "aguardando_usuario", atualizadoEm: criadoEm };
      historico.push({
        id: proximo(historico),
        chamadoId: c.id,
        autorId: null,
        acao: "status_alterado",
        de: "em_andamento",
        para: "aguardando_usuario",
        detalhe: { motivo: "sem_resposta_2h_uteis" },
        publico: true,
        criadoEm,
      });
      notificacoes.push({
        id: proximo(notificacoes),
        chamadoId: c.id,
        destinatarioId: c.solicitanteId,
        tipo: "status_alterado",
        payload: { de: "em_andamento", para: "aguardando_usuario", automatico: "true" },
        status: "pendente",
        criadoEm,
      });
      mudou = true;
    }

    if (passou(ultima.criadoEm, HORAS_PARA_AVISO, agora)) {
      const nome = estado.perfis.find((p) => p.id === c.solicitanteId)?.nome.split(" ")[0] ?? "";
      mensagens.push({
        id: proximo(mensagens),
        chamadoId: c.id,
        autorId: null,
        conteudo: textoAvisoInatividade(nome, c.id),
        interna: false,
        criadoEm,
      });
      notificacoes.push({
        id: proximo(notificacoes),
        chamadoId: c.id,
        destinatarioId: c.solicitanteId,
        tipo: "aviso_inatividade",
        payload: { horas_uteis: String(HORAS_PARA_AVISO) },
        status: "pendente",
        criadoEm,
      });
      mudou = true;
    }
  });

  return mudou ? { ...estado, chamados, mensagens, historico, notificacoes } : null;
}
