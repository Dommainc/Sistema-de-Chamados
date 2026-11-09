"use client";

import { useRouter } from "next/navigation";
import { useMemo } from "react";
import { Segmentado } from "@/components/ui/Segmentado";
import { useConsulta } from "@/lib/dados/provedor";
import type { AlteracaoConfig, AreaConfig, FonteDeDados } from "@/lib/dados/tipos";
import { formatarDataHora } from "@/lib/formato";
import { AbaAssuntos } from "./AbaAssuntos";
import { AbaFeriados } from "./AbaFeriados";
import { AbaFormularios } from "./AbaFormularios";
import { AbaRespostas } from "./AbaRespostas";
import { ABAS_CONFIG, type AbaConfig } from "./abas";
import { Quadro } from "./comum";

const ROTULO_ABA: Record<AbaConfig, string> = {
  formularios: "Formulários",
  assuntos: "Assuntos",
  respostas: "Respostas prontas",
  feriados: "Feriados e expediente",
};

const ROTULO_AREA: Record<AreaConfig, string> = {
  formularios: "Formulários",
  assuntos: "Assuntos",
  respostas_prontas: "Respostas prontas",
  feriados: "Feriados",
  expediente: "Expediente",
};

const consultarConfiguracoes = (fonte: FonteDeDados) => fonte.obterConfiguracoes();
const consultarPerfis = (fonte: FonteDeDados) => fonte.listarPerfisPublicos();

/** Painel da TI (configurações) (Fase 2 — ADR 0022). A aba fica na URL (?aba=). */
export function TelaConfiguracoes({ aba }: { aba: AbaConfig }) {
  const router = useRouter();
  const { dados, erro, carregando } = useConsulta(consultarConfiguracoes);
  const trocar = (a: AbaConfig) =>
    router.replace(a === "formularios" ? "/atendimento/painel" : `?aba=${a}`, {
      scroll: false,
    });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold">Painel</h1>
        <p className="text-texto-suave">
          O que aparece para quem abre chamado e como a Central conta o tempo. Toda mudança fica
          registrada com o nome de quem fez.
        </p>
      </div>
      {/* Celular: as 4 abas não cabem lado a lado, então vira uma lista de escolha. */}
      <label className="flex flex-col gap-1.5 md:hidden">
        <span className="font-semibold">Parte</span>
        <select
          value={aba}
          onChange={(e) => trocar(e.target.value as AbaConfig)}
          className="min-h-12 w-full rounded-xl border border-borda bg-superficie px-3"
        >
          {ABAS_CONFIG.map((a) => (
            <option key={a} value={a}>
              {ROTULO_ABA[a]}
            </option>
          ))}
        </select>
      </label>
      <div className="hidden md:block">
        <Segmentado
          rotuloAcessivel="Partes do painel"
          opcoes={ABAS_CONFIG.map((a) => ({ valor: a, rotulo: ROTULO_ABA[a] }))}
          valor={aba}
          aoMudar={trocar}
        />
      </div>

      {carregando ? <p className="text-texto-suave">Carregando...</p> : null}
      {erro ? <p className="text-perigo">{erro.message}</p> : null}
      {dados ? (
        <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
          <div role="tabpanel" aria-label={ROTULO_ABA[aba]}>
            {aba === "formularios" ? <AbaFormularios dados={dados} /> : null}
            {aba === "assuntos" ? <AbaAssuntos dados={dados} /> : null}
            {aba === "respostas" ? <AbaRespostas dados={dados} /> : null}
            {aba === "feriados" ? <AbaFeriados dados={dados} /> : null}
          </div>
          <UltimasAlteracoes alteracoes={dados.alteracoes} />
        </div>
      ) : null}
    </div>
  );
}

function UltimasAlteracoes({ alteracoes }: { alteracoes: AlteracaoConfig[] }) {
  const { dados: perfis } = useConsulta(consultarPerfis);
  const nomes = useMemo(() => new Map((perfis ?? []).map((p) => [p.id, p.nome])), [perfis]);

  return (
    <Quadro titulo="Últimas alterações" className="lg:sticky lg:top-6">
      {alteracoes.length === 0 ? (
        <p className="text-sm text-texto-suave">Nenhuma alteração feita pela tela ainda.</p>
      ) : (
        <ol className="flex max-h-[32rem] flex-col gap-3 overflow-y-auto pr-1" tabIndex={0}>
          {alteracoes.map((a) => (
            <li
              key={a.id}
              className="flex flex-col gap-0.5 border-b border-borda pb-2 text-sm last:border-0"
            >
              <span className="break-words">{a.resumo}</span>
              <span className="text-xs text-texto-suave">
                {ROTULO_AREA[a.area]} · {nomes.get(a.autorId) ?? "TI"} ·{" "}
                {formatarDataHora(a.criadoEm)}
              </span>
            </li>
          ))}
        </ol>
      )}
    </Quadro>
  );
}
