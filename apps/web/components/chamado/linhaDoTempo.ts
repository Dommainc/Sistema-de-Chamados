// Monta a conversa do chamado (mockup, telas 5 e 7): o pedido de abertura como primeira mensagem,
// as mensagens, os eventos do sistema em pílula ("Rafael Lima assumiu o chamado · 09:40")
// e os separadores de dia ("Hoje"). Funções puras — a visibilidade já vem filtrada pela camada de dados.
// Notas internas NÃO entram na conversa: ficam no Relato técnico (montarRelato), só da TI.

import type { PerfilPublico } from "@/lib/dados/tipos";
import type {
  Anexo,
  Chamado,
  EventoHistorico,
  Mensagem,
  Papel,
  StatusChamado,
} from "@/lib/dominio/tipos";
import { formatarDataHora, formatarHora } from "@/lib/formato";
import { rotuloStatus } from "@/lib/status";

export type ItemConversa =
  | { tipo: "dia"; chave: string; texto: string }
  | { tipo: "evento"; chave: string; texto: string; hora: string }
  | {
      tipo: "mensagem";
      chave: string;
      conteudo: string;
      minha: boolean;
      autorId: string;
      /** Nome mostrado no balão de quem não sou eu: "Rafael Lima · TI" · "Ana Souza". Nulo nas minhas. */
      autor: string | null;
      /** "09:52" — vai dentro do balão, como no WhatsApp. */
      hora: string;
      /** Primeira de uma sequência da mesma pessoa: leva a "pontinha" e o nome. */
      inicioDeGrupo: boolean;
      anexos: Anexo[];
      criadoEm: string;
    };

