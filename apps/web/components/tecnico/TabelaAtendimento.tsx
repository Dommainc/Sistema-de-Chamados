"use client";

import Link from "next/link";
import { useCallback } from "react";
import { Avatar } from "@/components/ui/Avatar";
import { BadgeStatus } from "@/components/ui/BadgeStatus";
import { BarraPrazo } from "@/components/ui/BarraPrazo";
import { Botao } from "@/components/ui/Botao";
import { useConsulta, useUsuario } from "@/lib/dados/provedor";
import type { FonteDeDados } from "@/lib/dados/tipos";
import { formatarNumeroChamado, tempoRelativo } from "@/lib/formato";
import { ESCOPO_DO_FILTRO, type FiltroResponsavel } from "./parametros";
import { useAcaoChamado } from "./useAcaoChamado";

const VAZIO: Record<FiltroResponsavel, string> = {
  todos: "Nenhum chamado em aberto.",
  meus: "Você não tem atendimentos em andamento.",
  sem_responsavel: "Nenhum chamado esperando na fila.",
};

/**
 * Modo "Lista" da área técnica. Abertos: prazo mais próximo primeiro, com "Assumir" na linha.
 * Encerrados ("Ver encerrados"): mais recentes primeiro, só leitura.
 */
export function TabelaAtendimento({
  filtro,
  busca,
  encerrados = false,
}: {
  filtro: FiltroResponsavel;
  busca: string;
  encerrados?: boolean;
}) {
  const usuario = useUsuario();
  const executar = useAcaoChamado();
  const consultar = useCallback(
    async (fonte: FonteDeDados) => {
      const [chamados, categorias, perfis] = await Promise.all([
        fonte.listarChamados({ escopo: ESCOPO_DO_FILTRO[filtro], encerrados }),
        fonte.listarCategorias(),
        fonte.listarPerfisPublicos(),
      ]);
      const categoria = new Map(categorias.map((c) => [c.id, c]));
      const perfil = new Map(perfis.map((p) => [p.id, p]));
      const termo = busca.trim().toLocaleLowerCase("pt-BR");
      return chamados
        .filter((c) => !termo || c.titulo.toLocaleLowerCase("pt-BR").includes(termo))
        .sort((a, b) =>
          encerrados
            ? b.atualizadoEm.localeCompare(a.atualizadoEm)
            : a.prazoSla.localeCompare(b.prazoSla),
        )
        .map((c) => ({
          chamado: c,
          categoria: categoria.get(c.categoriaId),
          solicitante: perfil.get(c.solicitanteId),
          responsavel: c.responsavelId ? perfil.get(c.responsavelId) : undefined,
        }));
    },
    [filtro, busca, encerrados],
  );
  const { dados: linhas, erro, carregando } = useConsulta(consultar);

  if (carregando) return <p className="text-texto-suave">Carregando...</p>;
  if (erro) return <p className="text-perigo">{erro.message}</p>;
  if (!linhas || linhas.length === 0) {
    return (
      <p className="rounded-2xl border border-borda bg-superficie p-6 text-center text-texto-suave">
        {busca
          ? `Nenhum chamado com "${busca}" no título.`
          : encerrados
            ? "Nenhum chamado encerrado."
            : VAZIO[filtro]}
      </p>
    );
  }

  const agora = new Date();
  return (
    <div className="overflow-x-auto rounded-2xl border border-borda bg-superficie shadow-sm">
      <table className="w-full min-w-[60rem] text-left text-sm">
        <thead className="border-b border-borda text-xs font-semibold tracking-wide text-texto-suave uppercase">
          <tr>
            <th className="px-4 py-3">Nº</th>
            <th className="px-4 py-3">Chamado</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3">Responsável</th>
            <th className="px-4 py-3">Aberto</th>
            <th className="w-56 px-4 py-3">{encerrados ? "Encerrado" : "Prazo"}</th>
            {encerrados ? null : (
              <th className="px-4 py-3">
                <span className="sr-only">Ação</span>
              </th>
            )}
          </tr>
        </thead>
        <tbody>
          {linhas.map(({ chamado: c, categoria, solicitante, responsavel }) => (
            <tr key={c.id} className="border-b border-borda last:border-0 hover:bg-fundo">
              <td className="px-4 py-3 font-mono font-semibold text-texto-suave">
                {formatarNumeroChamado(c.id)}
              </td>
              <td className="px-4 py-3">
                <Link href={`/atendimento/${c.id}`} className="font-semibold hover:underline">
                  {c.titulo}
                </Link>
                <span className="block text-texto-suave">
                  {solicitante?.nome ?? "—"}
                  {solicitante?.departamento ? `, ${solicitante.departamento}` : ""} ·{" "}
                  {categoria?.nomeCurto ?? "—"}
                </span>
              </td>
              <td className="px-4 py-3">
                <BadgeStatus status={c.status} papel="ti" tamanho="pequeno" />
              </td>
              <td className="px-4 py-3">
                {responsavel ? (
                  <span className="flex items-center gap-2">
                    <Avatar nome={responsavel.nome} tom="suave" tamanho="pequeno" />
                    {responsavel.nome}
                  </span>
                ) : (
                  <span className="text-texto-suave">Sem responsável</span>
                )}
              </td>
              <td className="px-4 py-3 whitespace-nowrap text-texto-suave">
                {tempoRelativo(c.criadoEm, agora)}
              </td>
              <td className="px-4 py-3">
                {encerrados ? (
                  <span className="text-texto-suave">{tempoRelativo(c.atualizadoEm, agora)}</span>
                ) : (
                  <BarraPrazo criadoEm={c.criadoEm} prazo={c.prazoSla} agora={agora} />
                )}
              </td>
              {encerrados ? null : (
                <td className="px-4 py-3 text-right">
                  {c.status === "pendente" ||
                  (c.status === "transferido" && c.responsavelId === usuario.id) ? (
                    <Botao
                      variante="escuro"
                      className="min-h-10 px-3 text-sm"
                      onClick={() => void executar(c.id, "assumir")}
                    >
                      Assumir
                    </Botao>
                  ) : null}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
