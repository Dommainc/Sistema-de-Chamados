// Configurações no modo de demonstração (ADR 0022) — espelho de apps/api/app/routers/configuracoes.py.
// Ficam no estado do navegador: assuntos, perguntas de opções, respostas prontas, feriados, expediente
// e o registro de alterações. Cada função devolve a configuração nova (ou lança ErroApp do catálogo).

import type {
  AlteracaoConfig,
  AreaConfig,
  AssuntoConfig,
  DadosAssunto,
  DadosConfiguracoes,
  DadosRespostaPronta,
  FeriadoConfig,
  OpcaoEditada,
  RespostaProntaConfig,
} from "@/lib/dados/tipos";
import {
  ICONES_ASSUNTO,
  compararOpcoes,
  mudancaVazia,
  normalizarOpcoes,
  resumoMudanca,
  textoLimpo,
  validarExpediente,
} from "@/lib/dominio/configuracoes";
import type { ExpedienteConfig } from "@/lib/dominio/horario-util";
import type { CampoForm, CorPaleta } from "@/lib/dominio/tipos";
import { ErroApp, mensagemErro } from "@/lib/erros/catalogo";
import { formatarDataHora } from "@/lib/formato";
import { CAMPOS_FORM, CATEGORIAS, RESPOSTAS_PRONTAS } from "./exemplos";
import { EXPEDIENTE_SIMULADO, FERIADOS_EXEMPLO } from "./feriados";

export interface ConfigSimulada {
  assuntos: AssuntoConfig[];
  campos: CampoForm[];
  respostas: RespostaProntaConfig[];
  feriados: FeriadoConfig[];
  expediente: { inicio: string; fim: string };
  alteracoes: AlteracaoConfig[];
}

export function configInicial(): ConfigSimulada {
  return {
    assuntos: CATEGORIAS.map((c) => ({ ...c, ativo: true })),
    campos: CAMPOS_FORM.map((c) => ({ ...c, opcoes: [...c.opcoes], cores: { ...c.cores } })),
    respostas: RESPOSTAS_PRONTAS.map((r) => ({ ...r, ativo: true })),
    feriados: FERIADOS_EXEMPLO.map((f) => ({ ...f })),
    expediente: { inicio: EXPEDIENTE_SIMULADO.inicio, fim: EXPEDIENTE_SIMULADO.fim },
    alteracoes: [],
  };
}

/** Expediente para as horas úteis (prazos, Dashboard e automações). */
export function expedienteDaConfig(config: ConfigSimulada): ExpedienteConfig {
  return {
    ...config.expediente,
    feriados: new Set(config.feriados.filter((f) => f.ativo).map((f) => f.data)),
  };
}

const ehDeOpcoes = (c: CampoForm) => c.tipo === "selecao" || c.tipo === "multipla_selecao";

export function dadosDaConfig(config: ConfigSimulada): DadosConfiguracoes {
  const campos = config.campos
    .filter(ehDeOpcoes)
    .sort((a, b) => a.categoriaId - b.categoriaId || a.ordem - b.ordem)
    .map((c) => ({
      id: c.id,
      categoriaId: c.categoriaId,
      chave: c.chave,
      label: c.label,
      opcoes: [...c.opcoes],
      cores: { ...c.cores },
      travadas: config.campos
        .filter((d) => d.categoriaId === c.categoriaId && d.mostrarSe?.campo === c.chave)
        .map((d) => d.mostrarSe!.igual),
    }));
  return {
    assuntos: [...config.assuntos].sort((a, b) => a.ordem - b.ordem).map((a) => ({ ...a })),
    campos,
    respostas: [...config.respostas].sort((a, b) => a.ordem - b.ordem).map((r) => ({ ...r })),
    feriados: [...config.feriados].sort((a, b) => a.data.localeCompare(b.data)),
    expediente: { ...config.expediente },
    alteracoes: [...config.alteracoes].sort((a, b) => b.id - a.id),
  };
}

