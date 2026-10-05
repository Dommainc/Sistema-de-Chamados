// Implementação simulada da FonteDeDados (ADR 0006).
// Reproduz as regras do banco e da API que importam para as telas: o que cada papel enxerga (RLS),
// a máquina de estados e as validações. Toda falha sai como ErroApp do catálogo.

import { validarArquivo } from "@/lib/anexos";
import type {
  ArquivoNovo,
  ChamadoCriado,
  Contadores,
  DadosNovoChamado,
  DadosPrimeiroAcesso,
  FiltroChamados,
  FonteDeDados,
  NovaMensagem,
  PerfilPublico,
} from "@/lib/dados/tipos";
import { validarAcao } from "@/lib/dominio/estados";
import { validarFormulario } from "@/lib/dominio/formulario";
import { adicionarHorasUteis } from "@/lib/dominio/horario-util";
import {
  estaEncerrado,
  type Anexo,
  type Categoria,
  type Chamado,
  type EventoHistorico,
  type Mensagem,
  type Perfil,
} from "@/lib/dominio/tipos";
import { ErroApp, mensagemErro } from "@/lib/erros/catalogo";
import { rotuloStatus } from "@/lib/status";
import { assinar, gravarEstado, lerEstado, proximoId } from "./armazenamento";
import { guardarArquivo, lerArquivo } from "./arquivos";
import { CAMPOS_FORM, CATEGORIAS } from "./exemplos";
import { EXPEDIENTE_SIMULADO } from "./feriados";

function categoriaAtiva(categoriaId: number): Categoria {
  const categoria = CATEGORIAS.find((c) => c.id === categoriaId);
  // No banco: CC004 (categoria inativa ou inexistente) → erro inesperado para o usuário.
  if (!categoria) throw new ErroApp("ERRO_INESPERADO");
  return categoria;
}

function prazoPara(categoria: Categoria, agora: Date): string {
  return adicionarHorasUteis(agora, categoria.slaHoras, EXPEDIENTE_SIMULADO).toISOString();
}

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

    async calcularPrevisao(categoriaId: number) {
      eu();
      return prazoPara(categoriaAtiva(categoriaId), new Date());
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
        prazoSla: prazoPara(categoria, agora),
        criadoEm,
        atualizadoEm: criadoEm,
        concluidoEm: null,
        canceladoEm: null,
        motivoCancelamento: null,
      };

      // Na API real: chamado + anexos + historico + notificacoes numa única transação.
      const atual = lerEstado();
      gravarEstado({
        ...atual,
        chamados: [...atual.chamados, chamado],
        anexos: [...atual.anexos, ...anexos],
        historico: [
          ...atual.historico,
          {
            id: proximoId(atual.historico),
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
      });
      return { id, prazoSla: chamado.prazoSla };
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
        vencidos: abertos.filter((c) => new Date(c.prazoSla).getTime() < agora).length,
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

      const atual = lerEstado();
      const eventos: EventoHistorico[] = voltaAoAtendimento
        ? [
            {
              id: proximoId(atual.historico),
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
      gravarEstado({
        ...atual,
        mensagens: [...atual.mensagens, mensagem],
        anexos: [...atual.anexos, ...anexos],
        historico: [...atual.historico, ...eventos],
        chamados: atual.chamados.map((c) =>
          c.id === chamado.id ? { ...c, status: novoStatus, atualizadoEm: criadoEm } : c,
        ),
      });
      return { ...mensagem };
    },

    async cancelarChamado(chamadoId: number, motivo: string) {
      const perfil = eu();
      const chamado = chamadoVisivel(chamadoId);
      validarAcao(chamado, "cancelar", { id: perfil.id, papel: perfil.papel }, { motivo });
      const agora = new Date().toISOString();
      const atual = lerEstado();
      gravarEstado({
        ...atual,
        chamados: atual.chamados.map((c) =>
          c.id === chamadoId
            ? {
                ...c,
                status: "cancelado",
                motivoCancelamento: motivo.trim(),
                canceladoEm: agora,
                atualizadoEm: agora,
              }
            : c,
        ),
        historico: [
          ...atual.historico,
          {
            id: proximoId(atual.historico),
            chamadoId,
            autorId: perfil.id,
            acao: "cancelado",
            de: chamado.status,
            para: "cancelado",
            detalhe: { motivo: motivo.trim() },
            publico: true,
            criadoEm: agora,
          },
        ],
      });
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
      const perfil = eu();
      const { mensagens, leituras } = lerEstado();
      return visiveis()
        .filter((c) => {
          const lidoAte =
            leituras.find((l) => l.chamadoId === c.id && l.profileId === perfil.id)?.lidoAte ?? "";
          return mensagens.some(
            (m) =>
              m.chamadoId === c.id &&
              m.autorId !== perfil.id &&
              (perfil.papel === "ti" || !m.interna) &&
              m.criadoEm > lidoAte,
          );
        })
        .map((c) => c.id);
    },

    aoMudar(callback: () => void) {
      return assinar(callback);
    },
  };
}
