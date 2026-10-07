// Implementação simulada da FonteDeDados (ADR 0006).
// Reproduz as regras do banco e da API que importam para as telas: o que cada papel enxerga (RLS),
// a máquina de estados e as validações. Toda falha sai como ErroApp do catálogo.

import { validarArquivo } from "@/lib/anexos";
import {
  ENCERRADOS_POR_PAGINA,
  type ArquivoNovo,
  type ChamadoCriado,
  type ChamadoQuadro,
  type Contadores,
  type DadosNovoChamado,
  type DadosPrimeiroAcesso,
  type FiltroChamados,
  type FonteDeDados,
  type NovaMensagem,
  type PaginaEncerrados,
  type PerfilPublico,
} from "@/lib/dados/tipos";
import { validarAcao, type AcaoChamado, type DadosAcao } from "@/lib/dominio/estados";
import { validarFormulario } from "@/lib/dominio/formulario";
import {
  estaEncerrado,
  type Anexo,
  type Categoria,
  type Chamado,
  type EventoHistorico,
  type Mensagem,
  type Notificacao,
  type Perfil,
  type TipoNotificacao,
} from "@/lib/dominio/tipos";
import { ErroApp, mensagemErro } from "@/lib/erros/catalogo";
import { compararPrazo } from "@/lib/prazo";
import { rotuloStatus } from "@/lib/status";
import { assinar, gravarEstado, lerEstado, proximoId, type EstadoSimulado } from "./armazenamento";
import { guardarArquivo, lerArquivo } from "./arquivos";
import { CAMPOS_FORM, CATEGORIAS } from "./exemplos";

function categoriaAtiva(categoriaId: number): Categoria {
  const categoria = CATEGORIAS.find((c) => c.id === categoriaId);
  // No banco: CC004 (categoria inativa ou inexistente) → erro inesperado para o usuário.
  if (!categoria) throw new ErroApp("ERRO_INESPERADO");
  return categoria;
}

/** Prazo mais distante aceito (como a API): evita data digitada errada. */
const PRAZO_MAXIMO_MS = 366 * 24 * 60 * 60 * 1000;

