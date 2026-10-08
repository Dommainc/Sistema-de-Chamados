"use client";

import { useRouter } from "next/navigation";
import { useCallback, useMemo, useState } from "react";
import { Segmentado } from "@/components/ui/Segmentado";
import { useConsulta } from "@/lib/dados/provedor";
import type { FonteDeDados } from "@/lib/dados/tipos";
import { formatarDataHora } from "@/lib/formato";
import {
  calcularMetricas,
  formatarHorasUteis,
  montarPeriodo,
  type ChavePeriodo,
  type ItemRanking,
  type Metricas,
  type Periodo,
} from "@/lib/metricas";

const OPCOES_PERIODO: { valor: ChavePeriodo; rotulo: string }[] = [
  { valor: "7d", rotulo: "7 dias" },
  { valor: "30d", rotulo: "30 dias" },
  { valor: "mes", rotulo: "Este mês" },
  { valor: "mes_passado", rotulo: "Mês passado" },
  { valor: "datas", rotulo: "Escolher datas" },
];

const ddmm = (dia: string) => `${dia.slice(8, 10)}/${dia.slice(5, 7)}`;
const ddmmaaaa = (dia: string) => `${ddmm(dia)}/${dia.slice(0, 4)}`;
const porcento = (parte: number, total: number) =>
  total ? `${Math.round((parte / total) * 100)}%` : "—";

function Secao({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section aria-label={titulo} className="flex flex-col gap-3">
      <h2 className="text-lg font-bold">{titulo}</h2>
      {children}
    </section>
  );
}

function Quadro({
  titulo,
  children,
  className = "",
}: {
  titulo?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`flex flex-col gap-3 rounded-2xl border border-borda bg-superficie p-4 shadow-sm ${className}`}
    >
      {titulo ? (
        <h3 className="text-xs font-semibold tracking-wider text-texto-suave uppercase">
          {titulo}
        </h3>
      ) : null}
      {children}
    </div>
  );
}

function Numero({
  rotulo,
  valor,
  detalhe,
  destaque = "",
}: {
  rotulo: string;
  valor: string | number;
  detalhe?: string;
  /** Classe de cor do número (ex.: vencidos em vermelho). */
  destaque?: string;
}) {
  return (
    <div className="flex flex-col gap-1 rounded-2xl border border-borda bg-superficie p-4 shadow-sm">
      <p className="text-sm text-texto-suave">{rotulo}</p>
      <p className={`text-3xl font-bold ${destaque}`}>{valor}</p>
      {detalhe ? <p className="text-xs text-texto-suave">{detalhe}</p> : null}
    </div>
  );
}

/** Barras verticais: chamados abertos por dia. */
function GraficoPorDia({ dias }: { dias: Metricas["volume"]["porDia"] }) {
  const maior = Math.max(1, ...dias.map((d) => d.total));
  const total = dias.reduce((s, d) => s + d.total, 0);
  const passo = Math.max(1, Math.ceil(dias.length / 8));
  return (
    <figure className="flex flex-col gap-2">
      <div
        role="img"
        aria-label={`Chamados abertos por dia: ${total} no período, no máximo ${maior} num dia.`}
        className="flex h-40 items-end gap-[2px]"
      >
        {dias.map((d) => (
          <div
            key={d.dia}
            title={`${ddmm(d.dia)}: ${d.total} chamado(s)`}
            className="flex h-full min-w-0 flex-1 flex-col justify-end"
          >
            <div
              className={`w-full rounded-t ${d.total ? "bg-primaria" : "bg-superficie-2"}`}
              style={{ height: `${d.total ? Math.max(4, (d.total / maior) * 100) : 2}%` }}
            />
          </div>
        ))}
      </div>
      <div aria-hidden="true" className="flex gap-[2px] text-[10px] text-texto-suave">
        {dias.map((d, i) => (
          <span key={d.dia} className="min-w-0 flex-1 overflow-visible whitespace-nowrap">
            {i % passo === 0 ? ddmm(d.dia) : ""}
          </span>
        ))}
      </div>
    </figure>
  );
}

/** Ranking com barras horizontais (categoria, sistema, departamento). */
function Ranking({ itens, vazio }: { itens: ItemRanking[]; vazio: string }) {
  if (itens.length === 0) return <p className="text-sm text-texto-suave">{vazio}</p>;
  const maior = Math.max(...itens.map((i) => i.total));
  return (
    <ul className="flex flex-col gap-2">
      {itens.slice(0, 8).map((i) => (
        <li key={i.nome} className="flex flex-col gap-1 text-sm">
          <span className="flex justify-between gap-2">
            <span className="min-w-0 truncate">{i.nome}</span>
            <strong>{i.total}</strong>
          </span>
          <span className="h-2 rounded-full bg-superficie-2">
            <span
              className="block h-full rounded-full bg-primaria"
              style={{ width: `${(i.total / maior) * 100}%` }}
            />
          </span>
        </li>
      ))}
    </ul>
  );
}

