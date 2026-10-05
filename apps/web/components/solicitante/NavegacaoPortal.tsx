"use client";

import { CirclePlus, List, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useConsulta } from "@/lib/dados/provedor";
import type { FonteDeDados } from "@/lib/dados/tipos";

interface ItemNav {
  href: string;
  rotulo: string;
  icone: LucideIcon;
  ativo: (caminho: string) => boolean;
}

const ITENS: ItemNav[] = [
  { href: "/", rotulo: "Abrir chamado", icone: CirclePlus, ativo: (c) => c === "/" },
  {
    href: "/meus-chamados",
    rotulo: "Meus chamados",
    icone: List,
    ativo: (c) => c.startsWith("/meus-chamados"),
  },
];

const consultarAguardando = async (fonte: FonteDeDados) =>
  (await fonte.listarChamados({ escopo: "meus", encerrados: false })).filter(
    (c) => c.status === "aguardando_usuario",
  ).length;

/** Contador laranja do mockup: chamados esperando resposta do solicitante. */
function useContadorPendencias(): number {
  return useConsulta(consultarAguardando).dados ?? 0;
}

function Contador({ valor }: { valor: number }) {
  if (valor === 0) return null;
  return (
    <span className="absolute -top-1.5 -right-2.5 flex size-5 items-center justify-center rounded-full bg-laranja text-[11px] font-bold text-white">
      {valor}
    </span>
  );
}

/** Menu inferior fixo do portal no celular (mockup, telas 1 e 4). */
export function MenuInferior() {
  const caminho = usePathname();
  const pendencias = useContadorPendencias();
  return (
    <nav
      aria-label="Menu principal"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-borda bg-superficie pb-[env(safe-area-inset-bottom)] md:hidden"
    >
      <ul className="mx-auto grid max-w-2xl grid-cols-2">
        {ITENS.map((item) => {
          const ativo = item.ativo(caminho);
          const Icone = item.icone;
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={ativo ? "page" : undefined}
                className={`flex min-h-16 flex-col items-center justify-center gap-1 text-sm font-semibold ${ativo ? "text-primaria" : "text-texto-suave"}`}
              >
                <span className="relative">
                  <Icone aria-hidden="true" className="size-6" strokeWidth={1.75} />
                  {item.href === "/meus-chamados" ? <Contador valor={pendencias} /> : null}
                </span>
                {item.rotulo}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/** No computador o mesmo menu fica no cabeçalho. */
export function MenuCabecalho() {
  const caminho = usePathname();
  const pendencias = useContadorPendencias();
  return (
    <nav aria-label="Menu principal" className="hidden items-center gap-1 md:flex">
      {ITENS.map((item) => {
        const ativo = item.ativo(caminho);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={ativo ? "page" : undefined}
            className={`relative inline-flex min-h-11 items-center rounded-xl px-3 font-semibold ${ativo ? "bg-primaria-suave text-primaria" : "text-texto-suave hover:text-texto"}`}
          >
            {item.rotulo}
            {item.href === "/meus-chamados" && pendencias > 0 ? (
              <span className="ml-2 flex size-5 items-center justify-center rounded-full bg-laranja text-[11px] font-bold text-white">
                {pendencias}
              </span>
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}