function novoId(): string {
  return (
    globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`
  );
}

function ordenarRecentes(chamados: Chamado[]): Chamado[] {
  return [...chamados].sort((a, b) => b.atualizadoEm.localeCompare(a.atualizadoEm));
}

/** Policy anexos_leitura: TI vê todos; solicitante, os da abertura e os de mensagens não internas. */
function anexoVisivel(anexo: Anexo, perfil: Perfil, mensagens: readonly Mensagem[]): boolean {
  if (perfil.papel === "ti" || anexo.mensagemId === null) return true;
  return mensagens.some((m) => m.id === anexo.mensagemId && !m.interna);
}

type NovoEvento = Omit<EventoHistorico, "id">;
type NovaNotificacao = Omit<Notificacao, "id" | "status">;

/** Dá ids sequenciais (como o identity do banco) aos registros novos. */
function comIds<T extends { id: number }>(existentes: readonly T[], novos: Omit<T, "id">[]): T[] {
  let id = proximoId(existentes);
  return novos.map((n) => ({ ...n, id: id++ }) as T);
}

function notificacao(
  chamado: Chamado,
  destinatarioId: string,
  tipo: TipoNotificacao,
  criadoEm: string,
  extra: Record<string, string> = {},
): NovaNotificacao {
  return {
    chamadoId: chamado.id,
    destinatarioId,
    tipo,
    criadoEm,
    payload: {
      numero: String(chamado.id),
      titulo: chamado.titulo,
      link: `/chamados/${chamado.id}`,
      ...extra,
    },
  };
}

/** Evento do histórico gravado por cada ação (publico = false: só a TI vê). */
const EVENTO_DA_ACAO: Record<
  Exclude<AcaoChamado, "resposta_solicitante">,
  { acao: string; publico: boolean }
> = {
  assumir: { acao: "assumido", publico: true },
  aguardar_usuario: { acao: "status_alterado", publico: true },
  retomar: { acao: "status_alterado", publico: true },
  transferir: { acao: "transferido", publico: false },
  devolver_fila: { acao: "devolvido_fila", publico: false },
  concluir: { acao: "concluido", publico: true },
  cancelar: { acao: "cancelado", publico: true },
};

/** Sem internet a mensagem não sai (na versão real, o fetch falharia). */
function semConexao(): boolean {
  return typeof navigator !== "undefined" && navigator.onLine === false;
}

export function criarFonteSimulada(usuarioId: string): FonteDeDados {
  function eu(): Perfil {
    const perfil = lerEstado().perfis.find((p) => p.id === usuarioId);
    if (!perfil || !perfil.ativo) throw new ErroApp("SEM_PERMISSAO");
    return perfil;
  }

  /** Equivalente à policy chamados_leitura: TI vê todos; solicitante, só os seus. */
  function visiveis(): Chamado[] {
    const perfil = eu();
    const todos = lerEstado().chamados;
    return perfil.papel === "ti" ? todos : todos.filter((c) => c.solicitanteId === perfil.id);
  }

  /** Lê o chamado "sob RLS". Solicitante: inexistente e alheio dão o mesmo erro. */
  function chamadoVisivel(id: number): Chamado {
    const perfil = eu();
    const chamado = visiveis().find((c) => c.id === id);
    if (chamado) return chamado;
    if (perfil.papel === "ti") throw new ErroApp("CHAMADO_NAO_ENCONTRADO", { numero: String(id) });
    throw new ErroApp("SEM_PERMISSAO");
  }

  /** Policy mensagens_leitura: notas internas só para a TI. */
  function mensagensVisiveis(chamadoId: number): Mensagem[] {
    const perfil = eu();
    return lerEstado()
      .mensagens.filter((m) => m.chamadoId === chamadoId && (perfil.papel === "ti" || !m.interna))
      .sort((a, b) => a.criadoEm.localeCompare(b.criadoEm));
  }

  function tecnicosAtivos(): Perfil[] {
    return lerEstado().perfis.filter((p) => p.papel === "ti" && p.ativo);
  }

  /** Grava chamado alterado + eventos + notificações juntos (na API: uma transação). */
  function gravarMudanca(
    chamado: Chamado | null,
    eventos: NovoEvento[],
    notificacoes: NovaNotificacao[],
    extra: Partial<Pick<EstadoSimulado, "mensagens" | "anexos" | "chamados">> = {},
  ): void {
    const atual = lerEstado();
    const chamados = extra.chamados ?? atual.chamados;
    gravarEstado({
      ...atual,
      ...extra,
      chamados: chamado ? chamados.map((c) => (c.id === chamado.id ? chamado : c)) : chamados,
      historico: [...atual.historico, ...comIds(atual.historico, eventos)],
      notificacoes: [
        ...atual.notificacoes,
        ...comIds(
          atual.notificacoes,
          notificacoes.map((n) => ({ ...n, status: "pendente" as const })),
        ),
      ],
    });
  }

  async function executar(
    chamadoId: number,
    acao: AcaoChamado,
    dados: DadosAcao = {},
  ): Promise<Chamado> {
    const perfil = eu();
    const chamado = chamadoVisivel(chamadoId);
    if (acao === "resposta_solicitante") throw new ErroApp("SEM_PERMISSAO"); // só via mensagem
    const ator = { id: perfil.id, papel: perfil.papel };
    const { para, responsavelId } = validarAcao(chamado, acao, ator, dados);

    if (acao === "transferir" && !tecnicosAtivos().some((t) => t.id === responsavelId)) {
      throw new ErroApp("CAMPO_OBRIGATORIO", { campo: "Técnico de destino" });
    }

    const agora = new Date().toISOString();
    const motivo = dados.motivo?.trim();
    const atualizado: Chamado = {
      ...chamado,
      status: para,
      responsavelId,
      atualizadoEm: agora,
      concluidoEm: para === "concluido" ? agora : chamado.concluidoEm,
      canceladoEm: para === "cancelado" ? agora : chamado.canceladoEm,
      motivoCancelamento: para === "cancelado" ? (motivo ?? null) : chamado.motivoCancelamento,
    };

    const { acao: acaoHistorico, publico } = EVENTO_DA_ACAO[acao];
    const detalhe: Record<string, string> = {};
    if (motivo) detalhe.motivo = motivo;
    if (acao === "transferir" && responsavelId) detalhe.para_responsavel_id = responsavelId;
    const evento: NovoEvento = {
      chamadoId,
      autorId: perfil.id,
      acao: acaoHistorico,
      de: chamado.status,
      para,
      detalhe,
      publico,
      criadoEm: agora,
    };

    // Quem é avisado (docs/escopo.md 7.5): o solicitante e, na transferência, o novo responsável.
    const mudanca = { de: chamado.status, para };
    const avisos: NovaNotificacao[] = [];
    const tipo: TipoNotificacao =
      acao === "assumir"
        ? "chamado_assumido"
        : acao === "transferir"
          ? "chamado_transferido"
          : "status_alterado";
    if (chamado.solicitanteId !== perfil.id) {
      avisos.push(notificacao(atualizado, chamado.solicitanteId, tipo, agora, mudanca));
    } else if (chamado.responsavelId && chamado.responsavelId !== perfil.id) {
      avisos.push(notificacao(atualizado, chamado.responsavelId, tipo, agora, mudanca));
    }
    if (acao === "transferir" && responsavelId) {
      avisos.push(notificacao(atualizado, responsavelId, "chamado_transferido", agora, mudanca));
    }

    gravarMudanca(atualizado, [evento], avisos);
    return { ...atualizado };
  }

  /** Mensagens de outras pessoas depois do que eu li, por chamado. */
  function contagemNaoLidas(): Record<number, number> {
    const perfil = eu();
    const { mensagens, leituras } = lerEstado();
    const resultado: Record<number, number> = {};
    for (const c of visiveis()) {
      const lidoAte =
        leituras.find((l) => l.chamadoId === c.id && l.profileId === perfil.id)?.lidoAte ?? "";
      const total = mensagens.filter(
        (m) =>
          m.chamadoId === c.id &&
          m.autorId !== perfil.id &&
          (perfil.papel === "ti" || !m.interna) &&
          m.criadoEm > lidoAte,
      ).length;
      if (total > 0) resultado[c.id] = total;
    }
    return resultado;
  }

  async function guardarAnexos(
    novos: readonly ArquivoNovo[],
    chamadoId: number,
    mensagemId: number | null,
    criadoEm: string,
  ): Promise<Anexo[]> {
    const perfil = eu();
    const anexos: Anexo[] = [];
    try {
      for (const a of novos) {
        const id = novoId();
        await guardarArquivo(id, a.arquivo);
        anexos.push({
          id,
          chamadoId,
          mensagemId,
          nome: a.nome,
          mime: a.mime,
          tamanho: a.tamanho,
          origem: a.origem,
          enviadoPor: perfil.id,
          criadoEm,
        });
      }
    } catch {
      throw new ErroApp("UPLOAD_FALHOU");
    }
    return anexos;
  }

  return {
    modo: "simulada",

    async obterMeuPerfil() {
      return { ...eu() };
    },

    async atualizarMeuPerfil(dados: DadosPrimeiroAcesso) {
      const departamento = dados.departamento.trim();
      const telefone = dados.telefone?.trim() || null;
      const campos = [];
      if (departamento.length < 2 || departamento.length > 100) {
        campos.push({
          campo: "departamento",
          mensagem: "Preencha o campo Departamento para continuar.",
        });
      }
      if (telefone !== null && (telefone.length < 3 || telefone.length > 30)) {
        campos.push({ campo: "telefone", mensagem: "Confira o telefone informado." });
      }
      if (campos.length > 0) {
        throw new ErroApp("CAMPO_OBRIGATORIO", { campo: campos[0].campo }, { campos });
      }

      const estado = lerEstado();
      const atual = eu();
      const atualizado: Perfil = { ...atual, departamento, telefone };
      gravarEstado({
        ...estado,
        perfis: estado.perfis.map((p) => (p.id === atual.id ? atualizado : p)),
      });
      return { ...atualizado };
    },

    async listarPerfisPublicos(): Promise<PerfilPublico[]> {
      eu();
      return lerEstado().perfis.map(({ id, nome, departamento, papel }) => ({
        id,
        nome,
        departamento,
        papel,
      }));
    },

    async obterPerfilCompleto(perfilId: string) {
      const perfil = eu();
      if (perfil.papel !== "ti" && perfilId !== perfil.id) throw new ErroApp("SEM_PERMISSAO");
      const alvo = lerEstado().perfis.find((p) => p.id === perfilId);
      if (!alvo) throw new ErroApp("SEM_PERMISSAO");
      return { ...alvo };
    },

    async listarCategorias() {
      eu();
      return [...CATEGORIAS].sort((a, b) => a.ordem - b.ordem);
    },

    async listarCamposForm(categoriaId: number) {
      eu();
      return CAMPOS_FORM.filter((c) => c.categoriaId === categoriaId).sort(
        (a, b) => a.ordem - b.ordem,
      );
    },

    async criarChamado(dados: DadosNovoChamado): Promise<ChamadoCriado> {
      const perfil = eu();
      const categoria = categoriaAtiva(dados.categoriaId);
      const campos = CAMPOS_FORM.filter((c) => c.categoriaId === categoria.id);
      const { titulo, respostas } = validarFormulario(campos, dados.titulo, dados.respostas);
      dados.anexos.forEach(validarArquivo);

      const agora = new Date();
      const criadoEm = agora.toISOString();
      const id = proximoId(lerEstado().chamados);
      const anexos = await guardarAnexos(dados.anexos, id, null, criadoEm);

      const chamado: Chamado = {
        id,
        titulo,
        categoriaId: categoria.id,
        solicitanteId: perfil.id,
        responsavelId: null,
        status: "pendente",
        prioridade: "media",
        respostasForm: respostas,
        prazoSla: null, // quem define é a TI (docs/adr/0009)
        criadoEm,
        atualizadoEm: criadoEm,
        concluidoEm: null,
        canceladoEm: null,
        motivoCancelamento: null,
      };

      // Na API real: chamado + anexos + historico + notificacoes numa única transação.
      // Avisos: o solicitante e cada técnico ativo (docs/escopo.md 7.5).
      const destinatarios = new Set([perfil.id, ...tecnicosAtivos().map((t) => t.id)]);
      const atual = lerEstado();
      gravarMudanca(
        null,
        [
          {
            chamadoId: id,
            autorId: perfil.id,
            acao: "criado",
            de: null,
            para: "pendente",
            detalhe: {},
            publico: true,
            criadoEm,
          },
        ],
        [...destinatarios].map((d) => notificacao(chamado, d, "chamado_aberto", criadoEm)),
        { chamados: [...atual.chamados, chamado], anexos: [...atual.anexos, ...anexos] },
      );
      return { id };
    },

    async listarChamados(filtro: FiltroChamados) {
      const perfil = eu();
      let lista = visiveis();
      if (perfil.papel === "ti") {
        if (filtro.escopo === "meus") lista = lista.filter((c) => c.solicitanteId === perfil.id);
        if (filtro.escopo === "fila") lista = lista.filter((c) => c.status === "pendente");
        if (filtro.escopo === "meus_atendimentos") {
          lista = lista.filter((c) => c.responsavelId === perfil.id && !estaEncerrado(c.status));
        }
      }
      if (filtro.encerrados !== undefined) {
        lista = lista.filter((c) => estaEncerrado(c.status) === filtro.encerrados);
      }
      return ordenarRecentes(lista);
    },

    async listarQuadro(): Promise<ChamadoQuadro[]> {
      const perfil = eu();
      const { historico } = lerEstado();
      const limite = Date.now() - 7 * 86_400_000;
      const naoLidas = contagemNaoLidas();
      return visiveis()
        .filter(
          (c) =>
            !estaEncerrado(c.status) ||
            new Date(c.concluidoEm ?? c.canceladoEm ?? c.atualizadoEm).getTime() >= limite,
        )
        .map((c) => ({
          ...c,
          // Como no banco: o motivo/autor da transferência só aparece para a TI (historico.publico = false).
          transferidoPorId:
            perfil.papel === "ti"
              ? (historico.filter((h) => h.chamadoId === c.id && h.acao === "transferido").at(-1)
                  ?.autorId ?? null)
              : null,
          naoLidas: naoLidas[c.id] ?? 0,
        }));
    },

    async listarEncerrados(pagina: number): Promise<PaginaEncerrados> {
      const encerrado = (c: Chamado) => c.concluidoEm ?? c.canceladoEm ?? c.atualizadoEm;
      const todos = visiveis()
        .filter((c) => estaEncerrado(c.status))
        .sort((a, b) => encerrado(b).localeCompare(encerrado(a)));
      const inicio = (Math.max(1, pagina) - 1) * ENCERRADOS_POR_PAGINA;
      return {
        itens: todos.slice(inicio, inicio + ENCERRADOS_POR_PAGINA).map((c) => ({ ...c })),
        total: todos.length,
      };
    },

    async obterChamado(id: number) {
      return { ...chamadoVisivel(id) };
    },

    async obterContadores(): Promise<Contadores> {
      const perfil = eu();
      const abertos = visiveis().filter((c) => !estaEncerrado(c.status));
      const agora = Date.now();
      return {
        fila: abertos.filter((c) => c.status === "pendente").length,
        meusAtendimentos: abertos.filter((c) => c.responsavelId === perfil.id).length,
        vencidos: abertos.filter(
          (c) => c.prazoSla !== null && new Date(c.prazoSla).getTime() < agora,
        ).length,
      };
    },

    async listarMensagens(chamadoId: number) {
      chamadoVisivel(chamadoId);
      return mensagensVisiveis(chamadoId).map((m) => ({ ...m }));
    },

    async listarHistorico(chamadoId: number): Promise<EventoHistorico[]> {
      const perfil = eu();
      chamadoVisivel(chamadoId);
      return lerEstado()
        .historico.filter((h) => h.chamadoId === chamadoId && (perfil.papel === "ti" || h.publico))
        .sort((a, b) => a.criadoEm.localeCompare(b.criadoEm));
    },

    async listarAnexos(chamadoId: number) {
      const perfil = eu();
      chamadoVisivel(chamadoId);
      const { anexos, mensagens } = lerEstado();
      return anexos.filter((a) => a.chamadoId === chamadoId && anexoVisivel(a, perfil, mensagens));
    },

    async abrirAnexo(anexoId: string) {
      const perfil = eu();
      const { anexos, mensagens } = lerEstado();
      const anexo = anexos.find((a) => a.id === anexoId);
      if (!anexo) throw new ErroApp("SEM_PERMISSAO");
      chamadoVisivel(anexo.chamadoId);
      if (!anexoVisivel(anexo, perfil, mensagens)) throw new ErroApp("SEM_PERMISSAO");
      const arquivo = await lerArquivo(anexo.id);
      return arquivo ? URL.createObjectURL(arquivo) : null;
    },

    async enviarMensagem(dados: NovaMensagem): Promise<Mensagem> {
      const perfil = eu();
      if (semConexao()) throw new ErroApp("MENSAGEM_NAO_ENVIADA");
      const chamado = chamadoVisivel(dados.chamadoId);
      if (estaEncerrado(chamado.status)) {
        throw new ErroApp("TRANSICAO_INVALIDA", {
          de: rotuloStatus(chamado.status, perfil.papel).texto,
          para: rotuloStatus("em_andamento", perfil.papel).texto,
        });
      }
      if (dados.interna && perfil.papel !== "ti") throw new ErroApp("SEM_PERMISSAO");
      const conteudo = dados.conteudo.trim();
      if (!conteudo && dados.anexos.length === 0) {
        const mensagem = mensagemErro("CAMPO_OBRIGATORIO", { campo: "Mensagem" });
        throw new ErroApp(
          "CAMPO_OBRIGATORIO",
          { campo: "Mensagem" },
          { campos: [{ campo: "conteudo", mensagem }] },
        );
      }
      dados.anexos.forEach(validarArquivo);

      // Resposta do solicitante em "aguardando_usuario" volta o chamado para "em_andamento".
      const voltaAoAtendimento =
        chamado.status === "aguardando_usuario" && chamado.solicitanteId === perfil.id;
      const novoStatus = voltaAoAtendimento
        ? validarAcao(chamado, "resposta_solicitante", { id: perfil.id, papel: perfil.papel }).para
        : chamado.status;

      const criadoEm = new Date().toISOString();
      const mensagem: Mensagem = {
        id: proximoId(lerEstado().mensagens),
        chamadoId: chamado.id,
        autorId: perfil.id,
        conteudo: conteudo.slice(0, 10_000),
        interna: Boolean(dados.interna),
        criadoEm,
      };
      const anexos = await guardarAnexos(dados.anexos, chamado.id, mensagem.id, criadoEm);

      const eventos: NovoEvento[] = voltaAoAtendimento
        ? [
            {
              chamadoId: chamado.id,
              autorId: null, // automático
              acao: "status_alterado",
              de: chamado.status,
              para: novoStatus,
              detalhe: { motivo: "resposta_do_solicitante" },
              publico: true,
              criadoEm,
            },
          ]
        : [];
      // Mensagem não interna avisa a outra parte: solicitante ↔ responsável (sem responsável → TI).
      const atualizado: Chamado = { ...chamado, status: novoStatus, atualizadoEm: criadoEm };
      const destinatarios: string[] = dados.interna
        ? []
        : perfil.id === chamado.solicitanteId
          ? chamado.responsavelId
            ? [chamado.responsavelId]
            : tecnicosAtivos().map((t) => t.id)
          : [chamado.solicitanteId];
      const atual = lerEstado();
      gravarMudanca(
        atualizado,
        eventos,
        destinatarios
          .filter((d) => d !== perfil.id)
          .map((d) => notificacao(atualizado, d, "nova_mensagem", criadoEm)),
        { mensagens: [...atual.mensagens, mensagem], anexos: [...atual.anexos, ...anexos] },
      );
      return { ...mensagem };
    },

    async cancelarChamado(chamadoId: number, motivo: string) {
      await executar(chamadoId, "cancelar", { motivo });
    },

    async marcarComoLido(chamadoId: number) {
      const perfil = eu();
      const chamado = chamadoVisivel(chamadoId);
      const ultima = mensagensVisiveis(chamadoId).at(-1)?.criadoEm ?? chamado.criadoEm;
      const atual = lerEstado();
      const existente = atual.leituras.find(
        (l) => l.chamadoId === chamadoId && l.profileId === perfil.id,
      );
      if (existente && existente.lidoAte >= ultima) return; // nada novo: não grava (evita laço)
      gravarEstado({
        ...atual,
        leituras: [
          ...atual.leituras.filter((l) => l !== existente),
          { chamadoId, profileId: perfil.id, lidoAte: ultima },
        ],
      });
    },

    async listarNaoLidos() {
      return Object.keys(contagemNaoLidas()).map(Number);
    },

    async contarNaoLidas() {
      return contagemNaoLidas();
    },

    async executarAcao(chamadoId: number, acao: AcaoChamado, dados?: DadosAcao) {
      return executar(chamadoId, acao, dados);
    },

    async definirPrazo(chamadoId: number, prazo: string, motivo?: string) {
      const perfil = eu();
      const chamado = chamadoVisivel(chamadoId);
      if (perfil.papel !== "ti") throw new ErroApp("SEM_PERMISSAO");
      if (estaEncerrado(chamado.status)) {
        const rotulo = rotuloStatus(chamado.status, "ti").texto;
        throw new ErroApp("TRANSICAO_INVALIDA", { de: rotulo, para: rotulo });
      }
      const quando = new Date(prazo).getTime();
      const agora = Date.now();
      if (Number.isNaN(quando) || quando <= agora || quando > agora + PRAZO_MAXIMO_MS) {
        throw new ErroApp("PRAZO_INVALIDO");
      }
      const texto = motivo?.trim();
      if (chamado.prazoSla !== null && !texto) throw new ErroApp("MOTIVO_OBRIGATORIO");

      const criadoEm = new Date(agora).toISOString();
      const novoPrazo = new Date(quando).toISOString();
      const atualizado: Chamado = { ...chamado, prazoSla: novoPrazo, atualizadoEm: criadoEm };
      const detalhe: Record<string, string> = { prazo: novoPrazo };
      if (chamado.prazoSla !== null) detalhe.prazo_anterior = chamado.prazoSla;
      if (texto) detalhe.motivo = texto;
      // Público: o solicitante vê a nova previsão e o motivo.
      const evento: NovoEvento = {
        chamadoId,
        autorId: perfil.id,
        acao: "prazo_definido",
        de: chamado.status,
        para: chamado.status,
        detalhe,
        publico: true,
        criadoEm,
      };
      const avisos =
        chamado.solicitanteId !== perfil.id
          ? [notificacao(atualizado, chamado.solicitanteId, "prazo_definido", criadoEm, detalhe)]
          : [];
      gravarMudanca(atualizado, [evento], avisos);
      return { ...atualizado };
    },

    async proximoDaFila() {
      if (eu().papel !== "ti") throw new ErroApp("SEM_PERMISSAO");
      const fila = visiveis()
        .filter((c) => c.status === "pendente")
        .sort(compararPrazo); // mesma ordem da coluna Novos
      return fila[0] ? { ...fila[0] } : null;
    },

    aoMudar(callback: () => void) {
      return assinar(callback);
    },
  };
}
