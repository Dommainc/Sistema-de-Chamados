"use client";

import Link from "next/link";
import { useCallback } from "react";
import { BadgeStatus } from "@/components/ui/BadgeStatus";
import { useConsulta } from "@/lib/dados/provedor";
import type { EscopoChamados, FonteDeDados } from "@/lib/dados/tipos";
import { formatarDataHora, formatarNumeroChamado, tempoRelativo } from "@/lib/formato";

export type AbaAtendimento = "fila" | "meus" | "todos";

const ESCOPO: Record<AbaAtendimento, EscopoChamados> = {
  fila: "fila",
  meus: "meus_atendimentos",
  todos: "todos",
};

const VAZIO: Record<AbaAtendimento, string> = {
  fila: "Nenhum chamado esperando na fila.",
  meus: "Você não tem atendimentos em andamento.",
  todos: "Nenhum chamado.",
};

/**
 * Esqueleto da fila (Entrega 1). Filtros, busca, destaque de prazo e ações rápidas
 * chegam na Entrega 3.
 */
export function TabelaAtendimento({ aba }: { aba: AbaAtendimento }) {
  const consultar = useCallback(
    async (fonte: FonteDeDados) => {
      const [chamados, categorias, perfis] = await Promise.all([
        fonte.listarChamados({ escopo: ESCOPO[aba] }),
        fonte.listarCategorias(),
        fonte.listarPerfisPublicos(),
      ]);
      const nomeCategoria = new Map(categorias.map((c) => [c.id, c.nome]));
      const perfil = new Map(perfis.map((p) => [p.id, p]));
      return [...chamados]
        .sort((a, b) => a.prazoSla.localeCompare(b.prazoSla))
        .map((c) => ({
          chamado: c,
          categoria: nomeCategoria.get(c.categoriaId) ?? "—",
          solicitante: perfil.get(c.solicitanteId),
          responsavel: c.responsavelId ? perfil.get(c.responsavelId) : undefined,
        }));
    },
    [aba],
  );
  const { dados: linhas, erro, carregando } = useConsulta(consultar);

  if (carregando) return <p className="text-texto-suave">Carregando...</p>;
  if (erro) return <p className="text-perigo">{erro.message}</p>;
  if (!linhas || linhas.length === 0) return <p className="text-texto-suave">{VAZIO[aba]}</p>;

  return (
    <div className="overflow-x-auto rounded-xl border border-borda bg-superficie">
      <table className="w-full min-w-[56rem] text-left text-sm">
        <thead className="border-b border-borda bg-fundo text-texto-suave">
          <tr>
            <th className="px-3 py-2 font-medium">Nº</th>
            <th className="px-3 py-2 font-medium">Título</th>
            <th className="px-3 py-2 font-medium">Solicitante</th>
            <th className="px-3 py-2 font-medium">Categoria</th>
            <th className="px-3 py-2 font-medium">Status</th>
            <th className="px-3 py-2 font-medium">Responsável</th>
            <th className="px-3 py-2 font-medium">Aberto</th>
            <th className="px-3 py-2 font-medium">Prazo</th>
          </tr>
        </thead>
        <tbody>
          {linhas.map(({ chamado: c, categoria, solicitante, responsavel }) => (
            <tr key={c.id} className="border-b border-borda last:border-0 hover:bg-primaria-suave">
              <td className="px-3 py-2 font-semibold">
                <Link href={`/atendimento/${c.id}`} className="hover:underline">
                  {formatarNumeroChamado(c.id)}
                </Link>
              </td>
              <td className="px-3 py-2">
                <Link href={`/atendimento/${c.id}`} className="hover:underline">
                  {c.titulo}
                </Link>
              </td>
              <td className="px-3 py-2">
                {solicitante?.nome ?? "—"}
                {solicitante?.departamento ? (
                  <span className="block text-texto-suave">{solicitante.departamento}</span>
                ) : null}
              </td>
              <td className="px-3 py-2">{categoria}</td>
              <td className="px-3 py-2">
                <BadgeStatus status={c.status} papel="ti" />
              </td>
              <td className="px-3 py-2">{responsavel?.nome ?? "—"}</td>
              <td className="px-3 py-2 whitespace-nowrap">{tempoRelativo(c.criadoEm)}</td>
              <td className="px-3 py-2 whitespace-nowrap">{formatarDataHora(c.prazoSla)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
