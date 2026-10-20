import Image from "next/image";

/**
 * Peças das páginas de Ajuda (/ajuda e /atendimento/ajuda). As mesmas páginas viram os PDFs do guia
 * (docs/guia/*.pdf): no modo de impressão, cabeçalhos e menus somem e cada seção evita quebrar no meio.
 */

export function Guia({
  titulo,
  subtitulo,
  children,
}: {
  titulo: string;
  subtitulo: string;
  children: React.ReactNode;
}) {
  return (
    <article className="mx-auto flex w-full max-w-3xl flex-col gap-8 print:max-w-none print:gap-6">
      <header className="flex flex-col gap-2 border-b border-borda pb-6">
        <h1 className="text-3xl font-bold">{titulo}</h1>
        <p className="text-lg text-texto-suave">{subtitulo}</p>
      </header>
      {children}
    </article>
  );
}

export function SecaoGuia({
  id,
  titulo,
  children,
}: {
  id: string;
  titulo: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} aria-labelledby={`${id}-titulo`} className="flex scroll-mt-24 flex-col gap-4">
      <h2 id={`${id}-titulo`} className="text-2xl font-bold break-after-avoid">
        {titulo}
      </h2>
      {children}
    </section>
  );
}

export function Passos({ children }: { children: React.ReactNode }) {
  return (
    <ol className="flex list-decimal flex-col gap-2 pl-6 text-lg marker:font-bold">{children}</ol>
  );
}

export function Dica({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-xl border border-info bg-info-suave px-4 py-3 break-inside-avoid">
      <strong>Dica:</strong> {children}
    </p>
  );
}

/** Print de tela (public/guia/*.png, gerados por `pnpm prints`). */
export function Figura({ arquivo, legenda }: { arquivo: string; legenda: string }) {
  return (
    <figure className="flex flex-col gap-2 break-inside-avoid">
      <Image
        src={`/guia/${arquivo}`}
        alt={legenda}
        width={1280}
        height={900}
        // Servido direto (sem a cópia otimizada do Next), para o print novo aparecer na hora.
        unoptimized
        sizes="(min-width: 768px) 768px, 100vw"
        className="h-auto w-full rounded-xl border border-borda shadow-sm"
      />
      <figcaption className="text-sm text-texto-suave">{legenda}</figcaption>
    </figure>
  );
}

/** Índice no topo: atalhos para cada seção (some na impressão). */
export function Indice({ itens }: { itens: { id: string; titulo: string }[] }) {
  return (
    <nav
      aria-label="Neste guia"
      className="rounded-2xl border border-borda bg-superficie p-4 print:hidden"
    >
      <p className="mb-2 text-sm font-semibold tracking-wider text-texto-suave uppercase">
        Neste guia
      </p>
      <ul className="grid gap-1 sm:grid-cols-2">
        {itens.map((i) => (
          <li key={i.id}>
            <a href={`#${i.id}`} className="font-semibold text-primaria underline">
              {i.titulo}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
