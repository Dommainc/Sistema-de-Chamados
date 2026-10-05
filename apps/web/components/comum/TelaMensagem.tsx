import Link from "next/link";

/** Tela amigável para avisos de página inteira (sem acesso, não encontrado, erro). */
export function TelaMensagem({
  titulo,
  texto,
  acao,
  children,
}: {
  titulo: string;
  texto: string;
  acao?: { rotulo: string; href: string };
  children?: React.ReactNode;
}) {
  return (
    <section className="mx-auto flex w-full max-w-lg flex-col items-center gap-4 px-4 py-16 text-center">
      <h1 className="text-2xl font-semibold">{titulo}</h1>
      <p className="text-lg text-texto-suave">{texto}</p>
      {children}
      {acao ? (
        <Link
          href={acao.href}
          className="inline-flex min-h-11 items-center rounded-xl bg-primaria px-5 font-semibold text-sobre-primaria hover:bg-primaria-forte"
        >
          {acao.rotulo}
        </Link>
      ) : null}
    </section>
  );
}
