"use client";

import { DndContext, DragOverlay, useSensor, useSensors } from "@dnd-kit/core";
import { ListFilter } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { useToast } from "@/components/ui/Toast";
import { useConsulta, useUsuario } from "@/lib/dados/provedor";
import type { FonteDeDados } from "@/lib/dados/tipos";
import { mensagemErro } from "@/lib/erros/catalogo";
import {
  AVISOS,
  colisao,
  INSTRUCOES,
  OPCOES_MOUSE,
  OPCOES_TOQUE,
  pularColuna,
  SensorMouse,
  SensorTeclado,
  SensorToque,
  type DadosArraste,
} from "./arraste";
import { CartaoChamado, type DadosCartao } from "./CartaoChamado";
import { ColunaQuadro } from "./ColunaQuadro";
import { FiltrosQuadro, Legenda } from "./FiltrosQuadro";
import { ProximoDaFila } from "./ProximoDaFila";
import {
  acaoDoArraste,
  COLUNAS,
  filtrarChamados,
  montarQuadro,
  ordenarNovos,
  ordenarTransferidos,
  type ColunaQuadro as IdColuna,
  type FiltrosQuadro as Filtros,
} from "./quadro";
import { ModalAcao, type AcaoComModal } from "./atendimento/ModalAcao";
import { useAcaoChamado } from "./useAcaoChamado";

const SEGUNDOS_DESTAQUE = 6;

/**
 * Rolagem automática ao levar o cartão até a borda (celular: as colunas não cabem na tela).
 * Só nos 10% da borda e devagar, para dar tempo de escolher a coluna antes de soltar.
 */
