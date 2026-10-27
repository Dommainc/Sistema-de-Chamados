"use client";

import { ChartColumn, Search } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { BotaoTemaPerfil } from "@/components/comum/BotaoTemaPerfil";
import { MenuUsuario } from "@/components/comum/MenuUsuario";
import { Logo } from "@/components/ui/Logo";
import { useConsulta, useUsuario } from "@/lib/dados/provedor";
import type { FonteDeDados } from "@/lib/dados/tipos";
import { destinoBusca } from "./parametros";

const consultarContadores = (fonte: FonteDeDados) => fonte.obterContadores();

function CampoBusca({ className = "" }: { className?: string }) {
  const router = useRouter();
  const [texto, setTexto] = useState("");
  return (
    <form
      role="search"
      className={`relative ${className}`}
      onSubmit={(e) => {
        e.preventDefault();
        const destino = destinoBusca(texto);
        if (destino) router.push(destino);
      }}
    >
      <Search
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-sobre-barra-suave"
      />
      <input
        type="search"
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        aria-label="Buscar chamado por ID, título ou solicitante"
        placeholder="Buscar por ID, título ou solicitante"
        className="min-h-11 w-full rounded-xl bg-barra-2 pr-3 pl-9 text-sobre-barra placeholder:text-sobre-barra-suave"
      />
    </form>
  );
}

/** Abas "Quadro | Lista" (layout novo): trocam a visão mantendo os filtros escolhidos. */
function AbasVisao() {
  const caminho = usePathname();
  const parametros = useSearchParams();
  const noQuadro = caminho === "/atendimento";
  const lista = noQuadro && parametros.get("visao") === "lista";
  const link = (visao: "quadro" | "lista") => {
    const p = new URLSearchParams(noQuadro ? parametros.toString() : "");
    if (visao === "lista") p.set("visao", "lista");
    else p.delete("visao");
    p.delete("agrupar");
    p.delete("ordem");
    if (visao === "lista") {
      for (const chave of ["agrupar", "ordem"]) {
        const valor = noQuadro ? parametros.get(chave) : null;
        if (valor) p.set(chave, valor);
      }
    }
    const texto = p.toString();
    return texto ? `/atendimento?${texto}` : "/atendimento";
  };
  const aba = (ativa: boolean) =>
    `inline-flex min-h-9 items-center rounded-lg px-3 text-sm font-semibold ${
      ativa ? "bg-barra-2 text-sobre-barra" : "text-sobre-barra-suave hover:text-sobre-barra"
    }`;
  return (
    <nav aria-label="Visão" className="flex items-center gap-1">
      <Link
        href={link("quadro")}
        aria-current={noQuadro && !lista ? "page" : undefined}
        className={aba(noQuadro && !lista)}
      >
        Quadro
      </Link>
      <Link href={link("lista")} aria-current={lista ? "page" : undefined} className={aba(lista)}>
        Lista
      </Link>
    </nav>
  );
}

/** Botão "Dashboard" (ADR 0013), ao lado da busca. */
function BotaoDashboard({ className = "" }: { className?: string }) {
  const ativo = usePathname().startsWith("/atendimento/dashboard");
  return (
    <Link
      href="/atendimento/dashboard"
      aria-current={ativo ? "page" : undefined}
      className={`inline-flex min-h-11 shrink-0 items-center gap-2 rounded-xl px-3 font-semibold ${
        ativo ? "bg-sobre-barra text-barra" : "bg-barra-2 text-sobre-barra hover:bg-barra-2/70"
      } ${className}`}
    >
      <ChartColumn aria-hidden="true" className="size-5" />
      Dashboard
    </Link>
  );
}

/** Barra escura da área técnica (docs/ui-ux.md, telas 6–9). */
export function BarraTecnico() {
  const usuario = useUsuario();
  const { dados: contadores } = useConsulta(consultarContadores);
  const resumo =
    contadores === undefined ? undefined : `${contadores.meusAtendimentos} em atendimento`;

  return (
    <header className="border-b border-borda bg-barra text-sobre-barra print:hidden">
      <div className="flex w-full items-center justify-between gap-4 px-4 py-2.5">
        <div className="flex items-center gap-5">
          <Link
            href="/atendimento"
            aria-label="DOMMA — voltar ao quadro"
            className="flex min-h-11 items-center"
          >
            <Logo tema="escuro" />
          </Link>
          <span className="rounded-md bg-barra-2 px-2 py-0.5 text-xs font-bold text-sobre-barra-suave">
            TI
          </span>
          <AbasVisao />
        </div>
        <div className="flex items-center gap-4">
          {/* Computador: ao lado da busca. Celular: na linha de baixo, junto da busca. */}
          <div className="hidden md:block">
            <BotaoDashboard />
          </div>
          <CampoBusca className="hidden w-72 md:block" />
          <BotaoTemaPerfil naBarra />
          <MenuUsuario
            nome={usuario.nome}
            resumo={resumo}
            tema="escuro"
            atalhos={[
              { href: "/atendimento/novo", rotulo: "Abrir chamado" },
              { href: "/atendimento/ajuda", rotulo: "Ajuda" },
            ]}
          />
        </div>
      </div>
      <div className="flex gap-2 px-4 pb-3 md:hidden">
        <CampoBusca className="flex-1" />
        <BotaoDashboard />
      </div>
    </header>
  );
}