function SeletorPeriodo({ periodo }: { periodo: Periodo }) {
  const router = useRouter();
  const [escolhendo, setEscolhendo] = useState(periodo.chave === "datas");
  const [de, setDe] = useState(periodo.de);
  const [ate, setAte] = useState(periodo.ate);
  const valor: ChavePeriodo = escolhendo ? "datas" : periodo.chave;
  return (
    <div className="flex flex-col gap-3">
      {/* Celular: as 5 opções rolam de lado em vez de quebrar a tela. */}
      <div className="-mx-4 overflow-x-auto px-4">
        <Segmentado
          rotuloAcessivel="Período"
          valor={valor}
          opcoes={OPCOES_PERIODO.map((o) => ({
            valor: o.valor,
            rotulo: o.rotulo,
            href: o.valor === "datas" ? undefined : `/atendimento/dashboard?periodo=${o.valor}`,
          }))}
          aoMudar={(v) => v === "datas" && setEscolhendo(true)}
        />
      </div>
      {escolhendo ? (
        <form
          className="flex flex-wrap items-end gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            router.replace(`/atendimento/dashboard?periodo=datas&de=${de}&ate=${ate}`);
          }}
        >
          <label className="flex flex-col gap-1 text-sm font-semibold">
            De
            <input
              type="date"
              value={de}
              max={ate}
              onChange={(e) => setDe(e.target.value)}
              className="min-h-11 rounded-xl border border-borda bg-superficie px-3 font-normal"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm font-semibold">
            Até
            <input
              type="date"
              value={ate}
              min={de}
              onChange={(e) => setAte(e.target.value)}
              className="min-h-11 rounded-xl border border-borda bg-superficie px-3 font-normal"
            />
          </label>
          <button
            type="submit"
            className="min-h-11 rounded-xl bg-primaria px-4 font-semibold text-sobre-primaria hover:bg-primaria-forte"
          >
            Ver período
          </button>
        </form>
      ) : null}
    </div>
  );
}

/** Dashboard da TI (ADR 0013): números do período escolhido, todos em horas úteis. */
export function PainelDashboard({ chave, de, ate }: { chave?: string; de?: string; ate?: string }) {
  const periodo = useMemo(() => montarPeriodo(chave, new Date(), de, ate), [chave, de, ate]);
  const inicio = periodo.inicio.toISOString();
  const fim = periodo.fim.toISOString();
  const consultar = useCallback(
    async (f: FonteDeDados) => {
      const [dados, perfis, categorias] = await Promise.all([
        f.listarDadosMetricas(inicio, fim),
        f.listarPerfisPublicos(),
        f.listarCategorias(),
      ]);
      const metricas = calcularMetricas({
        chamados: dados.chamados,
        historico: dados.historico,
        perfis,
        categorias,
        periodo: { inicio: new Date(inicio), fim: new Date(fim) },
        agora: new Date(),
        expediente: { ...dados.expediente, feriados: new Set(dados.expediente.feriados) },
      });
      return { metricas, expediente: dados.expediente };
    },
    [inicio, fim],
  );
  const { dados, erro, carregando } = useConsulta(consultar);
  const m = dados?.metricas;
  // "08:00" → "8h": o expediente vem da configuração (hoje 8h–20h), não fica escrito na tela.
  const hora = (hhmm: string) => `${Number(hhmm.slice(0, 2))}h`;
  const expediente = dados
    ? `${hora(dados.expediente.inicio)}–${hora(dados.expediente.fim)}`
    : null;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-texto-suave">
          De {ddmmaaaa(periodo.de)} a {ddmmaaaa(periodo.ate)} · tempos em horas úteis
          {expediente ? ` (seg–sex, ${expediente})` : ""}
        </p>
      </div>
      <SeletorPeriodo key={`${periodo.chave}-${periodo.de}-${periodo.ate}`} periodo={periodo} />

      {carregando ? <p className="text-texto-suave">Carregando números...</p> : null}
      {erro ? <p className="text-perigo">{erro.message}</p> : null}
      {m ? <Conteudo m={m} /> : null}
    </div>
  );
}