const ROLAGEM_AUTOMATICA = { threshold: { x: 0.1, y: 0.12 }, acceleration: 4 };

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
  // Arrastar para Concluídos, Cancelados, Transferidos ou de volta a Novos abre a janela da ação
  // (confirmação, motivo, técnico de destino) — a mesma da tela de atendimento.
  const [comJanela, setComJanela] = useState<{ id: number; acao: AcaoComModal } | null>(null);
  const conhecidos = useRef<Set<number> | null>(null);
  // Arrastar: mouse (depois de mexer 6 px), dedo (segurar ~0,25 s) e teclado (espaço + setas) — ADR 0010.
  const sensores = useSensors(
    useSensor(SensorMouse, OPCOES_MOUSE),
    useSensor(SensorToque, OPCOES_TOQUE),
    useSensor(SensorTeclado, { coordinateGetter: pularColuna }),
  );
  const [arrastado, setArrastado] = useState<number | null>(null);

  const consultar = useCallback(async (f: FonteDeDados) => {
    // Uma consulta para os cartões (view chamados_quadro: já traz "quem transferiu" e "não lidas").
    const [chamados, categorias, perfis, proximo] = await Promise.all([
      f.listarQuadro(),
      f.listarCategorias(),
      f.listarPerfisPublicos(),
      f.proximoDaFila(),
    ]);
    return {
      chamados,
      categorias,
      perfis,
      proximo,
      extras: new Map(chamados.map((c) => [c.id, c])),
    };
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
  const quadro = montarQuadro(filtrarChamados(dados.chamados, filtros, usuario.id, agora), agora);
  quadro.novos = ordenarNovos(quadro.novos, agora);
  quadro.transferidos = ordenarTransferidos(quadro.transferidos, usuario.id);
  const cartoes = (coluna: IdColuna): DadosCartao[] =>
    quadro[coluna].map((c) => {
      const autorTransferencia = dados.extras.get(c.id)?.transferidoPorId;
      return {
        chamado: c,
        coluna,
        solicitante: perfil.get(c.solicitanteId),
        responsavel: c.responsavelId ? perfil.get(c.responsavelId) : undefined,
        assunto: categoria.get(c.categoriaId)?.nomeCurto ?? "—",
        naoLidas: dados.extras.get(c.id)?.naoLidas ?? 0,
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
    const comModal: readonly string[] = ["concluir", "cancelar", "transferir", "devolver_fila"];
    if (comModal.includes(acao)) setComJanela({ id: chamadoId, acao: acao as AcaoComModal });
    else void executar(chamadoId, acao);
  }

  const totalPorColuna = (id: IdColuna) => quadro[id].length;
  const cartaoArrastado = arrastado
    ? COLUNAS.flatMap((c) => cartoes(c.id)).find((d) => d.chamado.id === arrastado)
    : undefined;

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

      {/* Celular: filtros atrás do botão "Filtros". */}
      <div className="flex flex-col gap-3 lg:hidden">
        <div className="flex items-center justify-end">
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

      {/* Até ~1280 px nem todas as colunas cabem: atalhos para pular até cada uma. */}
      <div className="flex flex-col gap-2 xl:hidden">
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
              onClick={() => {
                setColunaCelular(c.id);
                document
                  .getElementById(`coluna-${c.id}`)
                  ?.scrollIntoView({ behavior: "smooth", inline: "start", block: "nearest" });
              }}
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
        <p className="text-sm text-texto-suave">Deslize para o lado para ver as outras colunas</p>
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

      {/* Sempre kanban: colunas lado a lado. Abaixo de ~1280 px, desliza-se para o lado entre elas. */}
      <DndContext
        sensors={sensores}
        collisionDetection={colisao}
        accessibility={{ announcements: AVISOS, screenReaderInstructions: INSTRUCOES }}
        autoScroll={ROLAGEM_AUTOMATICA}
        onDragStart={({ active }) =>
          setArrastado((active.data.current as DadosArraste | undefined)?.chamadoId ?? null)
        }
        onDragCancel={() => setArrastado(null)}
        onDragEnd={({ active, over }) => {
          setArrastado(null);
          const origem = active.data.current as DadosArraste | undefined;
          if (origem && over && over.id !== origem.coluna) {
            soltar(origem.chamadoId, origem.coluna, over.id as IdColuna);
          }
        }}
      >
        {/* Três colunas de trabalho largas; Concluídos e Cancelados estreitas (pedido do dono, 2026-10-07). */}
        <div
          className={`-mx-4 flex ${arrastado ? "" : "snap-x snap-mandatory"} items-start gap-3 overflow-x-auto px-4 pb-3 xl:mx-0 xl:grid xl:snap-none xl:grid-cols-[repeat(4,minmax(13rem,1fr))_repeat(2,minmax(10.5rem,0.7fr))] xl:px-0`}
        >
          {COLUNAS.map((c) => (
            <ColunaQuadro
              key={c.id}
              id={c.id}
              titulo={c.titulo}
              apoio={c.apoio}
              encerrada={c.encerrada}
              cartoes={cartoes(c.id)}
              euId={usuario.id}
              agora={agora}
              destacados={destacados}
              aoAssumir={assumir}
              className={`shrink-0 snap-start xl:w-auto xl:max-w-none ${
                c.encerrada ? "w-[70vw] max-w-[16rem]" : "w-[85vw] max-w-[21rem]"
              }`}
            />
          ))}
        </div>

        {/* "Fantasma" que acompanha o dedo/mouse. */}
        <DragOverlay dropAnimation={null}>
          {cartaoArrastado ? (
            <div className="w-[min(85vw,20rem)]">
              <CartaoChamado
                dados={cartaoArrastado}
                euId={usuario.id}
                agora={agora}
                destacado={false}
                aoAssumir={() => undefined}
                fantasma
              />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      <ModalAcao
        acao={comJanela?.acao ?? null}
        chamadoId={comJanela?.id ?? 0}
        responsavelId={dados.chamados.find((c) => c.id === comJanela?.id)?.responsavelId ?? null}
        tecnicos={dados.perfis.filter((p) => p.papel === "ti")}
        aoFechar={() => setComJanela(null)}
      />

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
