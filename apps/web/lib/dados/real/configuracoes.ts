// Configurações na camada real (ADR 0022): lê direto do Supabase (RLS: a TI vê também o que está
// desativado) e grava pela API (/configuracoes/...), que confere se é da TI e registra a alteração.

import type { PostgrestError, SupabaseClient } from "@supabase/supabase-js";
import {
  ALTERACOES_NA_TELA,
  type AlteracaoConfig,
  type CampoOpcoesConfig,
  type DadosConfiguracoes,
  type FeriadoConfig,
  type FonteDeDados,
  type UsuarioSessao,
} from "@/lib/dados/tipos";
import type { CorPaleta } from "@/lib/dominio/tipos";
import { ErroApp } from "@/lib/erros/catalogo";
import type { OpcoesApi } from "./api";
import {
  categoriaDaLinha,
  respostaProntaDaLinha,
  type LinhaCategoria,
  type LinhaRespostaPronta,
} from "./mapear";

type Api = <T>(caminho: string, opcoes?: Omit<OpcoesApi, "token">) => Promise<T>;
type Ler = <T>(resultado: { data: T | null; error: PostgrestError | null }) => T;

type MetodosConfiguracoes = Pick<
  FonteDeDados,
  | "obterConfiguracoes"
  | "salvarOpcoes"
  | "criarAssunto"
  | "editarAssunto"
  | "ordenarAssuntos"
  | "criarRespostaPronta"
  | "editarRespostaPronta"
  | "ordenarRespostasProntas"
  | "criarFeriado"
  | "editarFeriado"
  | "salvarExpediente"
>;

interface LinhaCampoOpcoes {
  id: number;
  categoria_id: number;
  chave: string;
  label: string;
  tipo: string;
  opcoes: string[] | null;
  cores: Partial<Record<string, CorPaleta>> | null;
  ordem: number;
  mostrar_se: { campo: string; igual: string } | null;
}

interface LinhaAlteracao {
  id: number;
  area: AlteracaoConfig["area"];
  resumo: string;
  autor_id: string;
  criado_em: string;
}

export function metodosConfiguracoes(
  usuario: UsuarioSessao,
  supabase: SupabaseClient,
  api: Api,
  ler: Ler,
  /** Avisa as telas para recarregar (as tabelas de configuração não estão no Realtime). */
  avisar: () => void,
): MetodosConfiguracoes {
  async function gravar(caminho: string, metodo: "POST" | "PATCH", corpo: unknown): Promise<void> {
    await api(caminho, { metodo, corpo });
    avisar();
  }

  return {
    async obterConfiguracoes(): Promise<DadosConfiguracoes> {
      if (usuario.papel !== "ti") throw new ErroApp("SEM_PERMISSAO");
      const [assuntos, campos, respostas, feriados, expediente, alteracoes] = await Promise.all([
        supabase
          .from("categorias")
          .select("id, nome, nome_curto, icone, descricao, sla_horas, ordem, ativo")
          .order("ordem")
          .returns<(LinhaCategoria & { ativo: boolean })[]>(),
        supabase
          .from("campos_form")
          .select("id, categoria_id, chave, label, tipo, opcoes, cores, ordem, mostrar_se")
          .order("categoria_id")
          .order("ordem")
          .returns<LinhaCampoOpcoes[]>(),
        supabase
          .from("respostas_prontas")
          .select("id, titulo, texto, ordem, ativo")
          .order("ordem")
          .returns<(LinhaRespostaPronta & { ativo: boolean })[]>(),
        supabase
          .from("feriados")
          .select("data, nome, escopo, ativo")
          .order("data")
          .returns<FeriadoConfig[]>(),
        supabase
          .from("configuracoes")
          .select("chave, valor")
          .in("chave", ["expediente_inicio", "expediente_fim"])
          .returns<{ chave: string; valor: string }[]>(),
        supabase
          .from("config_alteracoes")
          .select("id, area, resumo, autor_id, criado_em")
          .order("id", { ascending: false })
          .limit(ALTERACOES_NA_TELA)
          .returns<LinhaAlteracao[]>(),
      ]);
      const linhasCampos = ler(campos);
      const deOpcoes = linhasCampos.filter(
        (c) => c.tipo === "selecao" || c.tipo === "multipla_selecao",
      );
      const config = new Map(ler(expediente).map((c) => [c.chave, c.valor]));
      return {
        assuntos: ler(assuntos).map((l) => ({ ...categoriaDaLinha(l), ativo: l.ativo })),
        campos: deOpcoes.map((c): CampoOpcoesConfig => ({
          id: Number(c.id),
          categoriaId: Number(c.categoria_id),
          chave: c.chave,
          label: c.label,
          opcoes: c.opcoes ?? [],
          cores: c.cores ?? {},
          travadas: linhasCampos
            .filter((d) => d.categoria_id === c.categoria_id && d.mostrar_se?.campo === c.chave)
            .map((d) => d.mostrar_se!.igual),
        })),
        respostas: ler(respostas).map((l) => ({ ...respostaProntaDaLinha(l), ativo: l.ativo })),
        feriados: ler(feriados),
        expediente: {
          inicio: config.get("expediente_inicio") ?? "08:00",
          fim: config.get("expediente_fim") ?? "20:00",
        },
        alteracoes: ler(alteracoes).map((l) => ({
          id: Number(l.id),
          area: l.area,
          resumo: l.resumo,
          autorId: l.autor_id,
          criadoEm: l.criado_em,
        })),
      };
    },

    salvarOpcoes: (campoId, opcoes) =>
      gravar(`/configuracoes/campos/${campoId}/opcoes`, "PATCH", { opcoes }),

    criarAssunto: (d) =>
      gravar("/configuracoes/assuntos", "POST", {
        nome: d.nome,
        nome_curto: d.nomeCurto,
        descricao: d.descricao,
        icone: d.icone,
      }),

    editarAssunto: (id, d) =>
      gravar(`/configuracoes/assuntos/${id}`, "PATCH", {
        nome: d.nome,
        nome_curto: d.nomeCurto,
        descricao: d.descricao,
        icone: d.icone,
        ativo: d.ativo,
      }),

    ordenarAssuntos: (ids) => gravar("/configuracoes/assuntos/ordem", "POST", { ids }),

    criarRespostaPronta: (d) => gravar("/configuracoes/respostas-prontas", "POST", d),

    editarRespostaPronta: (id, d) => gravar(`/configuracoes/respostas-prontas/${id}`, "PATCH", d),

    ordenarRespostasProntas: (ids) =>
      gravar("/configuracoes/respostas-prontas/ordem", "POST", { ids }),

    criarFeriado: (d) => gravar("/configuracoes/feriados", "POST", d),

    editarFeriado: (data, d) => gravar(`/configuracoes/feriados/${data}`, "PATCH", d),

    salvarExpediente: (inicio, fim) =>
      gravar("/configuracoes/expediente", "PATCH", { inicio, fim }),
  };
}
