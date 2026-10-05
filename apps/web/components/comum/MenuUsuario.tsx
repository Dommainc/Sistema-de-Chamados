"use client";

import { LogOut } from "lucide-react";
import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { sair } from "@/app/acoes-sessao";
import { Avatar } from "@/components/ui/Avatar";

/**
 * Avatar com iniciais que abre um menu (nome, atalhos e Sair).
 * No portal fica só o avatar; na área técnica aparecem também nome e resumo ("3 em atendimento").
 */
export function MenuUsuario({
  nome,
  resumo,
  tema = "claro",
  atalhos = [],
}: {
  nome: string;
  resumo?: string;
  tema?: "claro" | "escuro";
  atalhos?: { href: string; rotulo: string }[];
}) {
  const [aberto, setAberto] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const idMenu = useId();

  useEffect(() => {
    if (!aberto) return;
    function fechar(evento: MouseEvent | KeyboardEvent) {
      if (evento instanceof KeyboardEvent && evento.key !== "Escape") return;
      if (evento instanceof MouseEvent && ref.current?.contains(evento.target as Node)) return;
      setAberto(false);
    }
    document.addEventListener("mousedown", fechar);
    document.addEventListener("keydown", fechar);
    return () => {
      document.removeEventListener("mousedown", fechar);
      document.removeEventListener("keydown", fechar);
    };
  }, [aberto]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={aberto}
        aria-controls={idMenu}
        aria-label={`Menu de ${nome}`}
        onClick={() => setAberto((v) => !v)}
        className="flex min-h-11 items-center gap-3 rounded-full"
      >
        <Avatar nome={nome} tom={tema === "escuro" ? "claro" : "primaria"} />
        {resumo ? (
          <span className="hidden flex-col text-left leading-tight sm:flex">
            <span className="text-sm font-semibold">{nome}</span>
            <span className="text-xs text-sobre-barra-suave">{resumo}</span>
          </span>
        ) : null}
      </button>

      {aberto ? (
        <div
          id={idMenu}
          role="menu"
          className="absolute right-0 z-40 mt-2 flex w-60 flex-col rounded-2xl border border-borda bg-superficie p-2 text-texto shadow-lg"
        >
          <p className="px-3 py-2 text-sm">
            <span className="block font-semibold">{nome}</span>
            {resumo ? <span className="text-texto-suave">{resumo}</span> : null}
          </p>
          {atalhos.map((a) => (
            <Link
              key={a.href}
              href={a.href}
              role="menuitem"
              onClick={() => setAberto(false)}
              className="flex min-h-11 items-center rounded-xl px-3 font-medium hover:bg-fundo"
            >
              {a.rotulo}
            </Link>
          ))}
          <form action={sair}>
            <button
              type="submit"
              role="menuitem"
              className="flex min-h-11 w-full items-center gap-2 rounded-xl px-3 font-medium text-perigo hover:bg-perigo-suave"
            >
              <LogOut aria-hidden="true" className="size-4" /> Sair
            </button>
          </form>
        </div>
      ) : null}
    </div>
  );
}