function registrar(
  config: ConfigSimulada,
  autorId: string,
  area: AreaConfig,
  resumo: string,
): AlteracaoConfig[] {
  const id = config.alteracoes.reduce((m, a) => Math.max(m, a.id), 0) + 1;
  return [
    ...config.alteracoes,
    { id, area, resumo: resumo.slice(0, 500), autorId, criadoEm: new Date().toISOString() },
  ];
}

function duplicado(onde: string, nome: string): ErroApp {
  return new ErroApp(
    "NOME_DUPLICADO",
    { campo: nome },
    { campos: [{ campo: onde, mensagem: mensagemErro("NOME_DUPLICADO", { campo: nome }) }] },
  );
}

function exigirTexto(valor: string, campo: string, onde: string): string {
  const limpo = textoLimpo(valor);
  if (!limpo) {
    throw new ErroApp(
      "CAMPO_OBRIGATORIO",
      { campo },
      { campos: [{ campo: onde, mensagem: mensagemErro("CAMPO_OBRIGATORIO", { campo }) }] },
    );
  }
  return limpo;
}

function icone(valor: string): string {
  if (!(ICONES_ASSUNTO as readonly string[]).includes(valor)) {
    throw new ErroApp("CAMPO_OBRIGATORIO", { campo: "Ícone" });
  }
  return valor;
}

const igual = (a: string, b: string) =>
  a.toLocaleLowerCase("pt-BR") === b.toLocaleLowerCase("pt-BR");
const proximo = (itens: readonly { id: number }[]) =>
  itens.reduce((m, i) => Math.max(m, i.id), 0) + 1;
const maiorOrdem = (itens: readonly { ordem: number }[]) =>
  itens.reduce((m, i) => Math.max(m, i.ordem), 0);

// ------------------------------------------------------------------------------ formulários
export function salvarOpcoesSim(
  config: ConfigSimulada,
  campoId: number,
  opcoes: readonly OpcaoEditada[],
  autorId: string,
): ConfigSimulada {
  const campo = config.campos.find((c) => c.id === campoId && ehDeOpcoes(c));
  if (!campo) throw new ErroApp("SEM_PERMISSAO");
  const novas = normalizarOpcoes(opcoes);
  const mudanca = compararOpcoes(campo.opcoes, campo.cores, novas);
  if (mudancaVazia(mudanca)) return config;
  const dependentes = config.campos.filter(
    (d) => d.categoriaId === campo.categoriaId && d.mostrarSe?.campo === campo.chave,
  );
  const presa = mudanca.removidas.find((n) => dependentes.some((d) => d.mostrarSe!.igual === n));
  if (presa) throw new ErroApp("OPCAO_COM_PERGUNTAS", { campo: presa });

  const renomeadas = new Map(mudanca.renomeadas);
  const cores: Partial<Record<string, CorPaleta>> = {};
  for (const o of novas) if (o.cor) cores[o.nome] = o.cor;
  return {
    ...config,
    campos: config.campos.map((c) => {
      if (c.id === campoId) return { ...c, opcoes: novas.map((o) => o.nome), cores };
      const igualA = c.mostrarSe?.igual;
      if (dependentes.includes(c) && igualA && renomeadas.has(igualA)) {
        return { ...c, mostrarSe: { campo: campo.chave, igual: renomeadas.get(igualA)! } };
      }
      return c;
    }),
    alteracoes: registrar(
      config,
      autorId,
      "formularios",
      `${campo.label}: ${resumoMudanca(mudanca)}`,
    ),
  };
}

// --------------------------------------------------------------------------------- assuntos
export function criarAssuntoSim(
  config: ConfigSimulada,
  dados: DadosAssunto,
  autorId: string,
): ConfigSimulada {
  const nome = exigirTexto(dados.nome, "Nome", "nome");
  const nomeCurto = exigirTexto(dados.nomeCurto, "Nome na tela inicial", "nomeCurto");
  if (config.assuntos.some((a) => igual(a.nome, nome))) throw duplicado("nome", nome);
  const id = proximo(config.assuntos);
  const assunto: AssuntoConfig = {
    id,
    nome,
    nomeCurto,
    icone: icone(dados.icone),
    descricao: dados.descricao.trim(),
    slaHoras: 8,
    ordem: maiorOrdem(config.assuntos) + 10,
    ativo: true,
  };
  const descricao: CampoForm = {
    id: proximo(config.campos),
    categoriaId: id,
    chave: "descricao",
    label: "Descreva o que está acontecendo",
    tipo: "texto_longo",
    obrigatorio: true,
    opcoes: [],
    cores: {},
    ajuda: "Conte o que aconteceu e, se puder, cole um print da tela (Ctrl+V).",
    ordem: 100,
    mostrarSe: null,
  };
  return {
    ...config,
    assuntos: [...config.assuntos, assunto],
    campos: [...config.campos, descricao],
    alteracoes: registrar(config, autorId, "assuntos", `Novo assunto: ${nomeCurto}`),
  };
}

