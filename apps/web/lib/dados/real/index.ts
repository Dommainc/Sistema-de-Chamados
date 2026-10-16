"use client";

// Camada de dados `real` (ADR 0002, 0006): lê direto do Supabase com a anon key (o RLS filtra) e manda toda ação
// de negócio para a FastAPI, com o token da sessão. Mesmo contrato da versão simulada (lib/dados/tipos.ts).

import type { PostgrestError, SupabaseClient } from "@supabase/supabase-js";
import type {
  ArquivoNovo,
  Contadores,
  DadosMetricas,
  DadosNovoChamado,
  FiltroChamados,
  FonteDeDados,
  NovaMensagem,
  OpcaoSistema,
  UsuarioSessao,
} from "@/lib/dados/tipos";
import { ENCERRADOS_POR_PAGINA } from "@/lib/dados/tipos";
import type { AcaoChamado, DadosAcao } from "@/lib/dominio/estados";
import type { Chamado, Mensagem, PrioridadeDaTi } from "@/lib/dominio/tipos";
import { ErroApp } from "@/lib/erros/catalogo";
import { CHAVE_SISTEMA } from "@/lib/sistemas";
import { clienteNavegador } from "@/lib/supabase/navegador";
import { chamarApi, type OpcoesApi } from "./api";
import {
  anexoDaLinha,
  avaliacaoDaLinha,
  campoDaLinha,
  categoriaDaLinha,
  chamadoDaLinha,
  COLUNAS_CHAMADO,
  eventoDaLinha,
  mensagemDaLinha,
  perfilDaLinha,
  perfilPublicoDaLinha,
  respostaProntaDaLinha,
  type LinhaAnexo,
  type LinhaAvaliacao,
  type LinhaCampo,
  type LinhaCategoria,
  type LinhaChamado,
  type LinhaHistorico,
  type LinhaMensagem,
  type LinhaPerfil,
  type LinhaPerfilPublico,
  type LinhaRespostaPronta,
} from "./mapear";

const ENCERRADOS = "(concluido,cancelado)";
const TABELAS_AO_VIVO = ["chamados", "mensagens", "historico", "chamado_leituras"] as const;

/** Erro de leitura do Supabase → catálogo (42501 = sem permissão pelo RLS/grant). Nunca a mensagem crua. */
function erroDeLeitura(erro: PostgrestError): ErroApp {
  if (erro.code === "42501") return new ErroApp("SEM_PERMISSAO");
  if (erro.code === "PGRST301" || erro.message?.includes("JWT"))
    return new ErroApp("SESSAO_EXPIRADA");
  const convertido = new ErroApp("ERRO_INESPERADO");
  console.error(`[${convertido.ref}]`, erro.code);
  return convertido;
}

/** Resultado de uma consulta do Supabase: os dados ou o erro do catálogo. */
function ler<T>(resultado: { data: T | null; error: PostgrestError | null }): T {
  if (resultado.error) throw erroDeLeitura(resultado.error);
  return resultado.data as T;
}