interface Entrada {
  chamado: Chamado;
  mensagens: Mensagem[];
  historico: EventoHistorico[];
  anexos: Anexo[];
  perfis: PerfilPublico[];
  euId: string;
  papel: Papel;
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
): string | null {
  const ehVoce = evento.autorId === euId;
  const autor = ehVoce ? "Você" : (nome(evento.autorId) ?? "A TI");
  const status = (s: string | null) => (s ? rotuloStatus(s as StatusChamado, papel).texto : "");

  switch (evento.acao) {
    case "criado":
      return null; // o próprio pedido já aparece como primeira mensagem
    case "assumido":
      return `${autor} assumiu o chamado`;
    case "status_alterado":
      if (evento.autorId === null && evento.para === "em_andamento") {
        return papel === "solicitante"
          ? "Você respondeu e o chamado voltou para Em atendimento"
          : `Solicitante respondeu · voltou para ${status(evento.para)}`;
      }
      return `Status alterado para ${status(evento.para)}`;
    case "transferido": {
      // O motivo é da TI: aparece no Relato técnico, não na conversa.
      const destino = nome(evento.detalhe.para_responsavel_id) ?? "outro técnico";
      return `${autor} transferiu para ${primeiroNome(destino)}`;
    }
    case "devolvido_fila":
      return `${autor} devolveu o chamado para a fila`;
    case "concluido":
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
  agora = new Date(),
}: Entrada): ItemConversa[] {
  const perfil = new Map(perfis.map((p) => [p.id, p]));
  const nome = (id: string | null | undefined) => (id ? (perfil.get(id)?.nome ?? null) : null);

  function autor(autorId: string): string | null {
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
      autorId: chamado.solicitanteId,
      autor: autor(chamado.solicitanteId),
      hora: formatarHora(chamado.criadoEm),
      inicioDeGrupo: true,
      anexos: anexos.filter((a) => a.mensagemId === null),
      criadoEm: chamado.criadoEm,
    },
    ...mensagens
      .filter((m) => !m.interna)
      .map((m) => ({
        tipo: "mensagem" as const,
        chave: `m${m.id}`,
        conteudo: m.conteudo,
        minha: m.autorId === euId,
        autorId: m.autorId,
        autor: autor(m.autorId),
        hora: formatarHora(m.criadoEm),
        inicioDeGrupo: true,
        anexos: anexos.filter((a) => a.mensagemId === m.id),
        criadoEm: m.criadoEm,
      })),
    ...historico.flatMap((h) => {
      const texto = textoEvento(h, nome, euId, papel);
      return texto
        ? [
            {
              tipo: "evento" as const,
              chave: `h${h.id}`,
              texto,
              hora: formatarHora(h.criadoEm),
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
    // Mensagens seguidas da mesma pessoa ficam agrupadas, como no WhatsApp.
    const anterior = resultado.at(-1);
    if (
      item.tipo === "mensagem" &&
      anterior?.tipo === "mensagem" &&
      anterior.autorId === item.autorId
    ) {
      resultado.push({ ...item, inicioDeGrupo: false });
    } else {
      resultado.push(item);
    }
  }
  return resultado;
}

export type ItemRelato =
  | {
      tipo: "anotacao";
      chave: string;
      /** "Você" ou o nome de quem escreveu. */
      autor: string;
      minha: boolean;
      /** "06/10/2026 09:52" (São Paulo). */
      quando: string;
      conteudo: string;
      anexos: Anexo[];
      criadoEm: string;
    }
  | {
      tipo: "registro";
      chave: string;
      /** "Rafael Lima transferiu para Thiago Martins" · "Você devolveu à fila". */
      texto: string;
      motivo: string | null;
      quando: string;
      criadoEm: string;
    };

/** Eventos que só a TI vê e que têm motivo: entram no relato junto com as anotações. */
const REGISTROS_DO_RELATO = new Set(["transferido", "devolvido_fila"]);

/** Quantos itens o Relato técnico tem (contador da aba). */
export function contarRelato(mensagens: Mensagem[], historico: EventoHistorico[]): number {
  return (
    mensagens.filter((m) => m.interna).length +
    historico.filter((h) => REGISTROS_DO_RELATO.has(h.acao)).length
  );
}

/**
 * Relato técnico (pedido do dono, 2026-10-06): diário interno do chamado, só da TI, separado da conversa.
 * Anotações (notas internas, com autor e data) + transferências e devoluções com o motivo, em ordem de tempo.
 */
export function montarRelato({
  mensagens,
  historico,
  anexos,
  perfis,
  euId,
}: {
  mensagens: Mensagem[];
  historico: EventoHistorico[];
  anexos: Anexo[];
  perfis: PerfilPublico[];
  euId: string;
}): ItemRelato[] {
  const perfil = new Map(perfis.map((p) => [p.id, p]));
  const nome = (id: string | null | undefined) => (id ? (perfil.get(id)?.nome ?? null) : null);
  const quem = (id: string | null) => (id === euId ? "Você" : (nome(id) ?? "A TI"));

  const itens: ItemRelato[] = [
    ...mensagens
      .filter((m) => m.interna)
      .map((m) => ({
        tipo: "anotacao" as const,
        chave: `m${m.id}`,
        autor: quem(m.autorId),
        minha: m.autorId === euId,
        quando: formatarDataHora(m.criadoEm),
        conteudo: m.conteudo,
        anexos: anexos.filter((a) => a.mensagemId === m.id),
        criadoEm: m.criadoEm,
      })),
    ...historico
      .filter((h) => REGISTROS_DO_RELATO.has(h.acao))
      .map((h) => ({
        tipo: "registro" as const,
        chave: `h${h.id}`,
        texto:
          h.acao === "transferido"
            ? `${quem(h.autorId)} transferiu para ${nome(h.detalhe.para_responsavel_id) ?? "outro técnico"}`
            : `${quem(h.autorId)} devolveu o chamado à fila`,
        motivo: h.detalhe.motivo ?? null,
        quando: formatarDataHora(h.criadoEm),
        criadoEm: h.criadoEm,
      })),
  ];
  return itens.sort((a, b) => a.criadoEm.localeCompare(b.criadoEm));
}

/**
 * Linha do cartão HISTÓRICO da área técnica (mockup, tela 7): "Aberto por Ana Souza",
 * "Assumido por Rafael Lima", "Em atendimento → Aguardando usuário", transferências com motivo.
 */
export function textoHistorico(
  evento: EventoHistorico,
  nome: (id: string | null | undefined) => string | null,
): string {
  const autor = nome(evento.autorId) ?? "Sistema";
  const status = (s: string | null) => (s ? rotuloStatus(s as StatusChamado, "ti").texto : "");
  switch (evento.acao) {
    case "criado":
      return `Aberto por ${autor}`;
    case "assumido":
      return `Assumido por ${autor}`;
    case "status_alterado":
      return evento.autorId === null
        ? `Solicitante respondeu · ${status(evento.de)} → ${status(evento.para)}`
        : `${status(evento.de)} → ${status(evento.para)}`;
    case "transferido":
      return `Transferido por ${autor} para ${nome(evento.detalhe.para_responsavel_id) ?? "outro técnico"}${
        evento.detalhe.motivo ? ` — ${evento.detalhe.motivo}` : ""
      }`;
    case "devolvido_fila":
      return `Devolvido à fila por ${autor}${evento.detalhe.motivo ? ` — ${evento.detalhe.motivo}` : ""}`;
    case "concluido":
      return `Concluído por ${autor}`;
    case "cancelado":
      return `Cancelado por ${autor}${evento.detalhe.motivo ? ` — ${evento.detalhe.motivo}` : ""}`;
    default:
      return `${evento.acao} · ${autor}`;
  }
}
