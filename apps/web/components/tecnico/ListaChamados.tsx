"use client";

import { ArrowDown, ArrowUp, Clock, MessageSquare } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Avatar } from "@/components/ui/Avatar";
import type { Categoria } from "@/lib/dominio/tipos";
import { naoIniciado } from "@/lib/dominio/tipos";
import { rotuloStatus } from "@/lib/status";
import { tempoDoChamado, type DadosCartao } from "./CartaoChamado";
import { COR_PRIORIDADE } from "./cores";
import { comParametro } from "./FiltrosQuadro";
import { COLUNAS, DIAS_CONCLUIDOS, type ColunaQuadro } from "./quadro";

export type Agrupamento = "status" | "responsavel" | "categoria";
export type Ordem = "padrao" | "prazo" | "-prazo";

const AGRUPAMENTOS: { valor: Agrupamento; rotulo: string }[] = [
  { valor: "status", rotulo: "Status" },
  { valor: "responsavel", rotulo: "Responsável" },
  { valor: "categoria", rotulo: "Categoria" },
];

interface Grupo {
  chave: string;
  titulo: string;
  apoio?: string;
  linhas: DadosCartao[];
}

/** Agrupa as linhas (status na ordem do quadro; responsável e categoria em ordem alfabética). */
export function agrupar(
  porColuna: Record<ColunaQuadro, DadosCartao[]>,
  como: Agrupamento,
  categorias: readonly Categoria[],
): Grupo[] {
  if (como === "status") {
    return COLUNAS.map((c) => ({
      chave: c.id,
      titulo: c.titulo,
      apoio: c.encerrada ? `Últimos ${DIAS_CONCLUIDOS} dias` : undefined,
      linhas: porColuna[c.id],
    })).filter((g) => g.linhas.length > 0);
  }
  const todas = COLUNAS.flatMap((c) => porColuna[c.id]);
  const grupos = new Map<string, Grupo>();
  for (const d of todas) {
    const [chave, titulo] =
      como === "responsavel"
        ? d.responsavel
          ? [d.responsavel.id, d.responsavel.nome]
          : ["", "Sem responsável"]
        : [
            String(d.chamado.categoriaId),
            categorias.find((c) => c.id === d.chamado.categoriaId)?.nomeCurto ?? "—",
          ];
    if (!grupos.has(chave)) grupos.set(chave, { chave, titulo, linhas: [] });
    grupos.get(chave)!.linhas.push(d);
  }
  // "Sem responsável" por último; o resto em ordem alfabética.
  return [...grupos.values()].sort((a, b) =>
    a.chave === "" ? 1 : b.chave === "" ? -1 : a.titulo.localeCompare(b.titulo, "pt-BR"),
  );
}

/** Ordena pelo prazo (sem prazo por último), mantendo a ordem do quadro quando é "padrão". */
export function ordenar(linhas: readonly DadosCartao[], ordem: Ordem): DadosCartao[] {
  if (ordem === "padrao") return [...linhas];
  const sinal = ordem === "prazo" ? 1 : -1;
  return [...linhas].sort((a, b) => {
    const pa = a.chamado.prazoSla;
    const pb = b.chamado.prazoSla;
    if (!pa && !pb) return 0;
    if (!pa) return 1;
    if (!pb) return -1;
    return sinal * pa.localeCompare(pb);
  });
}

const CELULA = "px-3 py-2.5 align-middle";

/**
 * Visão "Lista" da área técnica (layout novo, parte 2): uma tabela com os mesmos chamados e filtros do quadro,
 * agrupada por status, responsável ou categoria, e ordenável pelo prazo.
 */
