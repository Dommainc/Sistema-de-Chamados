// Tela clara ou escura (botão ☀/🌙, pedido do dono 2026-10-15). A escolha fica no perfil (migration 0025,
// PATCH /me/tema) para valer em qualquer computador; no navegador ela vive num cookie, que o servidor lê para já
// desenhar a página na cor certa (sem piscar). Padrão: claro.

export type Tema = "claro" | "escuro";

export const COOKIE_TEMA = "cc_tema";

const UM_ANO = 60 * 60 * 24 * 365;

/** Valor do cookie → tema (qualquer coisa estranha vira claro). */
export function temaDoCookie(valor: string | undefined): Tema {
  return valor === "escuro" ? "escuro" : "claro";
}

/** Opções do cookie (o mesmo no navegador e na volta do login). */
export const OPCOES_COOKIE_TEMA = { path: "/", maxAge: UM_ANO, sameSite: "lax" } as const;

/** Troca a cor da página na hora e guarda no cookie (só no navegador). */
export function aplicarTema(tema: Tema): void {
  document.documentElement.dataset.tema = tema;
  document.cookie = `${COOKIE_TEMA}=${tema}; path=/; max-age=${UM_ANO}; samesite=lax`;
}

/** Cor da barra do navegador no celular (meta theme-color) = cor do fundo. */
export const COR_DO_NAVEGADOR: Record<Tema, string> = { claro: "#f2f0eb", escuro: "#121418" };