export function editarAssuntoSim(
  config: ConfigSimulada,
  id: number,
  dados: Partial<DadosAssunto> & { ativo?: boolean },
  autorId: string,
): ConfigSimulada {
  const atual = config.assuntos.find((a) => a.id === id);
  if (!atual) throw new ErroApp("SEM_PERMISSAO");
  const novo: AssuntoConfig = {
    ...atual,
    nome: dados.nome !== undefined ? exigirTexto(dados.nome, "Nome", "nome") : atual.nome,
    nomeCurto:
      dados.nomeCurto !== undefined
        ? exigirTexto(dados.nomeCurto, "Nome na tela inicial", "nomeCurto")
        : atual.nomeCurto,
    icone: dados.icone !== undefined ? icone(dados.icone) : atual.icone,
    descricao: dados.descricao !== undefined ? dados.descricao.trim() : atual.descricao,
    ativo: dados.ativo ?? atual.ativo,
  };
  if (
    novo.nome !== atual.nome &&
    config.assuntos.some((a) => a.id !== id && igual(a.nome, novo.nome))
  ) {
    throw duplicado("nome", novo.nome);
  }
  if (JSON.stringify(novo) === JSON.stringify(atual)) return config;
  const resumo =
    novo.ativo !== atual.ativo
      ? `Assunto ${novo.nomeCurto} ${novo.ativo ? "reativado" : "desativado"}`
      : `Assunto ${novo.nomeCurto} editado`;
  return {
    ...config,
    assuntos: config.assuntos.map((a) => (a.id === id ? novo : a)),
    alteracoes: registrar(config, autorId, "assuntos", resumo),
  };
}

function reordenar<T extends { id: number; ordem: number }>(
  itens: T[],
  ids: readonly number[],
): T[] {
  return itens.map((item) => {
    const pos = ids.indexOf(item.id);
    return pos >= 0 ? { ...item, ordem: (pos + 1) * 10 } : item;
  });
}

export function ordenarAssuntosSim(
  config: ConfigSimulada,
  ids: readonly number[],
  autorId: string,
): ConfigSimulada {
  return {
    ...config,
    assuntos: reordenar(config.assuntos, ids),
    alteracoes: registrar(config, autorId, "assuntos", "Nova ordem dos assuntos"),
  };
}

// ------------------------------------------------------------------------ respostas prontas
export function criarRespostaSim(
  config: ConfigSimulada,
  dados: DadosRespostaPronta,
  autorId: string,
): ConfigSimulada {
  const titulo = exigirTexto(dados.titulo, "Título", "titulo");
  const texto = dados.texto.trim();
  if (!texto) exigirTexto("", "Texto", "texto");
  if (config.respostas.some((r) => igual(r.titulo, titulo))) throw duplicado("titulo", titulo);
  return {
    ...config,
    respostas: [
      ...config.respostas,
      {
        id: proximo(config.respostas),
        titulo,
        texto,
        ordem: maiorOrdem(config.respostas) + 10,
        ativo: true,
      },
    ],
    alteracoes: registrar(config, autorId, "respostas_prontas", `Nova resposta pronta: ${titulo}`),
  };
}

