// Regras da tela de Configurações (ADR 0022). Espelho de apps/api/app/dominio/configuracoes.py.
// A tela usa para mostrar o erro na hora e o resumo "+ Quickin · − Mapfry" antes de salvar;
// a API confere tudo de novo.

import type { EscopoFeriado, OpcaoEditada } from "@/lib/dados/tipos";
import { CORES_PALETA } from "@/lib/dominio/tipos";
import { ErroApp, mensagemErro, type CodigoErro, type ParametrosErro } from "@/lib/erros/catalogo";

/** Ícones que a tela inicial sabe desenhar (components/ui/IconeCategoria.tsx). */
export const ICONES_ASSUNTO = [
  "key-round",
  "wifi",
  "mail",
  "message-square",
  "laptop",
  "printer",
  "smartphone",
  "layout-grid",
  "grid-2x2",
  "app-window",
  "cctv",
  "download",
  "user-plus",
  "user-minus",
  "package",
  "ellipsis",
] as const;

/** Nome de cada ícone para leitores de tela (o seletor de ícone da tela de Configurações). */
export const ROTULO_ICONE: Record<(typeof ICONES_ASSUNTO)[number], string> = {
  "key-round": "Chave",
  wifi: "Wi-Fi",
  mail: "E-mail",
  "message-square": "Mensagem",
  laptop: "Notebook",
  printer: "Impressora",
  smartphone: "Celular",
  "layout-grid": "Grade",
  "grid-2x2": "Janelas",
  "app-window": "Programa",
  cctv: "Câmera",
  download: "Baixar",
  "user-plus": "Novo colaborador",
  "user-minus": "Desligamento",
  package: "Pacote",
  ellipsis: "Outros",
};

export const MAX_NOME_OPCAO = 80;

export const ROTULO_ESCOPO_FERIADO: Record<EscopoFeriado, string> = {
  nacional: "Nacional",
  estadual: "Estadual",
  municipal: "Municipal",
  ponto_facultativo: "Ponto facultativo",
};

const HORA = /^([01]\d|2[0-3]):[0-5]\d$/;

function erroCampo(codigo: CodigoErro, onde: string, parametros: ParametrosErro = {}): ErroApp {
  return new ErroApp(codigo, parametros, {
    campos: [{ campo: onde, mensagem: mensagemErro(codigo, parametros) }],
  });
}

/** Junta espaços repetidos e apara as pontas. */
export function textoLimpo(valor: string): string {
  return valor.split(/\s+/).filter(Boolean).join(" ");
}

/** Ao menos uma opção, sem nome vazio, sem repetir (ignorando maiúsculas), cor da paleta. */
export function normalizarOpcoes(opcoes: readonly OpcaoEditada[]): OpcaoEditada[] {
  if (opcoes.length === 0) throw new ErroApp("OPCOES_VAZIAS");
  const vistas = new Set<string>();
  return opcoes.map((opcao, i) => {
    const nome = textoLimpo(opcao.nome);
    const onde = `opcoes.${i}`;
    if (!nome) throw erroCampo("CAMPO_OBRIGATORIO", onde, { campo: "Nome da opção" });
    if (nome.length > MAX_NOME_OPCAO) {
      throw erroCampo("TEXTO_LONGO_DEMAIS", onde, {
        campo: nome.slice(0, 20),
        maximo: String(MAX_NOME_OPCAO),
      });
    }
    const chave = nome.toLocaleLowerCase("pt-BR");
    if (vistas.has(chave)) throw erroCampo("NOME_DUPLICADO", onde, { campo: nome });
    if (opcao.cor !== null && !(CORES_PALETA as readonly string[]).includes(opcao.cor)) {
      throw erroCampo("CAMPO_OBRIGATORIO", onde, { campo: "Cor" });
    }
    vistas.add(chave);
    return { ...opcao, nome };
  });
}

export interface MudancaOpcoes {
  adicionadas: string[];
  removidas: string[];
  /** [antigo, novo] */
  renomeadas: [string, string][];
  coresMudaram: boolean;
  ordemMudou: boolean;
}

export function mudancaVazia(m: MudancaOpcoes): boolean {
  return (
    m.adicionadas.length === 0 &&
    m.removidas.length === 0 &&
    m.renomeadas.length === 0 &&
    !m.coresMudaram &&
    !m.ordemMudou
  );
}

/** O que mudou entre a lista salva e a editada. */
export function compararOpcoes(
  antes: readonly string[],
  coresAntes: Partial<Record<string, string>>,
  depois: readonly OpcaoEditada[],
): MudancaOpcoes {
  const conhecidas = new Set(antes);
  const origens: string[] = [];
  const mudanca: MudancaOpcoes = {
    adicionadas: [],
    removidas: [],
    renomeadas: [],
    coresMudaram: false,
    ordemMudou: false,
  };
  for (const opcao of depois) {
    let origem = opcao.antigo !== null && conhecidas.has(opcao.antigo) ? opcao.antigo : null;
    if (origem === null && conhecidas.has(opcao.nome)) origem = opcao.nome;
    if (origem === null || origens.includes(origem)) {
      mudanca.adicionadas.push(opcao.nome);
      continue;
    }
    origens.push(origem);
    if (origem !== opcao.nome) mudanca.renomeadas.push([origem, opcao.nome]);
    if ((coresAntes[origem] ?? null) !== opcao.cor) mudanca.coresMudaram = true;
  }
  mudanca.removidas = antes.filter((n) => !origens.includes(n));
  const mantidasNaOrdemAntiga = antes.filter((n) => origens.includes(n));
  mudanca.ordemMudou = mantidasNaOrdemAntiga.some((n, i) => n !== origens[i]);
  return mudanca;
}

/** "+ Paytrack · − Mapfry · KickIn → Quickin · cores · ordem" (igual ao registro de alterações). */
export function resumoMudanca(m: MudancaOpcoes): string {
  return [
    ...m.adicionadas.map((n) => `+ ${n}`),
    ...m.removidas.map((n) => `− ${n}`),
    ...m.renomeadas.map(([a, n]) => `${a} → ${n}`),
    ...(m.coresMudaram ? ["cores"] : []),
    ...(m.ordemMudou ? ["ordem"] : []),
  ].join(" · ");
}

/** "08:00" e "20:00": formato HH:MM e fim depois do início. */
export function validarExpediente(inicio: string, fim: string): void {
  if (!HORA.test(inicio)) throw erroCampo("CAMPO_OBRIGATORIO", "inicio", { campo: "Horário" });
  if (!HORA.test(fim)) throw erroCampo("CAMPO_OBRIGATORIO", "fim", { campo: "Horário" });
  if (fim <= inicio) throw erroCampo("EXPEDIENTE_INVALIDO", "fim");
}
