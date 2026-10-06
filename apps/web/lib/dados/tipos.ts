// Contrato da camada de dados (ADR 0006). As telas só conhecem esta interface;
// a implementação "simulada" (agora) e a "real" (Supabase + API, depois da 1A-2) a cumprem.
// Erros: toda falha é um ErroApp do catálogo (lib/erros/catalogo.ts).

import type { ModoFonteDados } from "@/lib/dados/config";
import type { AcaoChamado, DadosAcao } from "@/lib/dominio/estados";
import type {
  Anexo,
  CampoForm,
  Categoria,
  Chamado,
  EventoHistorico,
  Mensagem,
  OrigemAnexo,
  Papel,
  Perfil,
} from "@/lib/dominio/tipos";

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

/** Arquivo escolhido ou colado, ainda não enviado. */
export interface ArquivoNovo {
  arquivo: Blob;
  nome: string;
  mime: string;
  tamanho: number;
  origem: OrigemAnexo;
}

export interface DadosNovoChamado {
  categoriaId: number;
  /** "Resumo do problema". */
  titulo: string;
  /** Respostas brutas do formulário, por campos_form.chave (validadas na criação). */
  respostas: Record<string, unknown>;
  anexos: ArquivoNovo[];
}

export interface ChamadoCriado {
  id: number;
  prazoSla: string;
}

export interface NovaMensagem {
  chamadoId: number;
  conteudo: string;
  /** Nota interna (só a TI vê). Solicitante → SEM_PERMISSAO. */
  interna?: boolean;
  anexos: ArquivoNovo[];
}

export interface FonteDeDados {
  readonly modo: ModoFonteDados;

  obterMeuPerfil(): Promise<Perfil>;
  /** Só departamento e telefone (o papel nunca é editável). */
  atualizarMeuPerfil(dados: DadosPrimeiroAcesso): Promise<Perfil>;
  listarPerfisPublicos(): Promise<PerfilPublico[]>;
  /** Perfil com contato (e-mail, telefone). TI lê todos; cada um lê o próprio (policy profiles_leitura). */
  obterPerfilCompleto(perfilId: string): Promise<Perfil>;

  listarCategorias(): Promise<Categoria[]>;
  listarCamposForm(categoriaId: number): Promise<CampoForm[]>;

  /** Prazo previsto se o chamado fosse aberto agora (horas úteis da categoria). */
  calcularPrevisao(categoriaId: number): Promise<string>;
  /**
   * Abre o chamado (POST /chamados). Erros: CAMPO_OBRIGATORIO (com `campos`),
   * ANEXO_MUITO_GRANDE, ANEXO_TIPO_INVALIDO, UPLOAD_FALHOU.
   */
  criarChamado(dados: DadosNovoChamado): Promise<ChamadoCriado>;

  listarChamados(filtro: FiltroChamados): Promise<Chamado[]>;
  /** SEM_PERMISSAO se não puder ver; CHAMADO_NAO_ENCONTRADO só para a TI. */
  obterChamado(id: number): Promise<Chamado>;
  obterContadores(): Promise<Contadores>;

  /** Conversa do chamado. Solicitante nunca recebe notas internas (RLS). */
  listarMensagens(chamadoId: number): Promise<Mensagem[]>;
  /** Linha do tempo. Solicitante só recebe eventos públicos (RLS). */
  listarHistorico(chamadoId: number): Promise<EventoHistorico[]>;
  /** Anexos visíveis (os de nota interna não chegam ao solicitante). */
  listarAnexos(chamadoId: number): Promise<Anexo[]>;
  /** URL temporária para ver/baixar o arquivo; nulo se o arquivo não estiver disponível. */
  abrirAnexo(anexoId: string): Promise<string | null>;
  /**
   * POST /chamados/{id}/mensagens. Erros: CAMPO_OBRIGATORIO (sem texto nem anexo),
   * TRANSICAO_INVALIDA (encerrado), SEM_PERMISSAO, MENSAGEM_NAO_ENVIADA (falha de envio).
   * Resposta do solicitante em aguardando_usuario volta o chamado para em_andamento.
   */
  enviarMensagem(dados: NovaMensagem): Promise<Mensagem>;
  /** POST /chamados/{id}/cancelar. Erros: MOTIVO_OBRIGATORIO, CANCELAMENTO_NAO_PERMITIDO... */
  cancelarChamado(chamadoId: number, motivo: string): Promise<void>;
  /** Marca a conversa como lida por mim (tabela chamado_leituras). */
  marcarComoLido(chamadoId: number): Promise<void>;
  /** Números dos meus chamados com mensagem da TI ainda não lida ("• Nova mensagem"). */
  listarNaoLidos(): Promise<number[]>;
  /** Quantas mensagens não lidas cada chamado tem (contador 💬 dos cartões da TI). */
  contarNaoLidas(): Promise<Record<number, number>>;

  /**
   * Ação da máquina de estados (POST /chamados/{id}/assumir, /transferir, /status...).
   * Grava histórico e notificação pendente na mesma operação. Erros do catálogo
   * (TRANSICAO_INVALIDA, MOTIVO_OBRIGATORIO, SEM_PERMISSAO, CAMPO_OBRIGATORIO...).
   */
  executarAcao(chamadoId: number, acao: AcaoChamado, dados?: DadosAcao): Promise<Chamado>;
  /** Chamado sem responsável com o prazo mais apertado ("Pegar o próximo"). Só TI. */
  proximoDaFila(): Promise<Chamado | null>;

  /** Avisa quando os dados mudarem (simula o Realtime). Devolve a função para cancelar. */
  aoMudar(callback: () => void): () => void;
}
