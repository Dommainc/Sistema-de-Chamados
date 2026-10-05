// Regras de anexos (docs/escopo.md 7.3): validar no front e no back, com as mesmas mensagens.
// Limites espelham configuracoes.anexo_tamanho_max_mb / anexo_tipos_permitidos (seed.sql).

import { ErroApp } from "@/lib/erros/catalogo";

export const TAMANHO_MAX_MB = 10;
export const TAMANHO_MAX_BYTES = TAMANHO_MAX_MB * 1024 * 1024;

export const TIPOS_PERMITIDOS: readonly string[] = [
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/webp",
  "image/heic",
  "application/pdf",
  "text/plain",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
];

/** Para o atributo `accept` do <input type="file">. */
export const ACCEPT_ARQUIVOS = [
  ...TIPOS_PERMITIDOS,
  ".heic",
  ".doc",
  ".docx",
  ".xls",
  ".xlsx",
  ".ppt",
  ".pptx",
].join(",");

// Alguns navegadores (ex.: .heic no Windows) mandam o tipo vazio: deduz pela extensão.
const MIME_POR_EXTENSAO: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  webp: "image/webp",
  heic: "image/heic",
  pdf: "application/pdf",
  txt: "text/plain",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xls: "application/vnd.ms-excel",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ppt: "application/vnd.ms-powerpoint",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
};

export function mimeDoArquivo(nome: string, tipoInformado: string): string {
  if (tipoInformado) return tipoInformado;
  const extensao = nome.split(".").pop()?.toLowerCase() ?? "";
  return MIME_POR_EXTENSAO[extensao] ?? "";
}

/** Lança ANEXO_MUITO_GRANDE ou ANEXO_TIPO_INVALIDO. */
export function validarArquivo(arquivo: { tamanho: number; mime: string }): void {
  if (!TIPOS_PERMITIDOS.includes(arquivo.mime)) throw new ErroApp("ANEXO_TIPO_INVALIDO");
  if (arquivo.tamanho > TAMANHO_MAX_BYTES) throw new ErroApp("ANEXO_MUITO_GRANDE");
}

export function ehImagem(mime: string): boolean {
  return mime.startsWith("image/");
}

/**
 * Nome do print colado: print-AAAAMMDD-HHMMSS.png (horário de São Paulo).
 * Vários no mesmo segundo ganham -2, -3...
 */
export function nomeDoPrint(quando: Date, existentes: readonly string[]): string {
  const p = new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(quando);
  const v = (tipo: Intl.DateTimeFormatPartTypes) => p.find((x) => x.type === tipo)?.value ?? "";
  const base = `print-${v("year")}${v("month")}${v("day")}-${v("hour")}${v("minute")}${v("second")}`;
  let nome = `${base}.png`;
  for (let n = 2; existentes.includes(nome); n++) nome = `${base}-${n}.png`;
  return nome;
}

/** "1,8 MB" · "350 KB". */
export function formatarTamanho(bytes: number): string {
  if (bytes >= 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} MB`;
  }
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}
