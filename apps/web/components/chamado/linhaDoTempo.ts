// Monta a conversa do chamado (mockup, telas 5 e 7): o pedido de abertura como primeira mensagem,
// as mensagens, os eventos do sistema em pílula ("Rafael Lima iniciou o atendimento · 09:40")
// e os separadores de dia ("Hoje"). Funções puras — a visibilidade já vem filtrada pela camada de dados.
// Layout novo (parte 3): na tela da TI, as notas internas e os eventos só da TI (motivo da transferência,
// prioridade) entram na MESMA linha do tempo, em destaque (comNotasInternas). O solicitante nunca recebe (RLS).

import type { PerfilPublico } from "@/lib/dados/tipos";
import type {
  Anexo,
  Chamado,
  EventoHistorico,
  Mensagem,
  Papel,
  StatusChamado,
} from "@/lib/dominio/tipos";
import { formatarDataHora, formatarDiaHora, formatarHora } from "@/lib/formato";
import { rotuloStatus } from "@/lib/status";

export type ItemConversa =
  | { tipo: "dia"; chave: string; texto: string }
  | {
      tipo: "evento";
      chave: string;
      texto: string;
      hora: string;
      /** Só a TI vê (ex.: motivo da transferência, prioridade). */
      interno: boolean;
    }
  | {
      tipo: "mensagem";
      chave: string;
      conteudo: string;
      minha: boolean;
      /** Aviso automático da Central (sem autor). */
      sistema: boolean;
      /** Nota interna (só a TI vê). */
      interna: boolean;
      autorId: string;
      /** Nome mostrado no balão de quem não sou eu: "Rafael Lima · TI" · "Ana Souza". Nulo nas minhas. */
      autor: string | null;
      /** "09:52" — vai dentro do balão, como no WhatsApp. */
      hora: string;
      /** Primeira de uma sequência da mesma pessoa: leva a "pontinha" e o nome. */
      inicioDeGrupo: boolean;
      anexos: Anexo[];
      criadoEm: string;
      /** Só para a TI, nas mensagens dela: o solicitante já leu (✓✓) ou ainda não (✓). Nulo = não mostra. */
      visto: boolean | null;
    };

interface Entrada {
  chamado: Chamado;
  mensagens: Mensagem[];
  historico: EventoHistorico[];
  anexos: Anexo[];
  perfis: PerfilPublico[];
  euId: string;
  papel: Papel;
  /** Até quando o solicitante leu (lidoPeloSolicitanteAte). Só a TI recebe; ativa o ✓/✓✓. */
  lidoPeloSolicitanteAte?: string | null;
  /** Tela da TI: notas internas e eventos só da TI na mesma linha do tempo. */
  comNotasInternas?: boolean;
  agora?: Date;
}

function diaSp(iso: string): string {
  return formatarDataHora(iso).slice(0, 10); // "dd/MM/yyyy" em São Paulo
}

export function rotuloDia(iso: string, agora: Date): string {
  const dia = diaSp(iso);
  if (dia === diaSp(agora.toISOString())) return "Hoje";
  if (dia === diaSp(new Date(agora.getTime() - 86_400_000).toISOString())) return "Ontem";
  return dia;
}

function primeiroNome(nome: string): string {
  return nome.split(" ")[0];
}

/** Texto do evento do histórico; nulo = não aparece na conversa. */
export function textoEvento(
  evento: EventoHistorico,
  nome: (id: string | null | undefined) => string | null,
  euId: string,
  papel: Papel,
  /** Tela da TI com notas internas: inclui o motivo da transferência e a prioridade. */
  completo = false,
): string | null {
  const ehVoce = evento.autorId === euId;
  const autor = ehVoce ? "Você" : (nome(evento.autorId) ?? "A TI");
  const status = (s: string | null) => (s ? rotuloStatus(s as StatusChamado, papel).texto : "");

  switch (evento.acao) {
    case "criado":
      return null; // o próprio pedido já aparece como primeira mensagem
    case "assumido":
      return `${autor} iniciou o atendimento`;
    case "status_alterado":
      if (evento.detalhe.motivo === "sem_resposta_2h_uteis") {
        // Automação (ADR 0011): a TI respondeu e passaram 2 h úteis sem resposta.
        return papel === "solicitante"
          ? "Aguardando sua resposta para continuar"
          : "Sem resposta há 2 h úteis · foi para Aguardando usuário";
      }
      if (evento.autorId === null && evento.para === "em_andamento") {
        return papel === "solicitante"
          ? "Você respondeu e o chamado voltou para Em atendimento"
          : `Solicitante respondeu · voltou para ${status(evento.para)}`;
      }
      return `Status alterado para ${status(evento.para)}`;
    case "transferido": {
      // O motivo é da TI: só aparece na tela da TI (completo).
      const destino = nome(evento.detalhe.para_responsavel_id) ?? "outro técnico";
      const motivo = completo && evento.detalhe.motivo ? ` — “${evento.detalhe.motivo}”` : "";
      return `${autor} transferiu para ${primeiroNome(destino)}${motivo}`;
    }
    case "devolvido_fila": {
      const motivo = completo && evento.detalhe.motivo ? ` — “${evento.detalhe.motivo}”` : "";
      return `${autor} devolveu o chamado para a fila${motivo}`;
    }
    case "prioridade_alterada": {
      if (!completo) return null;
      const rotulo = (p?: string) =>
        ({ alta: "Alta", media: "Média", baixa: "Baixa" })[p ?? ""] ?? p ?? "";
      return `${autor} mudou a prioridade: ${rotulo(evento.detalhe.de)} → ${rotulo(evento.detalhe.para)}`;
    }
    case "prazo_definido": {
      // ADR 0009: o solicitante vê a previsão e, se mudou, o motivo.
      const prazo = evento.detalhe.prazo ? formatarDiaHora(evento.detalhe.prazo) : "";
      const motivo = evento.detalhe.motivo ? ` (${evento.detalhe.motivo})` : "";
      if (evento.detalhe.prazo_anterior) {
        return papel === "solicitante"
          ? `Previsão de conclusão alterada para ${prazo}${motivo}`
          : `${autor} alterou o prazo para ${prazo}${motivo}`;
      }
      return papel === "solicitante"
        ? `Previsão de conclusão: ${prazo}`
        : `${autor} definiu o prazo para ${prazo}`;
    }
    case "avaliado":
      return null; // a avaliação aparece no próprio cartão "Avaliação"
    case "concluido":
      // ADR 0019: sem resposta do solicitante por 48 h úteis, o sistema conclui.
      if (evento.detalhe.motivo === "sem_resposta_48h_uteis") {
        return "Concluído automaticamente: sem resposta por 48 horas úteis";
      }
      return "Chamado concluído";
    case "cancelado":
      return `Chamado cancelado${evento.detalhe.motivo ? `: ${evento.detalhe.motivo}` : ""}`;
    default:
      return null;
  }
}

