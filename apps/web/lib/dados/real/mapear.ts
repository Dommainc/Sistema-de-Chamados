// Linhas do Supabase (snake_case) → tipos do domínio (camelCase). Funções puras, testadas em mapear.test.ts.

import type { PerfilPublico } from "@/lib/dados/tipos";
import type {
  Anexo,
  Avaliacao,
  CampoForm,
  Categoria,
  Chamado,
  CorPaleta,
  EventoHistorico,
  Mensagem,
  OrigemAnexo,
  Papel,
  Perfil,
  Prioridade,
  RespostaPronta,
  StatusChamado,
  TipoCampo,
  ValorResposta,
} from "@/lib/dominio/tipos";

/** Colunas de `chamados` (e das views do quadro/encerrados) que o front usa. */
export const COLUNAS_CHAMADO =
  "id, titulo, categoria_id, solicitante_id, responsavel_id, status, prioridade, respostas_form, " +
  "prazo_sla, criado_em, atualizado_em, concluido_em, cancelado_em, motivo_cancelamento";

export interface LinhaChamado {
  id: number;
  titulo: string;
  categoria_id: number;
  solicitante_id: string;
  responsavel_id: string | null;
  status: StatusChamado;
  prioridade: Prioridade;
  respostas_form: Record<string, ValorResposta> | null;
  prazo_sla: string | null;
  criado_em: string;
  atualizado_em: string;
  concluido_em: string | null;
  cancelado_em: string | null;
  motivo_cancelamento: string | null;
  /** Só em obterChamado (a view do quadro não tem esta coluna). */
  continuacao_de?: number | null;
}

export function chamadoDaLinha(l: LinhaChamado): Chamado {
  return {
    id: Number(l.id),
    titulo: l.titulo,
    categoriaId: Number(l.categoria_id),
    solicitanteId: l.solicitante_id,
    responsavelId: l.responsavel_id,
    status: l.status,
    prioridade: l.prioridade,
    respostasForm: l.respostas_form ?? {},
    prazoSla: l.prazo_sla,
    criadoEm: l.criado_em,
    atualizadoEm: l.atualizado_em,
    concluidoEm: l.concluido_em,
    canceladoEm: l.cancelado_em,
    motivoCancelamento: l.motivo_cancelamento,
    continuacaoDe: l.continuacao_de ?? null,
  };
}

export interface LinhaPerfil {
  id: string;
  nome: string;
  email: string;
  departamento: string | null;
  telefone: string | null;
  papel: Papel;
  ativo: boolean;
}

export function perfilDaLinha(l: LinhaPerfil): Perfil {
  return {
    id: l.id,
    nome: l.nome,
    email: l.email,
    departamento: l.departamento,
    telefone: l.telefone,
    papel: l.papel,
    ativo: l.ativo,
  };
}

export interface LinhaPerfilPublico {
  id: string;
  nome: string;
  departamento: string | null;
  papel: Papel;
}

export function perfilPublicoDaLinha(l: LinhaPerfilPublico): PerfilPublico {
  return { id: l.id, nome: l.nome, departamento: l.departamento, papel: l.papel };
}

export interface LinhaCategoria {
  id: number;
  nome: string;
  nome_curto: string | null;
  icone: string | null;
  descricao: string | null;
  sla_horas: number | null;
  ordem: number;
}

export function categoriaDaLinha(l: LinhaCategoria): Categoria {
  return {
    id: Number(l.id),
    nome: l.nome,
    nomeCurto: l.nome_curto ?? l.nome,
    icone: l.icone ?? "ellipsis",
    descricao: l.descricao ?? "",
    slaHoras: Number(l.sla_horas ?? 0),
    ordem: l.ordem,
  };
}

export interface LinhaCampo {
  id: number;
  categoria_id: number;
  chave: string;
  label: string;
  tipo: TipoCampo;
  obrigatorio: boolean;
  opcoes: string[] | null;
  cores: Record<string, CorPaleta> | null;
  ajuda: string | null;
  ordem: number;
  mostrar_se: { campo: string; igual: string } | null;
}

export function campoDaLinha(l: LinhaCampo): CampoForm {
  return {
    id: Number(l.id),
    categoriaId: Number(l.categoria_id),
    chave: l.chave,
    label: l.label,
    tipo: l.tipo,
    obrigatorio: l.obrigatorio,
    opcoes: l.opcoes ?? [],
    cores: l.cores ?? {},
    ajuda: l.ajuda,
    ordem: l.ordem,
    mostrarSe: l.mostrar_se ?? null,
  };
}

export interface LinhaMensagem {
  id: number;
  chamado_id: number;
  autor_id: string | null;
  conteudo: string;
  interna: boolean;
  criado_em: string;
}

export function mensagemDaLinha(l: LinhaMensagem): Mensagem {
  return {
    id: Number(l.id),
    chamadoId: Number(l.chamado_id),
    autorId: l.autor_id,
    conteudo: l.conteudo,
    interna: l.interna,
    criadoEm: l.criado_em,
  };
}

export interface LinhaHistorico {
  id: number;
  chamado_id: number;
  autor_id: string | null;
  acao: string;
  de: string | null;
  para: string | null;
  detalhe: Record<string, unknown> | null;
  publico: boolean;
  criado_em: string;
}

export function eventoDaLinha(l: LinhaHistorico): EventoHistorico {
  // O detalhe é jsonb; as telas leem como texto (motivo, prazo, nota...).
  const detalhe: Record<string, string> = {};
  for (const [chave, valor] of Object.entries(l.detalhe ?? {})) {
    if (valor !== null && valor !== undefined) {
      detalhe[chave] = typeof valor === "string" ? valor : JSON.stringify(valor);
    }
  }
  return {
    id: Number(l.id),
    chamadoId: Number(l.chamado_id),
    autorId: l.autor_id,
    acao: l.acao,
    de: l.de,
    para: l.para,
    detalhe,
    publico: l.publico,
    criadoEm: l.criado_em,
  };
}

export interface LinhaAnexo {
  id: string;
  chamado_id: number;
  mensagem_id: number | null;
  nome: string;
  mime: string;
  tamanho: number;
  origem: OrigemAnexo;
  enviado_por: string;
  criado_em: string;
}

export function anexoDaLinha(l: LinhaAnexo): Anexo {
  return {
    id: l.id,
    chamadoId: Number(l.chamado_id),
    mensagemId: l.mensagem_id === null ? null : Number(l.mensagem_id),
    nome: l.nome,
    mime: l.mime,
    tamanho: Number(l.tamanho),
    origem: l.origem,
    enviadoPor: l.enviado_por,
    criadoEm: l.criado_em,
  };
}

export interface LinhaAvaliacao {
  chamado_id: number;
  avaliador_id: string;
  nota: number;
  comentario: string | null;
  criado_em: string;
}

export function avaliacaoDaLinha(l: LinhaAvaliacao): Avaliacao {
  return {
    chamadoId: Number(l.chamado_id),
    avaliadorId: l.avaliador_id,
    nota: Number(l.nota),
    comentario: l.comentario,
    criadoEm: l.criado_em,
  };
}

export interface LinhaRespostaPronta {
  id: number;
  titulo: string;
  texto: string;
  ordem: number;
}

export function respostaProntaDaLinha(l: LinhaRespostaPronta): RespostaPronta {
  return { id: Number(l.id), titulo: l.titulo, texto: l.texto, ordem: l.ordem };
}
