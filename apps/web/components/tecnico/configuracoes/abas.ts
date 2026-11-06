// Abas da tela de Configurações. Fora do componente "use client" porque a página (servidor) também lê.

export const ABAS_CONFIG = ["formularios", "assuntos", "respostas", "feriados"] as const;
export type AbaConfig = (typeof ABAS_CONFIG)[number];

/** ?aba= da URL → aba conhecida (padrão: Formulários). */
export function abaDaUrl(valor: string | string[] | undefined): AbaConfig {
  const texto = Array.isArray(valor) ? valor[0] : valor;
  return (ABAS_CONFIG as readonly string[]).includes(texto ?? "")
    ? (texto as AbaConfig)
    : "formularios";
}
