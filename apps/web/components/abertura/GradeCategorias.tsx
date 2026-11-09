"use client";

import Link from "next/link";
import { IconeCategoria } from "@/components/ui/IconeCategoria";
import { useConsulta, useUsuario } from "@/lib/dados/provedor";
import type { FonteDeDados } from "@/lib/dados/tipos";
import { caminhosAbertura, comReferente } from "@/lib/rotas";

const consultarCategorias = (fonte: FonteDeDados) => fonte.listarCategorias();

/**
 * Passo 1 do "Abrir chamado": ícones grandes em linha com o nome embaixo, sem caixas (pedido do dono,
 * 2026-11-09 — as caixas de tamanhos diferentes incomodavam). No celular, 2 por linha.
 */
export function GradeCategorias({ referente }: { referente: number | null }) {
  const caminhos = caminhosAbertura(useUsuario().papel);
  const { dados: categorias, erro, carregando } = useConsulta(consultarCategorias);

  if (carregando) return <p className="text-texto-suave">Carregando...</p>;
  if (erro) return <p className="text-perigo">{erro.message}</p>;

  return (
    <ul className="grid grid-cols-2 gap-x-4 gap-y-8 py-2 sm:grid-cols-4">
      {(categorias ?? []).map((c) => (
        <li key={c.id}>
          <Link
            href={comReferente(caminhos.formulario(c.id), referente)}
            title={c.descricao || undefined}
            className="group flex h-full flex-col items-center gap-3 rounded-2xl p-3 text-center focus-visible:outline-2 focus-visible:outline-primaria"
          >
            <span className="rounded-full ring-primaria ring-offset-4 ring-offset-fundo transition group-hover:ring-2 group-focus-visible:ring-2">
              <IconeCategoria icone={c.icone} tamanho="grande" />
            </span>
            <span className="max-w-48 leading-snug font-semibold group-hover:text-primaria">
              {c.nomeCurto}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
