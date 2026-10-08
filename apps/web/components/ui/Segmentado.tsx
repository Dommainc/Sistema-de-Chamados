"use client";

import Link from "next/link";

export interface OpcaoSegmentado<T extends string> {
  valor: T;
  rotulo: React.ReactNode;
  /** Se informado, a opção vira link (filtro refletido na URL). */
  href?: string;
}

/**
 * Seletor em pílula do mockup ("Em andamento (4) | Encerrados", "Quadro | Lista",
 * "Responder à Ana | Nota interna"). A opção ativa fica com fundo claro destacado.
 */
export function Segmentado<T extends string>({
  opcoes,
  valor,
  aoMudar,
  rotuloAcessivel,
  tema = "claro",
  larguraTotal = false,
}: {
  opcoes: OpcaoSegmentado<T>[];
  valor: T;
  aoMudar?: (valor: T) => void;
  rotuloAcessivel: string;
  tema?: "claro" | "escuro";
  larguraTotal?: boolean;
}) {
  const trilho = tema === "escuro" ? "bg-barra-2" : "bg-superficie-2";
  const ativo =
    tema === "escuro" ? "bg-sobre-barra text-barra shadow" : "bg-superficie text-texto shadow-sm";
  const inativo =
    tema === "escuro"
      ? "text-sobre-barra-suave hover:text-sobre-barra"
      : "text-texto-suave hover:text-texto";

  return (
    <div
      role="tablist"
      aria-label={rotuloAcessivel}
      className={`inline-flex gap-1 rounded-xl p-1 ${trilho} ${larguraTotal ? "flex w-full" : ""}`}
    >
      {opcoes.map((o) => {
        const selecionado = o.valor === valor;
        const classe = `inline-flex min-h-10 items-center justify-center rounded-lg px-4 text-sm font-semibold whitespace-nowrap transition-colors ${larguraTotal ? "flex-1" : ""} ${selecionado ? ativo : inativo}`;
        return o.href ? (
          <Link
            key={o.valor}
            href={o.href}
            role="tab"
            aria-selected={selecionado}
            className={classe}
          >
            {o.rotulo}
          </Link>
        ) : (
          <button
            key={o.valor}
            type="button"
            role="tab"
            aria-selected={selecionado}
            onClick={() => aoMudar?.(o.valor)}
            className={classe}
          >
            {o.rotulo}
          </button>
        );
      })}
    </div>
  );
}
