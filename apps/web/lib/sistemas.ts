// Cores dos sistemas da empresa (pedido do dono, 2026-10-07) — categoria "Solicitações de acesso e
// Permissões", campo "Qual sistema?" (chave `sistema`). Aparecem no formulário (quadradinho) e na área
// técnica (selo com o nome). Classes fixas: o Tailwind precisa vê-las escritas por inteiro.

/** Chave do campo do formulário que guarda o sistema. */
export const CHAVE_SISTEMA = "sistema";

/** Opção "nenhum sistema": tem cor no formulário, mas não aparece no cartão do quadro. */
export const SEM_SISTEMA = "Não se aplica";

const CORES: Record<string, { fundo: string; texto: string }> = {
  Sienge: { fundo: "bg-sis-sienge", texto: "text-white" },
  CVCRM: { fundo: "bg-sis-cvcrm", texto: "text-texto" },
  Construpoint: { fundo: "bg-sis-construpoint", texto: "text-texto" },
  Construmanager: { fundo: "bg-sis-construmanager", texto: "text-white" },
  Docusign: { fundo: "bg-sis-docusign", texto: "text-white" },
  Prevision: { fundo: "bg-sis-prevision", texto: "text-white" },
  Metadados: { fundo: "bg-sis-metadados", texto: "text-texto" },
  [SEM_SISTEMA]: { fundo: "bg-sis-nenhum", texto: "text-white" },
};

/** Cor de um sistema; null se o valor não for um dos sistemas conhecidos. */
export function corDoSistema(nome: unknown): { fundo: string; texto: string } | null {
  return typeof nome === "string" ? (CORES[nome] ?? null) : null;
}