export function criarFonteReal(
  usuario: UsuarioSessao,
  supabase: SupabaseClient = clienteNavegador(),
): FonteDeDados {
  const ouvintes = new Set<() => void>();
  let canal: ReturnType<SupabaseClient["channel"]> | null = null;
  let aviso: ReturnType<typeof setTimeout> | null = null;

  /** Avisa as telas (agrupando rajadas de eventos do Realtime). */
  function avisar() {
    if (aviso) clearTimeout(aviso);
    aviso = setTimeout(() => ouvintes.forEach((cb) => cb()), 150);
  }

  async function token(): Promise<string | null> {
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token ?? null;
  }

  /** Chama a API com o token; sessão vencida leva de volta ao login com o aviso. */
  async function api<T>(caminho: string, opcoes: Omit<OpcoesApi, "token"> = {}): Promise<T> {
    try {
      return await chamarApi<T>(caminho, { ...opcoes, token: await token() });
    } catch (erro) {
      if (
        erro instanceof ErroApp &&
        erro.codigo === "SESSAO_EXPIRADA" &&
        typeof window !== "undefined"
      ) {
        // Recarga completa de propósito: limpa o estado da sessão vencida antes do login.
        // eslint-disable-next-line @next/next/no-location-assign-relative-destination
        window.location.assign("/login?motivo=sessao");
      }
      throw erro;
    }
  }

  /** Envia cada arquivo direto ao Storage (URL assinada da API) e devolve o que a API precisa para confirmar. */
  async function enviarArquivos(arquivos: ArquivoNovo[]) {
    const enviados: { upload_id: string; nome: string; origem: ArquivoNovo["origem"] }[] = [];
    for (const a of arquivos) {
      const { upload_id: uploadId, url } = await api<{ upload_id: string; url: string }>(
        "/anexos/upload-url",
        { metodo: "POST", corpo: { nome: a.nome, mime: a.mime, tamanho: a.tamanho } },
      );
      let ok = false;
      try {
        const resposta = await fetch(url, {
          method: "PUT",
          headers: { "Content-Type": a.mime },
          body: a.arquivo,
        });
        ok = resposta.ok;
      } catch {
        ok = false;
      }
      if (!ok) throw new ErroApp("UPLOAD_FALHOU");
      enviados.push({ upload_id: uploadId, nome: a.nome, origem: a.origem });
    }
    return enviados;
  }

  async function obterChamado(id: number): Promise<Chamado> {
    const linha = ler(
      await supabase
        .from("chamados")
        .select(COLUNAS_CHAMADO)
        .eq("id", id)
        .maybeSingle<LinhaChamado>(),
    );
    if (linha) return chamadoDaLinha(linha);
    // Como na API: só a TI sabe que o número não existe; para o solicitante é "sem acesso".
    throw usuario.papel === "ti"
      ? new ErroApp("CHAMADO_NAO_ENCONTRADO", { numero: String(id) })
      : new ErroApp("SEM_PERMISSAO");
  }

  /** Depois de uma ação, devolve o chamado completo e avisa as telas na hora (sem esperar o Realtime). */
  async function depoisDaAcao(id: number): Promise<Chamado> {
    const chamado = await obterChamado(id);
    avisar();
    return chamado;
  }

  const fonte: FonteDeDados = {
    modo: "real",

    async obterMeuPerfil() {
      const linha = ler(
        await supabase
          .from("profiles")
          .select("id, nome, email, departamento, telefone, papel, ativo")
          .eq("id", usuario.id)
          .maybeSingle<LinhaPerfil>(),
      );
      if (!linha) throw new ErroApp("SEM_PERMISSAO");
      return perfilDaLinha(linha);
    },

    async atualizarMeuPerfil(dados) {
      const perfil = await api<LinhaPerfil>("/me", {
        metodo: "PATCH",
        corpo: { departamento: dados.departamento, telefone: dados.telefone },
      });
      return perfilDaLinha(perfil);
    },

    async salvarTema(tema) {
      await api<LinhaPerfil>("/me/tema", { metodo: "PATCH", corpo: { tema } });
    },

    async listarPerfisPublicos() {
      const linhas = ler(
        await supabase
          .from("perfis_publicos")
          .select("id, nome, departamento, papel")
          .returns<LinhaPerfilPublico[]>(),
      );
      return linhas.map(perfilPublicoDaLinha);
    },

    async obterPerfilCompleto(perfilId) {
      const linha = ler(
        await supabase
          .from("profiles")
          .select("id, nome, email, departamento, telefone, papel, ativo")
          .eq("id", perfilId)
          .maybeSingle<LinhaPerfil>(),
      );
      if (!linha) throw new ErroApp("SEM_PERMISSAO");
      return perfilDaLinha(linha);
    },

    async listarCategorias() {
      const linhas = ler(
        await supabase
          .from("categorias")
          .select("id, nome, nome_curto, icone, descricao, sla_horas, ordem")
          .eq("ativo", true)
          .order("ordem")
          .returns<LinhaCategoria[]>(),
      );
      return linhas.map(categoriaDaLinha);
    },

    async listarCamposForm(categoriaId) {
      const linhas = ler(
        await supabase
          .from("campos_form")
          .select("id, categoria_id, chave, label, tipo, obrigatorio, opcoes, cores, ajuda, ordem")
          .eq("categoria_id", categoriaId)
          .eq("ativo", true)
          .order("ordem")
          .returns<LinhaCampo[]>(),
      );
      return linhas.map(campoDaLinha);
    },

    async listarSistemas(): Promise<OpcaoSistema[]> {
      const linhas = ler(
        await supabase
          .from("campos_form")
          .select("opcoes, cores")
          .eq("chave", CHAVE_SISTEMA)
          .eq("ativo", true)
          .limit(1)
          .returns<Pick<LinhaCampo, "opcoes" | "cores">[]>(),
      );
      const campo = linhas[0];
      return (campo?.opcoes ?? []).map((nome) => ({ nome, cor: campo?.cores?.[nome] ?? null }));
    },

    async listarDadosMetricas(inicio, fim): Promise<DadosMetricas> {
      if (usuario.papel !== "ti") throw new ErroApp("SEM_PERMISSAO");
      const chamados = ler(
        await supabase
          .from("chamados")
          .select(COLUNAS_CHAMADO)
          .lt("criado_em", fim)
          .or(
            `status.not.in.${ENCERRADOS},criado_em.gte.${inicio},concluido_em.gte.${inicio},cancelado_em.gte.${inicio}`,
          )
          .returns<LinhaChamado[]>(),
      ).map(chamadoDaLinha);
      const ids = chamados.map((c) => c.id);
      const [historico, avaliacoes, configuracoes, feriados] = await Promise.all([
        ids.length
          ? supabase
              .from("historico")
              .select("id, chamado_id, autor_id, acao, de, para, detalhe, publico, criado_em")
              .in("chamado_id", ids)
              .order("criado_em")
              .returns<LinhaHistorico[]>()
          : Promise.resolve({ data: [] as LinhaHistorico[], error: null }),
        ids.length
          ? supabase
              .from("avaliacoes")
              .select("chamado_id, avaliador_id, nota, comentario, criado_em")
              .in("chamado_id", ids)
              .returns<LinhaAvaliacao[]>()
          : Promise.resolve({ data: [] as LinhaAvaliacao[], error: null }),
        supabase
          .from("configuracoes")
          .select("chave, valor")
          .in("chave", ["expediente_inicio", "expediente_fim"])
          .returns<{ chave: string; valor: unknown }[]>(),
        supabase.from("feriados").select("data").eq("ativo", true).returns<{ data: string }[]>(),
      ]);
      const config = new Map(ler(configuracoes).map((c) => [c.chave, String(c.valor)]));
      return {
        chamados,
        historico: ler(historico).map(eventoDaLinha),
        avaliacoes: ler(avaliacoes).map(avaliacaoDaLinha),
        expediente: {
          inicio: config.get("expediente_inicio") ?? "08:00",
          fim: config.get("expediente_fim") ?? "20:00",
          feriados: ler(feriados).map((f) => f.data),
        },
      };
    },

    async avaliarChamado(chamadoId, nota, comentario) {
      const salva = await api<{
        chamado_id: number;
        nota: number;
        comentario: string | null;
        criado_em: string;
      }>(`/chamados/${chamadoId}/avaliacao`, {
        metodo: "POST",
        corpo: { nota, comentario: comentario ?? null },
      });
      avisar();
      return avaliacaoDaLinha({ ...salva, avaliador_id: usuario.id });
    },

    async obterAvaliacao(chamadoId) {
      const linha = ler(
        await supabase
          .from("avaliacoes")
          .select("chamado_id, avaliador_id, nota, comentario, criado_em")
          .eq("chamado_id", chamadoId)
          .maybeSingle<LinhaAvaliacao>(),
      );
      return linha ? avaliacaoDaLinha(linha) : null;
    },

    async listarAvaliacoes() {
      const linhas = ler(
        await supabase
          .from("avaliacoes")
          .select("chamado_id, avaliador_id, nota, comentario, criado_em")
          .order("criado_em", { ascending: false })
          .returns<LinhaAvaliacao[]>(),
      );
      return linhas.map(avaliacaoDaLinha);
    },

    async listarRespostasProntas() {
      const linhas = ler(
        await supabase
          .from("respostas_prontas")
          .select("id, titulo, texto, ordem")
          .order("ordem")
          .returns<LinhaRespostaPronta[]>(),
      );
      return linhas.map(respostaProntaDaLinha);
    },

    async criarChamado(dados: DadosNovoChamado) {
      const anexos = await enviarArquivos(dados.anexos);
      const criado = await api<{ id: number }>("/chamados", {
        metodo: "POST",
        corpo: {
          categoria_id: dados.categoriaId,
          titulo: dados.titulo,
          respostas: dados.respostas,
          anexos,
        },
      });
      avisar();
      return { id: Number(criado.id) };
    },

    async listarChamados(filtro: FiltroChamados) {
      let consulta = supabase.from("chamados").select(COLUNAS_CHAMADO);
      if (filtro.escopo === "meus") consulta = consulta.eq("solicitante_id", usuario.id);
      if (filtro.escopo === "fila")
        consulta = consulta.eq("status", "pendente").is("responsavel_id", null);
      if (filtro.escopo === "meus_atendimentos") {
        consulta = consulta.eq("responsavel_id", usuario.id).not("status", "in", ENCERRADOS);
      }
      if (filtro.encerrados === true) consulta = consulta.in("status", ["concluido", "cancelado"]);
      if (filtro.encerrados === false) consulta = consulta.not("status", "in", ENCERRADOS);
      const linhas = ler(
        await consulta.order("criado_em", { ascending: false }).returns<LinhaChamado[]>(),
      );
      return linhas.map(chamadoDaLinha);
    },

    async listarQuadro() {
      const linhas = ler(
        await supabase
          .from("chamados_quadro")
          .select(`${COLUNAS_CHAMADO}, transferido_por, nao_lidas`)
          .returns<(LinhaChamado & { transferido_por: string | null; nao_lidas: number })[]>(),
      );
      return linhas.map((l) => ({
        ...chamadoDaLinha(l),
        transferidoPorId: l.transferido_por,
        naoLidas: Number(l.nao_lidas ?? 0),
      }));
    },

    async listarEncerrados(pagina) {
      const inicio = (Math.max(1, pagina) - 1) * ENCERRADOS_POR_PAGINA;
      const resultado = await supabase
        .from("chamados_encerrados")
        .select(COLUNAS_CHAMADO, { count: "exact" })
        .order("encerrado_em", { ascending: false })
        .range(inicio, inicio + ENCERRADOS_POR_PAGINA - 1)
        .returns<LinhaChamado[]>();
      const linhas = ler(resultado);
      return { itens: linhas.map(chamadoDaLinha), total: resultado.count ?? linhas.length };
    },

    obterChamado,

    async obterContadores(): Promise<Contadores> {
      const contar = async (
        consulta: PromiseLike<{ count: number | null; error: PostgrestError | null }>,
      ) => {
        const { count, error } = await consulta;
        if (error) throw erroDeLeitura(error);
        return count ?? 0;
      };
      const base = () => supabase.from("chamados").select("id", { count: "exact", head: true });
      const [fila, meusAtendimentos, vencidos] = await Promise.all([
        contar(base().eq("status", "pendente").is("responsavel_id", null)),
        contar(base().eq("responsavel_id", usuario.id).not("status", "in", ENCERRADOS)),
        contar(base().not("status", "in", ENCERRADOS).lt("prazo_sla", new Date().toISOString())),
      ]);
      return { fila, meusAtendimentos, vencidos };
    },

    async listarMensagens(chamadoId) {
      const linhas = ler(
        await supabase
          .from("mensagens")
          .select("id, chamado_id, autor_id, conteudo, interna, criado_em")
          .eq("chamado_id", chamadoId)
          .order("criado_em")
          .order("id")
          .returns<LinhaMensagem[]>(),
      );
      return linhas.map(mensagemDaLinha);
    },

    async listarHistorico(chamadoId) {
      const linhas = ler(
        await supabase
          .from("historico")
          .select("id, chamado_id, autor_id, acao, de, para, detalhe, publico, criado_em")
          .eq("chamado_id", chamadoId)
          .order("criado_em")
          .order("id")
          .returns<LinhaHistorico[]>(),
      );
      return linhas.map(eventoDaLinha);
    },

    async listarAnexos(chamadoId) {
      const linhas = ler(
        await supabase
          .from("anexos")
          .select(
            "id, chamado_id, mensagem_id, nome, mime, tamanho, origem, enviado_por, criado_em",
          )
          .eq("chamado_id", chamadoId)
          .order("criado_em")
          .returns<LinhaAnexo[]>(),
      );
      return linhas.map(anexoDaLinha);
    },

    async abrirAnexo(anexoId) {
      try {
        return (await api<{ url: string }>(`/anexos/${anexoId}/url`)).url;
      } catch {
        return null;
      }
    },

    async enviarMensagem(dados: NovaMensagem): Promise<Mensagem> {
      const anexos = await enviarArquivos(dados.anexos);
      const salva = await api<{ id: number; criado_em: string }>(
        `/chamados/${dados.chamadoId}/mensagens`,
        {
          metodo: "POST",
          corpo: { conteudo: dados.conteudo, interna: dados.interna ?? false, anexos },
          erroDeRede: "MENSAGEM_NAO_ENVIADA",
        },
      );
      avisar();
      return {
        id: Number(salva.id),
        chamadoId: dados.chamadoId,
        autorId: usuario.id,
        conteudo: dados.conteudo,
        interna: dados.interna ?? false,
        criadoEm: salva.criado_em,
      };
    },

    async marcarComoLido(chamadoId) {
      await api<void>(`/chamados/${chamadoId}/lido`, { metodo: "POST" });
    },

    async lidoPeloSolicitanteAte(chamadoId, solicitanteId) {
      if (usuario.papel !== "ti") return null;
      const linha = ler(
        await supabase
          .from("chamado_leituras")
          .select("lido_ate")
          .eq("chamado_id", chamadoId)
          .eq("profile_id", solicitanteId)
          .maybeSingle<{ lido_ate: string }>(),
      );
      return linha?.lido_ate ?? null;
    },

    async listarNaoLidos() {
      const linhas = ler(
        await supabase
          .from("chamados_quadro")
          .select("id")
          .eq("solicitante_id", usuario.id)
          .gt("nao_lidas", 0)
          .returns<{ id: number }[]>(),
      );
      return linhas.map((l) => Number(l.id));
    },

    async contarNaoLidas() {
      const linhas = ler(
        await supabase
          .from("chamados_quadro")
          .select("id, nao_lidas")
          .gt("nao_lidas", 0)
          .returns<{ id: number; nao_lidas: number }[]>(),
      );
      return Object.fromEntries(linhas.map((l) => [Number(l.id), Number(l.nao_lidas)]));
    },

    async executarAcao(chamadoId: number, acao: AcaoChamado, dados: DadosAcao = {}) {
      const rota: Record<Exclude<AcaoChamado, "resposta_solicitante">, [string, unknown]> = {
        assumir: ["assumir", undefined],
        concluir: ["concluir", undefined],
        transferir: [
          "transferir",
          { destino_id: dados.destinoId ?? null, motivo: dados.motivo ?? "" },
        ],
        cancelar: ["cancelar", { motivo: dados.motivo ?? "" }],
      };
      // "resposta_solicitante" é automática: acontece ao responder no chat.
      if (acao === "resposta_solicitante") throw new ErroApp("SEM_PERMISSAO");
      const [caminho, corpo] = rota[acao];
      await api(`/chamados/${chamadoId}/${caminho}`, { metodo: "POST", corpo });
      return depoisDaAcao(chamadoId);
    },

    async definirPrazo(chamadoId, prazo, motivo) {
      await api(`/chamados/${chamadoId}/prazo`, {
        metodo: "POST",
        corpo: { prazo, motivo: motivo ?? "" },
      });
      return depoisDaAcao(chamadoId);
    },

    async definirPrioridade(chamadoId, prioridade: PrioridadeDaTi) {
      await api(`/chamados/${chamadoId}/prioridade`, { metodo: "POST", corpo: { prioridade } });
      return depoisDaAcao(chamadoId);
    },

    async proximoDaFila() {
      if (usuario.papel !== "ti") throw new ErroApp("SEM_PERMISSAO");
      const linhas = ler(
        await supabase
          .from("chamados")
          .select(COLUNAS_CHAMADO)
          .eq("status", "pendente")
          .is("responsavel_id", null)
          .order("criado_em")
          .limit(1)
          .returns<LinhaChamado[]>(),
      );
      return linhas[0] ? chamadoDaLinha(linhas[0]) : null;
    },

    aoMudar(callback) {
      ouvintes.add(callback);
      // Realtime: o Supabase só manda eventos das linhas que o RLS deixa o usuário ler (migration 0013).
      if (!canal) {
        canal = supabase.channel(`central-${usuario.id}`);
        for (const tabela of TABELAS_AO_VIVO) {
          canal.on("postgres_changes", { event: "*", schema: "public", table: tabela }, avisar);
        }
        canal.subscribe();
      }
      return () => {
        ouvintes.delete(callback);
        if (ouvintes.size === 0 && canal) {
          void supabase.removeChannel(canal);
          canal = null;
        }
      };
    },
  };
  return fonte;
}
