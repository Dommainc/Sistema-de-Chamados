"use client";

/** Cartão branco com título em caixa alta (mockup, tela 7: AÇÕES, PRAZO, SOLICITANTE...). */
export function Secao({
  titulo,
  children,
  className = "",
}: {
  titulo: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      aria-label={titulo}
      className={`flex flex-col gap-3 rounded-2xl border border-borda bg-superficie p-4 shadow-sm ${className}`}
    >
      <h2 className="text-xs font-semibold tracking-wider text-texto-suave uppercase">{titulo}</h2>
      {children}
    </section>
  );
}

export function Linha({ rotulo, children }: { rotulo: string; children: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-3 text-sm">
      <span className="text-texto-suave">{rotulo}</span>
      <span className="min-w-0 text-right break-words">{children}</span>
    </div>
  );
}
