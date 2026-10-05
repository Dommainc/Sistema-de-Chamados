"use client";

import Link from "next/link";
import { useCallback, useState } from "react";
import { BadgeStatus } from "@/components/ui/BadgeStatus";
import { Segmentado } from "@/components/ui/Segmentado";
import { useConsulta } from "@/lib/dados/provedor";
import type { FonteDeDados, PerfilPublico } from "@/lib/dados/tipos";
import type { Chamado } from "@/lib/dominio/tipos";
import { formatarAtualizacao, formatarNumeroChamado, formatarQuando } from "@/lib/formato";

type Aba = "andamento" | "encerrados";

/** A informação mais útil no canto do cartão (mockup, tela 4). */
function infoDoCanto(c: Chamado, responsavel: PerfilPublico | undefined): string | null {
  if (c.status === "pendente") return `Previsão: ${formatarQuando(c.prazoSla)}`;
  if (["em_andamento", "aguardando_usuario", "transferido"].includes(c.status) && responsavel) {
    return `Com ${responsavel.nome}`;
  }
  return null;
}

export function ListaMeusChamados() {
  const [aba, setAba] = useState<Aba>("andamento");
  const consultar = useCallback(async (fonte: FonteDeDados) => {
    const [chamados, perfis] = await Promise.all([
      fonte.listarChamados({ escopo: "meus" }),
      fonte.listarPerfisPublicos(),
    ]);
    return { chamados, perfis: new Map(perfis.map((p) => [p.id, p])) };
  }, []);
  const { dados, erro, carregando } = useConsulta(consultar);

  const encerrado = (c: Chamado) => c.status === "concluido" || c.status === "cancelado";
  const emAndamento = dados?.chamados.filter((c) => !encerrado(c)) ?? [];
  const encerrados = dados?.chamados.filter(encerrado) ?? [];
  // Quem espera resposta vem primeiro.
  const lista = [...(aba === "andamento" ? emAndamento : encerrados)].sort(
    (a, b) => Number(b.status === "aguardando_usuario") - Number(a.status === "aguardando_usuario"),
  );

  return (
    <div className="flex flex-col gap-4">
      <Segmentado
        rotuloAcessivel="Filtrar chamados"
        larguraTotal
        valor={aba}
        aoMudar={setAba}
        opcoes={[
          { valor: "andamento", rotulo: `Em andamento (${emAndamento.length})` },
          { valor: "encerrados", rotulo: "Encerrados" },
        ]}
      />

      {carregando ? <p className="text-texto-suave">Carregando...</p> : null}
      {erro ? <p className="text-perigo">{erro.message}</p> : null}
      {dados && lista.length === 0 ? (
        <p className="rounded-2xl border border-borda bg-superficie p-6 text-center text-texto-suave">
          {aba === "andamento"
            ? "Você não tem chamados em andamento."
            : "Nenhum chamado encerrado."}
        </p>
      ) : null}

      <ul className="flex flex-col gap-3">
        {lista.map((c) => {
          const aguardando = c.status === "aguardando_usuario";
          const canto = infoDoCanto(
            c,
            c.responsavelId ? dados?.perfis.get(c.responsavelId) : undefined,
          );
          return (
            <li key={c.id}>
              <Link
                href={`/meus-chamados/${c.id}`}
                className={`flex flex-col gap-2 rounded-2xl border bg-superficie p-4 shadow-sm transition-colors hover:border-primaria ${aguardando ? "border-2 border-alerta-borda" : "border-borda"}`}
              >
                <div className="flex items-center justify-between gap-2 text-sm">
                  <span className="font-mono font-semibold text-texto-suave">
                    {formatarNumeroChamado(c.id)}
                  </span>
                  {canto ? <span className="text-texto-suave">{canto}</span> : null}
                </div>
                <span className="text-lg font-semibold">{c.titulo}</span>
                <div className="flex items-center justify-between gap-2">
                  <BadgeStatus status={c.status} papel="solicitante" />
                  <span className="text-sm text-texto-suave">
                    {formatarAtualizacao(c.atualizadoEm)}
                  </span>
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
