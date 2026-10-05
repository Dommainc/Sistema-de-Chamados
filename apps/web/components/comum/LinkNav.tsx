"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/** Link de menu que se destaca quando é a página atual. */
export function LinkNav({
  href,
  ativo,
  children,
  className = "",
}: {
  href: string;
  /** Força o estado ativo; se omitido, compara com o caminho atual. */
  ativo?: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  const caminho = usePathname();
  const estaAtivo = ativo ?? caminho === href;
  return (
    <Link
      href={href}
      aria-current={estaAtivo ? "page" : undefined}
      className={`inline-flex min-h-11 items-center gap-2 rounded-lg px-3 font-medium ${estaAtivo ? "bg-white/20" : "hover:bg-white/10"} ${className}`}
    >
      {children}
    </Link>
  );
}
