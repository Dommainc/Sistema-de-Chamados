// Implementação simulada da FonteDeDados (ADR 0006).
// Reproduz as regras do banco que importam para as telas: o que cada papel enxerga (RLS)
// e as validações de perfil. Toda falha sai como ErroApp do catálogo.

import { validarArquivo } from "@/lib/anexos";
import type {
  ChamadoCriado,
  Contadores,
  DadosNovoChamado,
  DadosPrimeiroAcesso,
  FiltroChamados,
  FonteDeDados,
  PerfilPublico,
} from "@/lib/dados/tipos";
import { validarFormulario } from "@/lib/dominio/formulario";
import { adicionarHorasUteis } from "@/lib/dominio/horario-util";
import {
  estaEncerrado,
  type Anexo,
  type Categoria,
  type Chamado,
  type Perfil,
} from "@/lib/dominio/tipos";
import { ErroApp } from "@/lib/erros/catalogo";
import { assinar, gravarEstado, lerEstado, proximoId } from "./armazenamento";
import { guardarArquivo } from "./arquivos";
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
      const estado = lerEstado();
      const id = proximoId(estado.chamados);

      const anexos: Anexo[] = [];
      try {
        for (const a of dados.anexos) {
          const anexoId = novoId();
          await guardarArquivo(anexoId, a.arquivo);
          anexos.push({
            id: anexoId,
            chamadoId: id,
            mensagemId: null,
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
      const perfil = eu();
      const chamado = visiveis().find((c) => c.id === id);
      if (chamado) return { ...chamado };
      // Solicitante: inexistente e de outra pessoa dão o mesmo erro (não revela quais números existem).
      if (perfil.papel === "ti")
        throw new ErroApp("CHAMADO_NAO_ENCONTRADO", { numero: String(id) });
      throw new ErroApp("SEM_PERMISSAO");
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

    aoMudar(callback: () => void) {
      return assinar(callback);
    },
  };
}