export function ListaChamados({
  porColuna,
  categorias,
  euId,
  agora,
  agrupamento,
  ordem,
}: {
  porColuna: Record<ColunaQuadro, DadosCartao[]>;
  categorias: readonly Categoria[];
  euId: string;
  agora: Date;
  agrupamento: Agrupamento;
  ordem: Ordem;
}) {
  const router = useRouter();
  const caminho = usePathname();
  const parametros = useSearchParams();
  const atuais = new URLSearchParams(parametros.toString());
  const grupos = agrupar(porColuna, agrupamento, categorias);
  const total = grupos.reduce((n, g) => n + g.linhas.length, 0);
  const proximaOrdem: Ordem =
    ordem === "prazo" ? "-prazo" : ordem === "-prazo" ? "padrao" : "prazo";

  return (
    <div className="flex flex-col gap-3">
      <label className="flex items-center gap-2 self-start text-sm font-semibold">
        Agrupar por
        <select
          className="min-h-10 rounded-xl border border-borda bg-superficie px-3 text-sm font-semibold"
          value={agrupamento}
          onChange={(e) =>
            router.replace(
              comParametro(
                atuais,
                "agrupar",
                e.target.value === "status" ? null : e.target.value,
                caminho,
              ),
            )
          }
        >
          {AGRUPAMENTOS.map((a) => (
            <option key={a.valor} value={a.valor}>
              {a.rotulo}
            </option>
          ))}
        </select>
      </label>

      <div className="overflow-x-auto rounded-2xl border border-borda bg-superficie">
        <table className="w-full min-w-[56rem] border-collapse text-sm">
          <thead>
            <tr className="border-b border-borda text-left text-xs font-semibold text-texto-suave">
              <th scope="col" className={`${CELULA} w-20`}>
                ID
              </th>
              <th scope="col" className={CELULA}>
                Chamado
              </th>
              <th scope="col" className={`${CELULA} w-36`}>
                Status
              </th>
              <th scope="col" className={`${CELULA} w-24`}>
                Prioridade
              </th>
              <th scope="col" className={`${CELULA} w-44`}>
                Responsável
              </th>
              <th
                scope="col"
                className={`${CELULA} w-52`}
                aria-sort={
                  ordem === "prazo" ? "ascending" : ordem === "-prazo" ? "descending" : "none"
                }
              >
                <button
                  type="button"
                  onClick={() =>
                    router.replace(
                      comParametro(
                        atuais,
                        "ordem",
                        proximaOrdem === "padrao" ? null : proximaOrdem,
                        caminho,
                      ),
                    )
                  }
                  className="inline-flex items-center gap-1 font-semibold hover:text-texto"
                >
                  Prazo do chamado
                  {ordem === "prazo" ? <ArrowDown aria-hidden="true" className="size-3.5" /> : null}
                  {ordem === "-prazo" ? <ArrowUp aria-hidden="true" className="size-3.5" /> : null}
                </button>
              </th>
              <th scope="col" className={`${CELULA} w-16 text-right`}>
                Msgs
              </th>
            </tr>
          </thead>
          {grupos.map((g) => (
            <tbody key={g.chave}>
              <tr className="bg-superficie-2/70">
                <th
                  scope="rowgroup"
                  colSpan={7}
                  className={`${CELULA} text-left text-sm font-bold`}
                >
                  {g.titulo}{" "}
                  <span className="ml-1 rounded-full bg-superficie px-2 text-xs font-semibold text-texto-suave">
                    {g.linhas.length}
                  </span>
                  {g.apoio ? (
                    <span className="ml-2 text-xs font-normal text-texto-suave">{g.apoio}</span>
                  ) : null}
                </th>
              </tr>
              {ordenar(g.linhas, ordem).map((d) => {
                const { chamado: c, coluna } = d;
                const tempo = tempoDoChamado(coluna, c, agora);
                const prioridade = naoIniciado(c.status) ? undefined : COR_PRIORIDADE[c.prioridade];
                const encerrado = coluna === "concluidos" || coluna === "cancelados";
                return (
                  <tr
                    key={c.id}
                    className={`border-t border-borda hover:bg-fundo ${encerrado ? "text-texto-suave" : ""}`}
                  >
                    <td className={`${CELULA} font-mono text-xs font-semibold text-texto-suave`}>
                      ID {c.id}
                    </td>
                    <td className={CELULA}>
                      <Link
                        href={`/atendimento/${c.id}`}
                        className="font-semibold text-texto hover:underline"
                      >
                        {c.titulo}
                      </Link>
                      <p className="text-xs text-texto-suave">
                        {d.solicitante?.nome ?? "—"} ·{" "}
                        {d.sistema && d.sistema.nome !== "Não se aplica"
                          ? d.sistema.nome
                          : d.assunto}
                      </p>
                    </td>
                    <td className={CELULA}>
                      {c.status === "aguardando_usuario"
                        ? "Aguardando solicitante"
                        : rotuloStatus(c.status, "ti").texto}
                    </td>
                    <td className={CELULA}>
                      {prioridade ? (
                        <span
                          className={`rounded px-1.5 py-0.5 text-[11px] font-bold ${prioridade.classe}`}
                        >
                          {prioridade.rotulo}
                        </span>
                      ) : null}
                    </td>
                    <td className={CELULA}>
                      {d.responsavel ? (
                        <span className="flex items-center gap-2">
                          <Avatar nome={d.responsavel.nome} tamanho="pequeno" tom="suave" />
                          {d.responsavel.id === euId ? "Você" : d.responsavel.nome}
                        </span>
                      ) : (
                        <span className="rounded-full border border-dashed border-borda px-2 py-0.5 text-xs">
                          Sem responsável
                        </span>
                      )}
                    </td>
                    <td className={CELULA}>
                      <span
                        className={`inline-flex items-center gap-1.5 whitespace-nowrap ${tempo.atrasado ? "font-bold text-texto" : ""}`}
                      >
                        <Clock aria-hidden="true" className="size-3.5 shrink-0 text-texto-suave" />
                        {tempo.texto}
                      </span>
                    </td>
                    <td className={`${CELULA} text-right`}>
                      {d.naoLidas > 0 ? (
                        <span className="inline-flex items-center gap-1 font-semibold text-texto">
                          <MessageSquare aria-hidden="true" className="size-3.5" />
                          {d.naoLidas}
                        </span>
                      ) : null}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          ))}
        </table>
        {total === 0 ? (
          <p className="p-6 text-center text-sm text-texto-suave">
            Nenhum chamado com esses filtros.
          </p>
        ) : null}
      </div>
      <p className="flex justify-between text-xs text-texto-suave">
        <span>{total} chamado(s)</span>
        <span>Concluídos e cancelados dos últimos {DIAS_CONCLUIDOS} dias</span>
      </p>
    </div>
  );
}
