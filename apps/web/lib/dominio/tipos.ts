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

export interface Chamado {
  id: number;
  titulo: string;
  categoriaId: number;
  solicitanteId: string;
  responsavelId: string | null;
  status: StatusChamado;
  prioridade: Prioridade;
  respostasForm: Record<string, string | string[] | boolean | number>;
  prazoSla: string;
  criadoEm: string;
  atualizadoEm: string;
  concluidoEm: string | null;
  canceladoEm: string | null;
  motivoCancelamento: string | null;
}

export function estaEncerrado(status: StatusChamado): boolean {
  return STATUS_ENCERRADOS.includes(status);
}
