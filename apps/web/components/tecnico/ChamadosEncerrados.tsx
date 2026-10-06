"use client";

import Link from "next/link";
import { useCallback } from "react";
import { BadgeStatus } from "@/components/ui/BadgeStatus";
import { NumeroTicket } from "@/components/ui/NumeroTicket";
import { useConsulta } from "@/lib/dados/provedor";
import type { FonteDeDados } from "@/lib/dados/tipos";
import { formatarAtualizacao } from "@/lib/formato";

/**
 * "Ver encerrados": concluídos e cancelados, mais recentes primeiro, só para consulta.
 * Mesmo visual dos cartões do quadro (a área técnica não tem modo lista).
 */
export function ChamadosEncerrados() {
  const consultar = useCallback(async (f: FonteDeDados) => {
    const [chamados, categorias, perfis] = await Promise.all([
      f.listarChamados({ escopo: "todos", encerrados: true }),
      f.listarCategorias(),
      f.listarPerfisPublicos(),
    ]);
    return {
      chamados,
      categoria: new Map(categorias.map((c) => [c.id, c])),
      perfil: new Map(perfis.map((p) => [p.id, p])),
    };
  }, []);
  const { dados, erro, carregando } = useConsulta(consultar);

  if (carregando) return <p className="text-texto-suave">Carregando...</p>;
  if (erro || !dados) return <p className="text-perigo">{erro?.message}</p>;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="text-2xl font-bold">
          Chamados encerrados{" "}
          <span className="font-semibold text-texto-suave">{dados.chamados.length}</span>
        </h1>
        <Link
          href="/atendimento"
          className="inline-flex min-h-11 items-center font-semibold text-primaria underline"
        >
          Voltar ao quadro
        </Link>
      </div>

      {dados.chamados.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-borda p-6 text-center text-texto-suave">
          Nenhum chamado encerrado ainda.
        </p>
      ) : (
        <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {dados.chamados.map((c) => {
            const responsavel = c.responsavelId ? dados.perfil.get(c.responsavelId) : undefined;
            return (
              <li key={c.id}>
                <Link
                  href={`/atendimento/${c.id}`}
                  aria-label={`Chamado ${c.id}: ${c.titulo}`}
                  className="flex h-full overflow-hidden rounded-2xl border border-borda bg-superficie shadow-sm hover:shadow-md"
                >
                  <NumeroTicket numero={c.id} />
                  <span className="flex min-w-0 flex-1 flex-col gap-1.5 p-3">
                    <span className="leading-snug font-semibold">{c.titulo}</span>
                    <span className="truncate text-xs text-texto-suave">
                      {dados.perfil.get(c.solicitanteId)?.nome ?? "—"} ·{" "}
                      {dados.categoria.get(c.categoriaId)?.nomeCurto ?? "—"}
                    </span>
                    <span className="mt-1 flex items-center justify-between gap-2 text-sm">
                      <BadgeStatus status={c.status} papel="ti" tamanho="pequeno" />
                      <span className="text-texto-suave">
                        {responsavel ? `${responsavel.nome.split(" ")[0]} · ` : ""}
                        {formatarAtualizacao(c.atualizadoEm)}
                      </span>
                    </span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