export function montarConversa({
  chamado,
  mensagens,
  historico,
  anexos,
  perfis,
  euId,
  papel,
  lidoPeloSolicitanteAte = null,
  comNotasInternas = false,
  agora = new Date(),
}: Entrada): ItemConversa[] {
  // ✓/✓✓ só para a TI, nas mensagens que ela mesma mandou (pedido do dono, 2026-10-16).
  const visto = (minha: boolean, criadoEm: string): boolean | null =>
    papel === "ti" && minha
      ? lidoPeloSolicitanteAte !== null && new Date(lidoPeloSolicitanteAte) >= new Date(criadoEm)
      : null;
  const perfil = new Map(perfis.map((p) => [p.id, p]));
  const nome = (id: string | null | undefined) => (id ? (perfil.get(id)?.nome ?? null) : null);

  function autor(autorId: string | null): string | null {
    if (autorId === null) return "Aviso automático da Central";
    if (autorId === euId) return null;
    const p = perfil.get(autorId);
    if (!p) return null;
    return p.papel === "ti" ? `${p.nome} · TI` : p.nome;
  }

  const descricao = chamado.respostasForm.descricao;
  const itens: (Exclude<ItemConversa, { tipo: "dia" }> & { criadoEm: string })[] = [
    {
      tipo: "mensagem",
      chave: "pedido",
      conteudo: typeof descricao === "string" && descricao ? descricao : chamado.titulo,
      minha: chamado.solicitanteId === euId,
      sistema: false,
      interna: false,
      autorId: chamado.solicitanteId,
      autor: autor(chamado.solicitanteId),
      hora: formatarHora(chamado.criadoEm),
      inicioDeGrupo: true,
      anexos: anexos.filter((a) => a.mensagemId === null),
      criadoEm: chamado.criadoEm,
      visto: visto(chamado.solicitanteId === euId, chamado.criadoEm),
    },
    ...mensagens
      .filter((m) => comNotasInternas || !m.interna)
      .map((m) => ({
        tipo: "mensagem" as const,
        chave: `m${m.id}`,
        conteudo: m.conteudo,
        minha: m.autorId === euId,
        sistema: m.autorId === null,
        interna: m.interna,
        autorId: m.autorId ?? "sistema",
        autor: autor(m.autorId),
        hora: formatarHora(m.criadoEm),
        inicioDeGrupo: true,
        anexos: anexos.filter((a) => a.mensagemId === m.id),
        criadoEm: m.criadoEm,
        // Nota interna não vai para o solicitante: sem ✓/✓✓.
        visto: m.interna ? null : visto(m.autorId === euId, m.criadoEm),
      })),
    ...historico.flatMap((h) => {
      const texto = textoEvento(h, nome, euId, papel, comNotasInternas);
      return texto
        ? [
            {
              tipo: "evento" as const,
              chave: `h${h.id}`,
              texto,
              hora: formatarHora(h.criadoEm),
              interno: !h.publico,
              criadoEm: h.criadoEm,
            },
          ]
        : [];
    }),
  ];

  // Ordem cronológica; no mesmo instante, a mensagem vem antes do evento que ela causou.
  itens.sort(
    (a, b) =>
      a.criadoEm.localeCompare(b.criadoEm) ||
      (a.tipo === "mensagem" ? -1 : 0) - (b.tipo === "mensagem" ? -1 : 0),
  );

  const resultado: ItemConversa[] = [];
  let diaAtual = "";
  for (const item of itens) {
    const dia = rotuloDia(item.criadoEm, agora);
    if (dia !== diaAtual) {
      resultado.push({ tipo: "dia", chave: `dia-${item.criadoEm}`, texto: dia });
      diaAtual = dia;
    }
    // Mensagens seguidas da mesma pessoa ficam agrupadas, como no WhatsApp. Nota interna nunca agrupa:
    // cada uma leva o rótulo "Nota interna", para não ser confundida com resposta.
    const anterior = resultado.at(-1);
    if (
      item.tipo === "mensagem" &&
      !item.interna &&
      anterior?.tipo === "mensagem" &&
      !anterior.interna &&
      anterior.autorId === item.autorId
    ) {
      resultado.push({ ...item, inicioDeGrupo: false });
    } else {
      resultado.push(item);
    }
  }
  return resultado;
}
