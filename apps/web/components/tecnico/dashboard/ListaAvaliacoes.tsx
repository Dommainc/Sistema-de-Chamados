"use client";

import { ChevronLeft, Star } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo } from "react";
import { Estrelas, NOMES_NOTA } from "@/components/ui/Estrelas";
import { useConsulta } from "@/lib/dados/provedor";
import type { FonteDeDados } from "@/lib/dados/tipos";
import { formatarDataHora, formatarNumeroChamado } from "@/lib/formato";
import { formatarNota, montarPeriodo } from "@/lib/metricas";
import { comParametro } from "../FiltrosQuadro";

const PERIODOS = [
  { valor: "todas", rotulo: "Todo o período" },
  { valor: "7d", rotulo: "Últimos 7 dias" },
  { valor: "30d", rotulo: "Últimos 30 dias" },
  { valor: "mes", rotulo: "Este mês" },
  { valor: "mes_passado", rotulo: "Mês passado" },
] as const;

const SELECT =
  "min-h-11 rounded-xl border border-borda bg-superficie px-3 text-sm font-semibold text-texto";

/**
 * "Ver todas as avaliações" (ADR 0015): a pesquisa de satisfação de cada chamado, da mais recente para a
 * mais antiga, com quem avaliou e o técnico. Filtros de período, técnico e nota ficam na URL.
 */
export function ListaAvaliacoes({
  periodo = "todas",
  tecnico = null,
  nota = null,
}: {
  periodo?: string;
  tecnico?: string | null;
  nota?: number | null;
}) {
  const router = useRouter();
  const caminho = usePathname();
  const parametros = useSearchParams();
  const trocar = (chave: string, valor: string | null) =>
    router.replace(comParametro(new URLSearchParams(parametros.toString()), chave, valor, caminho));

  const consultar = useCallback(async (f: FonteDeDados) => {
    const [avaliacoes, chamados, perfis] = await Promise.all([
      f.listarAvaliacoes(),
      f.listarChamados({ escopo: "todos", encerrados: true }),
      f.listarPerfisPublicos(),
    ]);
    return {
      avaliacoes,
      chamado: new Map(chamados.map((c) => [c.id, c])),
      perfis,
      perfil: new Map(perfis.map((p) => [p.id, p])),
    };
  }, []);
  const { dados, erro, carregando } = useConsulta(consultar);

  const faixa = useMemo(
    () => (periodo === "todas" ? null : montarPeriodo(periodo, new Date())),
    [periodo],
  );
  const lista = (dados?.avaliacoes ?? []).filter((a) => {
    const t = new Date(a.criadoEm).getTime();
    if (faixa && (t < faixa.inicio.getTime() || t >= faixa.fim.getTime())) return false;
    if (nota !== null && a.nota !== nota) return false;
    if (tecnico && dados?.chamado.get(a.chamadoId)?.responsavelId !== tecnico) return false;
    return true;
  });
  const media = lista.length ? lista.reduce((s, a) => s + a.nota, 0) / lista.length : null;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-1">
        <Link
          href="/atendimento/dashboard"
          className="inline-flex min-h-11 items-center gap-1 self-start text-sm font-semibold text-primaria"
        >
          <ChevronLeft aria-hidden="true" className="size-4" /> Dashboard
        </Link>
        <h1 className="text-2xl font-bold">Avaliações</h1>
        <p className="flex items-center gap-1.5 text-texto-suave">
          <Star aria-hidden="true" className="size-5 fill-amarelo text-amarelo" />
          <strong className="text-texto">{formatarNota(media)}</strong> de média · {lista.length}{" "}
          avaliação(ões)
        </p>
      </div>

      <div className="flex flex-wrap gap-3">
        <select
          aria-label="Período"
          className={SELECT}
          value={periodo}
          onChange={(e) => trocar("periodo", e.target.value === "todas" ? null : e.target.value)}
        >
          {PERIODOS.map((p) => (
            <option key={p.valor} value={p.valor}>
              {p.rotulo}
            </option>
          ))}
        </select>
        <select
          aria-label="Técnico"
          className={SELECT}
          value={tecnico ?? ""}
          onChange={(e) => trocar("tecnico", e.target.value || null)}
        >
          <option value="">Todos os técnicos</option>
          {(dados?.perfis ?? [])
            .filter((p) => p.papel === "ti")
            .map((p) => (
              <option key={p.id} value={p.id}>
                {p.nome}
              </option>
            ))}
        </select>
        <select
          aria-label="Nota"
          className={SELECT}
          value={nota ?? ""}
          onChange={(e) => trocar("nota", e.target.value || null)}
        >
          <option value="">Qualquer nota</option>
          {[5, 4, 3, 2, 1].map((n) => (
            <option key={n} value={n}>
              {n} {n === 1 ? "estrela" : "estrelas"} · {NOMES_NOTA[n]}
            </option>
          ))}
        </select>
      </div>

      {carregando ? <p className="text-texto-suave">Carregando avaliações...</p> : null}
      {erro ? <p className="text-perigo">{erro.message}</p> : null}
      {dados && lista.length === 0 ? (
        <p className="rounded-2xl border border-borda bg-superficie p-6 text-center text-texto-suave">
          Nenhuma avaliação com esses filtros.
        </p>
      ) : null}

      <ul className="grid gap-3 lg:grid-cols-2">
        {lista.map((a) => {
          const c = dados?.chamado.get(a.chamadoId);
          const avaliador = dados?.perfil.get(a.avaliadorId)?.nome ?? "—";
          const atendente = c?.responsavelId ? dados?.perfil.get(c.responsavelId)?.nome : null;
          return (
            <li
              key={a.chamadoId}
              className="flex flex-col gap-2 rounded-2xl border border-borda bg-superficie p-4 shadow-sm"
            >
              <p className="flex flex-wrap items-center gap-2">
                <Estrelas nota={a.nota} tamanho="medio" />
                <span className="font-semibold">{NOMES_NOTA[a.nota]}</span>
              </p>
              <Link href={`/atendimento/${a.chamadoId}`} className="font-semibold hover:underline">
                {formatarNumeroChamado(a.chamadoId)} {c?.titulo ?? ""}
              </Link>
              {a.comentario ? (
                <p className="whitespace-pre-line">“{a.comentario}”</p>
              ) : (
                <p className="text-sm text-texto-suave">Sem comentário.</p>
              )}
              <p className="text-xs text-texto-suave">
                {avaliador}
                {atendente ? ` · atendido por ${atendente}` : ""} · {formatarDataHora(a.criadoEm)}
              </p>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
