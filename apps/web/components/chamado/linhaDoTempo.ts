// Monta a conversa do chamado (mockup, telas 5 e 7): o pedido de abertura como primeira mensagem,
// as mensagens, os eventos do sistema em pílula ("Rafael Lima assumiu o chamado · 09:40")
// e os separadores de dia ("Hoje"). Função pura — a visibilidade já vem filtrada pela camada de dados.

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
      interna: boolean;
      minha: boolean;
      /** "Você · 08:46" · "Rafael Lima · TI · 09:52" */
      rodape: string;
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
      const destino = nome(evento.detalhe.para_responsavel_id) ?? "outro técnico";
      return `${autor} transferiu para ${primeiroNome(destino)}${evento.detalhe.motivo ? `: ${evento.detalhe.motivo}` : ""}`;
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

  function rodape(autorId: string, criadoEm: string): string {
    const hora = formatarHora(criadoEm);
    if (autorId === euId) return `Você · ${hora}`;
    const autor = perfil.get(autorId);
    if (!autor) return hora;
    return autor.papel === "ti" ? `${autor.nome} · TI · ${hora}` : `${autor.nome} · ${hora}`;
  }

  const descricao = chamado.respostasForm.descricao;
  const itens: (Exclude<ItemConversa, { tipo: "dia" }> & { criadoEm: string })[] = [
    {
      tipo: "mensagem",
      chave: "pedido",
      conteudo: typeof descricao === "string" && descricao ? descricao : chamado.titulo,
      interna: false,
      minha: chamado.solicitanteId === euId,
      rodape: rodape(chamado.solicitanteId, chamado.criadoEm),
      anexos: anexos.filter((a) => a.mensagemId === null),
      criadoEm: chamado.criadoEm,
    },
    ...mensagens.map((m) => ({
      tipo: "mensagem" as const,
      chave: `m${m.id}`,
      conteudo: m.conteudo,
      interna: m.interna,
      minha: m.autorId === euId,
      rodape: rodape(m.autorId, m.criadoEm),
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
    resultado.push(item);
  }
  return resultado;
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
