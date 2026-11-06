"use client";

import { Plus } from "lucide-react";
import { useState } from "react";
import { Botao } from "@/components/ui/Botao";
import { useDados } from "@/lib/dados/provedor";
import type { DadosConfiguracoes, EscopoFeriado } from "@/lib/dados/tipos";
import { ROTULO_ESCOPO_FERIADO } from "@/lib/dominio/configuracoes";
import { Quadro, SeloDesativado, useGravar } from "./comum";

const ESCOPOS = Object.keys(ROTULO_ESCOPO_FERIADO) as EscopoFeriado[];
const DIAS = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];

/** "2026-12-25" → "25/12 (sex)". */
function rotuloData(data: string): string {
  const [ano, mes, dia] = data.split("-").map(Number);
  const semana = new Date(Date.UTC(ano!, mes! - 1, dia!)).getUTCDay();
  return `${String(dia).padStart(2, "0")}/${String(mes).padStart(2, "0")} (${DIAS[semana]})`;
}

const anoDe = (data: string) => Number(data.slice(0, 4));

/** Aba "Feriados e expediente": o que conta como hora útil (prazos e automações). */
export function AbaFeriados({ dados }: { dados: DadosConfiguracoes }) {
  return (
    <div className="flex flex-col gap-4">
      <Expediente key={`${dados.expediente.inicio}-${dados.expediente.fim}`} dados={dados} />
      <Feriados dados={dados} />
    </div>
  );
}

function Expediente({ dados }: { dados: DadosConfiguracoes }) {
  const fonte = useDados();
  const { gravar, salvando, errosCampos } = useGravar();
  const [inicio, setInicio] = useState(dados.expediente.inicio);
  const [fim, setFim] = useState(dados.expediente.fim);
  const mudou = inicio !== dados.expediente.inicio || fim !== dados.expediente.fim;

  return (
    <Quadro titulo="Expediente (segunda a sexta)">
      <p className="text-sm text-texto-suave">
        Vale na hora para os prazos, o Dashboard e as automações (2 h, 24 h e 48 h úteis sem
        resposta). Fora desse horário, nos fins de semana e nos feriados, o relógio não anda.
      </p>
      <form
        className="flex flex-wrap items-end gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          void gravar(() => fonte.salvarExpediente(inicio, fim), "Expediente salvo.");
        }}
      >
        <label className="flex flex-col gap-1.5">
          <span className="font-semibold">Começa às</span>
          <input
            type="time"
            required
            value={inicio}
            onChange={(e) => setInicio(e.target.value)}
            aria-invalid={errosCampos.inicio ? true : undefined}
            className="min-h-12 rounded-xl border border-borda bg-superficie px-3"
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="font-semibold">Termina às</span>
          <input
            type="time"
            required
            value={fim}
            onChange={(e) => setFim(e.target.value)}
            aria-invalid={errosCampos.fim ? true : undefined}
            className={`min-h-12 rounded-xl border bg-superficie px-3 ${errosCampos.fim ? "border-perigo" : "border-borda"}`}
          />
        </label>
        <Botao type="submit" disabled={!mudou} carregando={salvando}>
          Salvar expediente
        </Botao>
      </form>
      {errosCampos.fim || errosCampos.inicio ? (
        <p role="alert" className="text-sm font-medium text-perigo">
          {errosCampos.fim ?? errosCampos.inicio}
        </p>
      ) : null}
    </Quadro>
  );
}

function Feriados({ dados }: { dados: DadosConfiguracoes }) {
  const fonte = useDados();
  const { gravar, salvando } = useGravar();
  const anoAtual = new Date().getFullYear();
  const anos = [
    ...new Set([...dados.feriados.map((f) => anoDe(f.data)), anoAtual, anoAtual + 1]),
  ].sort();
  const [ano, setAno] = useState(anoAtual);
  const [nova, setNova] = useState({ data: "", nome: "", escopo: "nacional" as EscopoFeriado });
  const doAno = dados.feriados.filter((f) => anoDe(f.data) === ano);

  async function adicionar() {
    const ok = await gravar(() => fonte.criarFeriado(nova), "Feriado cadastrado.");
    if (ok) {
      setAno(anoDe(nova.data));
      setNova({ data: "", nome: "", escopo: "nacional" });
    }
  }

  return (
    <Quadro
      titulo={`Feriados de ${ano} · ${doAno.filter((f) => f.ativo).length} ativos`}
      acao={
        <label className="flex items-center gap-2 text-sm">
          <span className="text-texto-suave">Ano</span>
          <select
            value={ano}
            onChange={(e) => setAno(Number(e.target.value))}
            className="min-h-10 rounded-lg border border-borda bg-superficie px-2"
          >
            {anos.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </label>
      }
    >
      {doAno.length === 0 ? (
        <p className="rounded-xl bg-alerta-suave p-3 text-sm">
          Nenhum feriado cadastrado em {ano}. Sem eles, a Central conta esses dias como dias úteis.
        </p>
      ) : (
        <ul className="flex flex-col divide-y divide-borda">
          {doAno.map((f) => (
            <li key={f.data} className="flex flex-wrap items-center gap-3 py-2">
              <span className="w-24 shrink-0 font-mono text-sm">{rotuloData(f.data)}</span>
              <span className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
                <span className={f.ativo ? "" : "text-texto-suave line-through"}>{f.nome}</span>
                <span className="text-xs text-texto-suave">{ROTULO_ESCOPO_FERIADO[f.escopo]}</span>
                {f.ativo ? null : <SeloDesativado />}
              </span>
              <Botao
                variante={f.ativo ? "perigo" : "fantasma"}
                disabled={salvando}
                onClick={() =>
                  void gravar(
                    () => fonte.editarFeriado(f.data, { ativo: !f.ativo }),
                    f.ativo
                      ? "Feriado desativado: o dia passa a contar como útil."
                      : "Feriado reativado.",
                  )
                }
              >
                {f.ativo ? "Desativar" : "Reativar"}
              </Botao>
            </li>
          ))}
        </ul>
      )}

      <form
        className="flex flex-wrap items-end gap-2 border-t border-borda pt-3"
        onSubmit={(e) => {
          e.preventDefault();
          void adicionar();
        }}
      >
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-semibold">Data</span>
          <input
            type="date"
            required
            value={nova.data}
            onChange={(e) => setNova((n) => ({ ...n, data: e.target.value }))}
            className="min-h-11 rounded-xl border border-borda bg-superficie px-3"
          />
        </label>
        <label className="flex min-w-48 flex-1 flex-col gap-1.5">
          <span className="text-sm font-semibold">Nome</span>
          <input
            required
            maxLength={80}
            value={nova.nome}
            onChange={(e) => setNova((n) => ({ ...n, nome: e.target.value }))}
            placeholder="Ex.: Natal"
            className="min-h-11 rounded-xl border border-borda bg-superficie px-3"
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-semibold">Tipo</span>
          <select
            value={nova.escopo}
            onChange={(e) => setNova((n) => ({ ...n, escopo: e.target.value as EscopoFeriado }))}
            className="min-h-11 rounded-xl border border-borda bg-superficie px-2"
          >
            {ESCOPOS.map((e) => (
              <option key={e} value={e}>
                {ROTULO_ESCOPO_FERIADO[e]}
              </option>
            ))}
          </select>
        </label>
        <Botao
          type="submit"
          variante="contorno"
          carregando={salvando}
          disabled={!nova.data || !nova.nome.trim()}
        >
          <Plus aria-hidden="true" className="size-4" /> Adicionar feriado
        </Botao>
      </form>
    </Quadro>
  );
}
