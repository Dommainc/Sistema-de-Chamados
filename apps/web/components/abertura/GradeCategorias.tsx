"use client";

import Link from "next/link";
import { IconeCategoria } from "@/components/ui/IconeCategoria";
import { useConsulta, useUsuario } from "@/lib/dados/provedor";
import type { FonteDeDados } from "@/lib/dados/tipos";
import { caminhosAbertura, comReferente } from "@/lib/rotas";

const consultarCategorias = (fonte: FonteDeDados) => fonte.listarCategorias();

/**
 * Passo 1 do "Abrir chamado" (mockup, tela 1): grade de assuntos. Sem busca — com 4 assuntos
 * (reorganização do dono, 2026-10-08) ela não ajuda. "Outros pedidos para a TI" ocupa a linha toda.
 */
export function GradeCategorias({ referente }: { referente: number | null }) {
  const caminhos = caminhosAbertura(useUsuario().papel);
  const { dados: categorias, erro, carregando } = useConsulta(consultarCategorias);

  if (carregando) return <p className="text-texto-suave">Carregando...</p>;
  if (erro) return <p className="text-perigo">{erro.message}</p>;

  return (
    <ul className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      {(categorias ?? []).map((c) => (
        <li key={c.id} className={c.icone === "ellipsis" ? "sm:col-span-3" : ""}>
          <Link
            href={comReferente(caminhos.formulario(c.id), referente)}
            className="flex h-full min-h-20 items-center gap-3 rounded-2xl border border-borda bg-superficie p-3 font-semibold shadow-sm transition-colors hover:border-primaria hover:bg-primaria-suave"
          >
            <IconeCategoria icone={c.icone} />
            <span className="leading-snug">{c.nomeCurto}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