export function editarRespostaSim(
  config: ConfigSimulada,
  id: number,
  dados: Partial<DadosRespostaPronta> & { ativo?: boolean },
  autorId: string,
): ConfigSimulada {
  const atual = config.respostas.find((r) => r.id === id);
  if (!atual) throw new ErroApp("SEM_PERMISSAO");
  const novo: RespostaProntaConfig = {
    ...atual,
    titulo:
      dados.titulo !== undefined ? exigirTexto(dados.titulo, "Título", "titulo") : atual.titulo,
    texto: dados.texto !== undefined ? dados.texto.trim() : atual.texto,
    ativo: dados.ativo ?? atual.ativo,
  };
  if (!novo.texto) exigirTexto("", "Texto", "texto");
  if (
    novo.titulo !== atual.titulo &&
    config.respostas.some((r) => r.id !== id && igual(r.titulo, novo.titulo))
  ) {
    throw duplicado("titulo", novo.titulo);
  }
  if (JSON.stringify(novo) === JSON.stringify(atual)) return config;
  const resumo =
    novo.ativo !== atual.ativo
      ? `Resposta pronta ${novo.titulo} ${novo.ativo ? "reativada" : "desativada"}`
      : `Resposta pronta ${novo.titulo} editada`;
  return {
    ...config,
    respostas: config.respostas.map((r) => (r.id === id ? novo : r)),
    alteracoes: registrar(config, autorId, "respostas_prontas", resumo),
  };
}

export function ordenarRespostasSim(
  config: ConfigSimulada,
  ids: readonly number[],
  autorId: string,
): ConfigSimulada {
  return {
    ...config,
    respostas: reordenar(config.respostas, ids),
    alteracoes: registrar(config, autorId, "respostas_prontas", "Nova ordem das respostas prontas"),
  };
}

// -------------------------------------------------------------------- feriados e expediente
const dataBr = (data: string) => formatarDataHora(`${data}T12:00:00-03:00`).slice(0, 10);

export function criarFeriadoSim(
  config: ConfigSimulada,
  dados: Omit<FeriadoConfig, "ativo">,
  autorId: string,
): ConfigSimulada {
  const nome = exigirTexto(dados.nome, "Nome do feriado", "nome");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dados.data))
    throw new ErroApp("CAMPO_OBRIGATORIO", { campo: "Data" });
  const existente = config.feriados.find((f) => f.data === dados.data);
  if (existente?.ativo) throw new ErroApp("FERIADO_DUPLICADO", { campo: dataBr(dados.data) });
  const novo: FeriadoConfig = { data: dados.data, nome, escopo: dados.escopo, ativo: true };
  return {
    ...config,
    feriados: existente
      ? config.feriados.map((f) => (f.data === dados.data ? novo : f))
      : [...config.feriados, novo],
    alteracoes: registrar(config, autorId, "feriados", `Feriado ${dataBr(dados.data)} · ${nome}`),
  };
}

export function editarFeriadoSim(
  config: ConfigSimulada,
  data: string,
  dados: { nome?: string; ativo?: boolean },
  autorId: string,
): ConfigSimulada {
  const atual = config.feriados.find((f) => f.data === data);
  if (!atual) throw new ErroApp("SEM_PERMISSAO");
  const nome =
    dados.nome !== undefined ? exigirTexto(dados.nome, "Nome do feriado", "nome") : atual.nome;
  const ativo = dados.ativo ?? atual.ativo;
  if (nome === atual.nome && ativo === atual.ativo) return config;
  const resumo =
    ativo !== atual.ativo
      ? `Feriado ${dataBr(data)} ${ativo ? "reativado" : "desativado"}`
      : `Feriado ${dataBr(data)} renomeado para ${nome}`;
  return {
    ...config,
    feriados: config.feriados.map((f) => (f.data === data ? { ...f, nome, ativo } : f)),
    alteracoes: registrar(config, autorId, "feriados", resumo),
  };
}

export function salvarExpedienteSim(
  config: ConfigSimulada,
  inicio: string,
  fim: string,
  autorId: string,
): ConfigSimulada {
  validarExpediente(inicio, fim);
  const { inicio: deIni, fim: deFim } = config.expediente;
  if (deIni === inicio && deFim === fim) return config;
  return {
    ...config,
    expediente: { inicio, fim },
    alteracoes: registrar(
      config,
      autorId,
      "expediente",
      `Expediente: ${deIni}–${deFim} → ${inicio}–${fim}`,
    ),
  };
}
