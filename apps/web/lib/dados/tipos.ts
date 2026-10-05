// Contrato da camada de dados (ADR 0006). As telas só conhecem esta interface;
// a implementação "simulada" (agora) e a "real" (Supabase + API, depois da 1A-2) a cumprem.
// Erros: toda falha é um ErroApp do catálogo (lib/erros/catalogo.ts).

import type { ModoFonteDados } from "@/lib/dados/config";
import type { CampoForm, Categoria, Chamado, Papel, Perfil } from "@/lib/dominio/tipos";

/** O mínimo que a sessão sabe do usuário (o restante vem de obterMeuPerfil). */
export interface UsuarioSessao {
  id: string;
  nome: string;
  papel: Papel;
}

/** Dados de exibição de qualquer colaborador (view perfis_publicos: sem contato). */
export interface PerfilPublico {
  id: string;
  nome: string;
  departamento: string | null;
  papel: Papel;
}

/**
 * Escopo da listagem. Como no RLS, o solicitante só recebe os próprios chamados
 * em qualquer escopo.
 */
export type EscopoChamados = "meus" | "fila" | "meus_atendimentos" | "todos";

export interface FiltroChamados {
  escopo: EscopoChamados;
  /** true = só concluídos/cancelados; false = só em andamento; omitido = todos. */
  encerrados?: boolean;
}

export interface Contadores {
  /** Pendentes (sem responsável). */
  fila: number;
  /** Não encerrados com responsável = eu. */
  meusAtendimentos: number;
  /** Não encerrados com prazo vencido. */
  vencidos: number;
}

export interface DadosPrimeiroAcesso {
  departamento: string;
  telefone: string | null;
}

export interface FonteDeDados {
  readonly modo: ModoFonteDados;

  obterMeuPerfil(): Promise<Perfil>;
  /** Só departamento e telefone (o papel nunca é editável). */
  atualizarMeuPerfil(dados: DadosPrimeiroAcesso): Promise<Perfil>;
  listarPerfisPublicos(): Promise<PerfilPublico[]>;

  listarCategorias(): Promise<Categoria[]>;
  listarCamposForm(categoriaId: number): Promise<CampoForm[]>;

  listarChamados(filtro: FiltroChamados): Promise<Chamado[]>;
  /** SEM_PERMISSAO se não puder ver; CHAMADO_NAO_ENCONTRADO só para a TI. */
  obterChamado(id: number): Promise<Chamado>;
  obterContadores(): Promise<Contadores>;

  /** Avisa quando os dados mudarem (simula o Realtime). Devolve a função para cancelar. */
  aoMudar(callback: () => void): () => void;
}
