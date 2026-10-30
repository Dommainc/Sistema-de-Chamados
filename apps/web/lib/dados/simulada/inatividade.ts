// Automações por tempo no modo de demonstração — espelho de app.processar_inatividade (migrations 0021 e
// 0028, docs/adr/0011 e 0019). No banco roda a cada 5 minutos (pg_cron), só no expediente; aqui, a cada
// leitura dos dados, também só no expediente. A contagem começa na última mensagem pública da TI (ou na
// volta para "em andamento") e zera quando o solicitante responde:
//   2 h úteis  → "Aguardando solicitante" (prazo pausado — ADR 0021) + aviso
//   12 h úteis → lembrete (só aviso no Teams)
//   24 h úteis → mensagem automática no chat (uma vez) + aviso
//   48 h úteis → concluído automaticamente
// Se vários limites vencem juntos, só o maior gera aviso.

import { adicionarHorasUteis, ehHorarioUtil } from "@/lib/dominio/horario-util";
import type { Chamado, EventoHistorico, Mensagem, Notificacao } from "@/lib/dominio/tipos";
import type { EstadoSimulado } from "./armazenamento";
import { EXPEDIENTE_SIMULADO } from "./feriados";
import { aplicarPausaDoPrazo } from "./pausa";

export const HORAS_PARA_AGUARDANDO = 2;
export const HORAS_PARA_LEMBRETE = 12;
export const HORAS_PARA_AVISO = 24;
export const HORAS_PARA_CONCLUIR = 48;

/** Texto da mensagem automática (igual ao do banco). */
export function textoAvisoInatividade(primeiroNome: string, chamadoId: number): string {
  return (
    `Olá, ${primeiroNome}! Estamos aguardando sua resposta para continuar o atendimento do chamado ` +
    `#${chamadoId}. Se o problema já foi resolvido, é só avisar por aqui. Sem resposta, o chamado ` +
    `será concluído automaticamente.`
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
  if (!ehHorarioUtil(agora, EXPEDIENTE_SIMULADO)) return null;

  const chamados: Chamado[] = [...estado.chamados];
  const mensagens: Mensagem[] = [...estado.mensagens];
  const historico: EventoHistorico[] = [...estado.historico];
  const notificacoes: Notificacao[] = [...estado.notificacoes];
  const criadoEm = agora.toISOString();
  let mudou = false;

  const avisar = (c: Chamado, tipo: Notificacao["tipo"], payload: Record<string, string>) =>
    notificacoes.push({
      id: proximo(notificacoes),
      chamadoId: c.id,
      destinatarioId: c.solicitanteId,
      tipo,
      payload,
      status: "pendente",
      criadoEm,
    });

  chamados.forEach((c, i) => {
    if (c.status !== "em_andamento" && c.status !== "aguardando_usuario") return;
    const publicas = mensagens
      .filter((m) => m.chamadoId === c.id && !m.interna)
      .sort((a, b) => a.criadoEm.localeCompare(b.criadoEm) || a.id - b.id);
    // A contagem olha a última mensagem de uma PESSOA (o aviso automático não zera).
    const ultimaPessoa = publicas.filter((m) => m.autorId !== null).at(-1);
    if (!ultimaPessoa || ultimaPessoa.autorId === c.solicitanteId) return;

    const emAtendimentoDesde = historico
      .filter((h) => h.chamadoId === c.id && h.para === "em_andamento")
      .map((h) => h.criadoEm)
      .sort()
      .at(-1);
    const desde =
      emAtendimentoDesde && emAtendimentoDesde > ultimaPessoa.criadoEm
        ? emAtendimentoDesde
        : ultimaPessoa.criadoEm;

    // 48 h úteis → concluído automaticamente (e nenhum aviso menor).
    if (passou(desde, HORAS_PARA_CONCLUIR, agora)) {
      // Prazo pausado (ADR 0021): sair de Aguardando empurra o prazo.
      const pausa = aplicarPausaDoPrazo(
        c,
        { ...c, status: "concluido", concluidoEm: criadoEm, atualizadoEm: criadoEm },
        criadoEm,
      );
      chamados[i] = pausa.chamado;
      if (pausa.evento) historico.push({ id: proximo(historico), ...pausa.evento });
      historico.push({
        id: proximo(historico),
        chamadoId: c.id,
        autorId: null,
        acao: "concluido",
        de: c.status,
        para: "concluido",
        detalhe: { motivo: "sem_resposta_48h_uteis" },
        publico: true,
        criadoEm,
      });
      avisar(c, "status_alterado", {
        de: c.status,
        para: "concluido",
        automatico: "true",
        motivo: "sem_resposta_48h_uteis",
      });
      mudou = true;
      return;
    }

    // 2 h úteis → aguardando usuário (o aviso só se as 12 h ainda não venceram).
    if (c.status === "em_andamento" && passou(desde, HORAS_PARA_AGUARDANDO, agora)) {
      chamados[i] = {
        ...c,
        status: "aguardando_usuario",
        atualizadoEm: criadoEm,
        pausadoEm: criadoEm, // prazo pausado (ADR 0021)
      };
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
      if (!passou(desde, HORAS_PARA_LEMBRETE, agora)) {
        avisar(c, "status_alterado", {
          de: "em_andamento",
          para: "aguardando_usuario",
          automatico: "true",
        });
      }
      mudou = true;
    }

    // 12 h úteis → lembrete (uma vez por contagem), se as 24 h ainda não venceram.
    if (
      passou(desde, HORAS_PARA_LEMBRETE, agora) &&
      !passou(desde, HORAS_PARA_AVISO, agora) &&
      !notificacoes.some(
        (n) => n.chamadoId === c.id && n.tipo === "lembrete_resposta" && n.payload.desde === desde,
      )
    ) {
      avisar(c, "lembrete_resposta", { horas_uteis: String(HORAS_PARA_LEMBRETE), desde });
      mudou = true;
    }

    // 24 h úteis desde a última mensagem pública (se ela for da TI) → aviso no chat, uma vez.
    const ultima = publicas.at(-1);
    if (
      ultima &&
      ultima.autorId !== null &&
      ultima.autorId !== c.solicitanteId &&
      passou(ultima.criadoEm, HORAS_PARA_AVISO, agora)
    ) {
      const nome = estado.perfis.find((p) => p.id === c.solicitanteId)?.nome.split(" ")[0] ?? "";
      mensagens.push({
        id: proximo(mensagens),
        chamadoId: c.id,
        autorId: null,
        conteudo: textoAvisoInatividade(nome, c.id),
        interna: false,
        criadoEm,
      });
      avisar(c, "aviso_inatividade", { horas_uteis: String(HORAS_PARA_AVISO) });
      mudou = true;
    }
  });

  return mudou ? { ...estado, chamados, mensagens, historico, notificacoes } : null;
}
