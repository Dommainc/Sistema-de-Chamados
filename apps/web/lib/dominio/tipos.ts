// Tipos do domínio, espelhando as tabelas de supabase/migrations (status: ADR 0005).

export type Papel = "solicitante" | "ti";

export const STATUS = [
  "pendente",
  "em_andamento",
  "aguardando_usuario",
  "transferido",
  "concluido",
  "cancelado",
] as const;
export type StatusChamado = (typeof STATUS)[number];

export const STATUS_ENCERRADOS: readonly StatusChamado[] = ["concluido", "cancelado"];

export type Prioridade = "baixa" | "media" | "alta" | "critica";

export type TipoCampo =
  "texto" | "texto_longo" | "numero" | "data" | "selecao" | "multipla_selecao" | "sim_nao";

export interface Perfil {
  id: string;
  nome: string;
  email: string;
  departamento: string | null;
  telefone: string | null;
  papel: Papel;
  ativo: boolean;
}

export interface Categoria {
  id: number;
  nome: string;
  /** Nome exibido no portal do solicitante (docs/ui-ux.md). */
  nomeCurto: string;
  /** Ícone lucide em kebab-case (ex.: "key-round"). */
  icone: string;
  descricao: string;
  slaHoras: number;
  ordem: number;
}

export interface CampoForm {
  id: number;
  categoriaId: number;
  chave: string;
  label: string;
  tipo: TipoCampo;
  obrigatorio: boolean;
  opcoes: string[];
  ajuda: string | null;
  ordem: number;
}

/** Valor de uma resposta do formulário dinâmico (indexada por campos_form.chave). */
export type ValorResposta = string | string[] | boolean | number;

export interface Chamado {
  id: number;
  titulo: string;
  categoriaId: number;
  solicitanteId: string;
  responsavelId: string | null;
  status: StatusChamado;
  prioridade: Prioridade;
  respostasForm: Record<string, ValorResposta>;
  prazoSla: string;
  criadoEm: string;
  atualizadoEm: string;
  concluidoEm: string | null;
  canceladoEm: string | null;
  motivoCancelamento: string | null;
}

export type OrigemAnexo = "upload" | "colado";

/** Registro de public.anexos. O arquivo fica no Storage (simulada: IndexedDB). */
export interface Anexo {
  id: string;
  chamadoId: number;
  /** Nulo = anexado na abertura do chamado. */
  mensagemId: number | null;
  nome: string;
  mime: string;
  tamanho: number;
  origem: OrigemAnexo;
  enviadoPor: string;
  criadoEm: string;
}

/** Registro de public.historico (somente inserção). */
export interface EventoHistorico {
  id: number;
  chamadoId: number;
  /** Nulo = ação automática do sistema. */
  autorId: string | null;
  acao: string;
  de: string | null;
  para: string | null;
  detalhe: Record<string, string>;
  /** false = só a TI vê. */
  publico: boolean;
  criadoEm: string;
}

/** Registro de public.mensagens (chat). */
export interface Mensagem {
  id: number;
  chamadoId: number;
  autorId: string;
  conteudo: string;
  /** true = nota interna, só a TI vê. */
  interna: boolean;
  criadoEm: string;
}

/** Registro de public.chamado_leituras: até quando a conversa foi lida. */
export interface Leitura {
  chamadoId: number;
  profileId: string;
  lidoAte: string;
}

export function estaEncerrado(status: StatusChamado): boolean {
  return STATUS_ENCERRADOS.includes(status);
}
