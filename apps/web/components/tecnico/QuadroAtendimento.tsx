"use client";

import { ListFilter } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { useToast } from "@/components/ui/Toast";
import { useConsulta, useUsuario } from "@/lib/dados/provedor";
import type { FonteDeDados } from "@/lib/dados/tipos";
import { mensagemErro } from "@/lib/erros/catalogo";
import type { DadosCartao } from "./CartaoChamado";
import { ColunaQuadro } from "./ColunaQuadro";
import { FiltrosQuadro, Legenda } from "./FiltrosQuadro";
import { ProximoDaFila } from "./ProximoDaFila";
import {
  acaoDoArraste,
  COLUNAS,
  filtrarChamados,
  montarQuadro,
  ordenarNovos,
  type ColunaQuadro as IdColuna,
  type FiltrosQuadro as Filtros,
} from "./quadro";
import { useAcaoChamado } from "./useAcaoChamado";

const SEGUNDOS_DESTAQUE = 6;

/** Quadro da área técnica (mockup, telas 6 e 8). */
export function QuadroAtendimento({ filtros }: { filtros: Filtros }) {
  const usuario = useUsuario();
  const router = useRouter();
  const executar = useAcaoChamado();
  const { mostrar } = useToast();
  const [pegando, setPegando] = useState(false);
  const [colunaCelular, setColunaCelular] = useState<IdColuna>("novos");
  const [filtrosAbertos, setFiltrosAbertos] = useState(false);
  const [destacados, setDestacados] = useState<ReadonlySet<number>>(new Set());
  const conhecidos = useRef<Set<number> | null>(null);

  const consultar = useCallback(async (f: FonteDeDados) => {
    const [chamados, categorias, perfis, naoLidas, proximo] = await Promise.all([
      f.listarChamados({ escopo: "todos", encerrados: false }),
      f.listarCategorias(),
      f.listarPerfisPublicos(),
      f.contarNaoLidas(),
      f.proximoDaFila(),
    ]);
    // Quem transferiu cada chamado transferido (selo "por Thiago").
    const transferidos = chamados.filter((c) => c.status === "transferido");
    const historicos = await Promise.all(transferidos.map((c) => f.listarHistorico(c.id)));
    const transferidoPor = new Map(
      transferidos.map((c, i) => [
        c.id,
        historicos[i].filter((h) => h.acao === "transferido").at(-1)?.autorId ?? null,
      ]),
    );
    return { chamados, categorias, perfis, naoLidas, proximo, transferidoPor };
  }, []);
  const { dados, erro, carregando } = useConsulta(consultar);

  // Chamado que aparece enquanto o quadro está aberto ganha destaque por alguns segundos.
  useEffect(() => {
    if (!dados) return;
    const ids = dados.chamados.map((c) => c.id);
    if (conhecidos.current === null) {
      conhecidos.current = new Set(ids);
      return;
    }
    const novos = ids.filter((id) => !conhecidos.current!.has(id));
    ids.forEach((id) => conhecidos.current!.add(id));
    if (novos.length === 0) return;
    setDestacados((atual) => new Set([...atual, ...novos]));
    // Sem cancelar no cleanup: uma atualização logo em seguida não pode deixar o destaque preso.
    setTimeout(
      () => setDestacados((atual) => new Set([...atual].filter((id) => !novos.includes(id)))),
      SEGUNDOS_DESTAQUE * 1000,
    );
  }, [dados]);

  if (carregando) return <p className="text-texto-suave">Carregando quadro...</p>;
  if (erro || !dados) return <p className="text-perigo">{erro?.message}</p>;

  const agora = new Date();
  const perfil = new Map(dados.perfis.map((p) => [p.id, p]));
  const categoria = new Map(dados.categorias.map((c) => [c.id, c]));
  const quadro = montarQuadro(filtrarChamados(dados.chamados, filtros, usuario.id, agora));
  quadro.novos = ordenarNovos(quadro.novos, usuario.id, agora);
  const cartoes = (coluna: IdColuna): DadosCartao[] =>
    quadro[coluna].map((c) => {
      const autorTransferencia = dados.transferidoPor.get(c.id);
      return {
        chamado: c,
        coluna,
        solicitante: perfil.get(c.solicitanteId),
        responsavel: c.responsavelId ? perfil.get(c.responsavelId) : undefined,
        assunto: categoria.get(c.categoriaId)?.nomeCurto ?? "—",
        naoLidas: dados.naoLidas[c.id] ?? 0,
        transferidoPor: autorTransferencia ? perfil.get(autorTransferencia) : undefined,
      };
    });

  async function assumir(chamadoId: number) {
    await executar(chamadoId, "assumir");
  }

  async function pegarProximo() {
    if (!dados?.proximo) return;
    setPegando(true);
    const assumido = await executar(dados.proximo.id, "assumir");
    setPegando(false);
    if (assumido) router.push(`/atendimento/${assumido.id}`);
  }

  function soltar(chamadoId: number, de: IdColuna, para: IdColuna) {
    const acao = acaoDoArraste(de, para);
    if (!acao) {
      const titulo = (id: IdColuna) => COLUNAS.find((c) => c.id === id)?.titulo ?? id;
      mostrar(mensagemErro("TRANSICAO_INVALIDA", { de: titulo(de), para: titulo(para) }), "erro");
      return;
    }
    void executar(chamadoId, acao);
  }

  const totalPorColuna = (id: IdColuna) => quadro[id].length;

  return (
    <div className="flex flex-col gap-5">
      <ProximoDaFila
        chamado={dados.proximo}
        solicitante={dados.proximo ? perfil.get(dados.proximo.solicitanteId) : undefined}
        agora={agora}
        pegando={pegando}
        aoPegar={pegarProximo}
      />

      {/* Computador: filtros sempre visíveis. Celular: atrás do botão "Filtros". */}
      <div className="hidden flex-wrap items-center justify-between gap-3 lg:flex">
        <FiltrosQuadro filtros={filtros} categorias={dados.categorias} />
        <Legenda />
      </div>

      <div className="flex flex-col gap-3 lg:hidden">
        <div
          role="tablist"
          aria-label="Colunas do quadro"
          className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1"
        >
          {COLUNAS.map((c) => (
            <button
              key={c.id}
              type="button"
              role="tab"
              aria-selected={colunaCelular === c.id}
              onClick={() => setColunaCelular(c.id)}
              className={`min-h-11 shrink-0 rounded-full border px-4 font-semibold whitespace-nowrap ${
                colunaCelular === c.id
                  ? "border-barra bg-barra text-sobre-barra"
                  : "border-borda bg-superficie text-texto"
              }`}
            >
              {c.titulo} {totalPorColuna(c.id)}
            </button>
          ))}
        </div>
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm text-texto-suave">Toque nos botões para trocar de coluna</p>
          <button
            type="button"
            aria-expanded={filtrosAbertos}
            onClick={() => setFiltrosAbertos((v) => !v)}
            className="inline-flex min-h-11 items-center gap-1.5 font-semibold text-primaria"
          >
            <ListFilter aria-hidden="true" className="size-5" /> Filtros
          </button>
        </div>
        {filtrosAbertos ? (
          <div className="flex flex-col gap-3 rounded-2xl border border-borda bg-superficie p-4">
            <FiltrosQuadro filtros={filtros} categorias={dados.categorias} />
            <Legenda />
          </div>
        ) : null}
      </div>

      {filtros.busca ? (
        <p className="text-sm text-texto-suave">
          Mostrando só os chamados com “<strong className="text-texto">{filtros.busca}</strong>” no
          título ·{" "}
          <Link
            href="/atendimento"
            className="inline-flex min-h-11 items-center font-semibold text-primaria underline"
          >
            limpar busca
          </Link>
        </p>
      ) : null}

      <div className="grid items-start gap-5 lg:grid-cols-3">
        {COLUNAS.map((c) => (
          <ColunaQuadro
            key={c.id}
            id={c.id}
            titulo={c.titulo}
            apoio={c.apoio}
            cartoes={cartoes(c.id)}
            euId={usuario.id}
            agora={agora}
            destacados={destacados}
            aoAssumir={assumir}
            aoSoltar={soltar}
            className={colunaCelular === c.id ? "" : "hidden lg:flex"}
          />
        ))}
      </div>

      <p className="text-center">
        <Link
          href="/atendimento/encerrados"
          className="inline-flex min-h-11 items-center text-sm font-semibold text-primaria underline underline-offset-2"
        >
          Ver encerrados
        </Link>
      </p>
    </div>
  );
}
