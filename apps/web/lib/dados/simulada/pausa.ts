// Prazo pausado enquanto aguarda o solicitante (docs/adr/0021) — espelho do gatilho app.chamados_antes_atualizar
// (migration 20261029120000). Ao entrar em "aguardando_usuario", marca pausadoEm; ao sair (resposta, conclusão,
// transferência, cancelamento ou conclusão automática), o prazo anda pelo tempo parado e sai o evento público
// "prazo_ajustado". Prazo novo durante a espera recomeça a contagem.

import type { Chamado, EventoHistorico } from "@/lib/dominio/tipos";

/** Pausa menor que isto não mexe no prazo (igual ao banco). */
export const PAUSA_MINIMA_MS = 60_000;

export function aplicarPausaDoPrazo(
  antes: Chamado,
  depois: Chamado,
  agoraIso: string,
): { chamado: Chamado; evento: Omit<EventoHistorico, "id"> | null } {
  if (depois.status !== antes.status) {
    if (depois.status === "aguardando_usuario") {
      return { chamado: { ...depois, pausadoEm: agoraIso }, evento: null };
    }
    if (antes.status === "aguardando_usuario") {
      const pausa = Math.max(
        0,
        new Date(agoraIso).getTime() - new Date(antes.pausadoEm ?? agoraIso).getTime(),
      );
      const saiu: Chamado = { ...depois, pausadoEm: null };
      if (!antes.prazoSla || depois.prazoSla !== antes.prazoSla || pausa < PAUSA_MINIMA_MS) {
        return { chamado: saiu, evento: null };
      }
      const prazo = new Date(new Date(antes.prazoSla).getTime() + pausa).toISOString();
      return {
        chamado: { ...saiu, prazoSla: prazo },
        evento: {
          chamadoId: antes.id,
          autorId: null,
          acao: "prazo_ajustado",
          de: antes.status,
          para: depois.status,
          detalhe: {
            prazo,
            prazo_anterior: antes.prazoSla,
            pausa_minutos: String(Math.floor(pausa / 60_000)),
          },
          publico: true,
          criadoEm: agoraIso,
        },
      };
    }
    return { chamado: depois, evento: null };
  }
  if (depois.status === "aguardando_usuario" && depois.prazoSla !== antes.prazoSla) {
    return { chamado: { ...depois, pausadoEm: agoraIso }, evento: null };
  }
  return { chamado: depois, evento: null };
}