function Conteudo({ m }: { m: Metricas }) {
  const { resumo, volume, equipe, prazoEspera } = m;
  return (
    <>
      <Secao titulo="Resumo">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-7">
          <Numero rotulo="Abertos agora" valor={resumo.abertosAgora} />
          <Numero
            rotulo="Vencidos agora"
            valor={resumo.vencidosAgora}
            destaque={resumo.vencidosAgora ? "text-perigo" : ""}
          />
          <Numero rotulo="Abertos no período" valor={resumo.abertosNoPeriodo} />
          <Numero rotulo="Concluídos no período" valor={resumo.concluidosNoPeriodo} />
          <Numero
            rotulo="Tempo médio até iniciar"
            valor={formatarHorasUteis(resumo.tempoMedioIniciar)}
          />
          <Numero
            rotulo="Tempo médio até concluir"
            valor={formatarHorasUteis(resumo.tempoMedioConcluir)}
          />
          <Numero
            rotulo="Concluídos no prazo"
            valor={porcento(resumo.noPrazo.dentro, resumo.noPrazo.comPrazo)}
            detalhe={`${resumo.noPrazo.dentro} de ${resumo.noPrazo.comPrazo} com prazo`}
          />
        </div>
      </Secao>

      <Secao titulo="Volume">
        <Quadro titulo="Chamados abertos por dia">
          <GraficoPorDia dias={volume.porDia} />
        </Quadro>
        <div className="grid gap-3 md:grid-cols-3">
          <Quadro titulo="Por categoria">
            <Ranking itens={volume.porCategoria} vazio="Nenhum chamado aberto no período." />
          </Quadro>
          <Quadro titulo="Por sistema">
            <Ranking itens={volume.porSistema} vazio="Nenhum pedido de acesso a sistema." />
          </Quadro>
          <Quadro titulo="Por departamento">
            <Ranking itens={volume.porDepartamento} vazio="Nenhum chamado aberto no período." />
          </Quadro>
        </div>
      </Secao>

      <Secao titulo="Equipe">
        <Quadro className="overflow-x-auto p-0">
          <table className="w-full min-w-[40rem] text-sm">
            <thead className="text-left text-xs tracking-wider text-texto-suave uppercase">
              <tr className="border-b border-borda">
                <th className="px-4 py-3 font-semibold">Técnico</th>
                <th className="px-4 py-3 text-right font-semibold">Concluídos</th>
                <th className="px-4 py-3 text-right font-semibold">Em atendimento agora</th>
                <th className="px-4 py-3 text-right font-semibold">Tempo médio até concluir</th>
                <th className="px-4 py-3 text-right font-semibold">Transferiu</th>
                <th className="px-4 py-3 text-right font-semibold">Recebeu</th>
              </tr>
            </thead>
            <tbody>
              {equipe.map((t) => (
                <tr key={t.id} className="border-b border-borda last:border-0">
                  <td className="px-4 py-3 font-semibold">{t.nome}</td>
                  <td className="px-4 py-3 text-right">{t.concluidos}</td>
                  <td className="px-4 py-3 text-right">{t.emAtendimento}</td>
                  <td className="px-4 py-3 text-right">
                    {formatarHorasUteis(t.tempoMedioConcluir)}
                  </td>
                  <td className="px-4 py-3 text-right">{t.transferenciasFeitas}</td>
                  <td className="px-4 py-3 text-right">{t.transferenciasRecebidas}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Quadro>
      </Secao>

      <Secao titulo="Prazo e espera">
        <div className="grid gap-3 md:grid-cols-2">
          <Quadro titulo="Concluídos no prazo, por categoria">
            {prazoEspera.porCategoria.length === 0 ? (
              <p className="text-sm text-texto-suave">Nenhum concluído com prazo no período.</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {prazoEspera.porCategoria.map((p) => (
                  <li key={p.nome} className="flex flex-col gap-1 text-sm">
                    <span className="flex justify-between gap-2">
                      <span className="min-w-0 truncate">{p.nome}</span>
                      <span>
                        <strong>{porcento(p.noPrazo, p.comPrazo)}</strong>{" "}
                        <span className="text-texto-suave">
                          ({p.noPrazo} de {p.comPrazo})
                        </span>
                      </span>
                    </span>
                    <span className="flex h-2 overflow-hidden rounded-full bg-perigo-suave">
                      <span
                        className="block h-full bg-sucesso"
                        style={{ width: `${(p.noPrazo / p.comPrazo) * 100}%` }}
                      />
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Quadro>
          <div className="grid grid-cols-2 gap-3">
            <Numero
              rotulo="Concluídos sem prazo"
              valor={prazoEspera.concluidosSemPrazo}
              detalhe="A TI não definiu prazo"
            />
            <Numero
              rotulo="Em atendimento sem prazo"
              valor={prazoEspera.abertosSemPrazo}
              destaque={prazoEspera.abertosSemPrazo ? "text-alerta" : ""}
              detalhe="Iniciados, ainda sem prazo"
            />
            <Numero
              rotulo="Tempo médio aguardando o usuário"
              valor={formatarHorasUteis(prazoEspera.tempoMedioAguardando)}
              detalhe={`${prazoEspera.chamadosQueAguardaram} chamado(s) aguardaram`}
            />
          </div>
        </div>
        <Quadro titulo="Últimos cancelamentos">
          {prazoEspera.ultimosCancelamentos.length === 0 ? (
            <p className="text-sm text-texto-suave">Nenhum chamado cancelado no período.</p>
          ) : (
            <ul className="flex flex-col divide-y divide-borda">
              {prazoEspera.ultimosCancelamentos.map((c) => (
                <li key={c.id} className="flex flex-col gap-0.5 py-2 text-sm first:pt-0 last:pb-0">
                  <span>
                    <strong>#{c.id}</strong> {c.titulo}
                  </span>
                  <span className="text-texto-suave">
                    “{c.motivo ?? "sem motivo"}” · {formatarDataHora(c.canceladoEm)}
                    {c.porNome ? ` · ${c.porNome}` : ""}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Quadro>
      </Secao>
    </>
  );
}
