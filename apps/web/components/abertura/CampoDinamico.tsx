"use client";

import { CHAVE_SISTEMA, corDoSistema } from "@/lib/sistemas";
import { AreaTexto } from "@/components/ui/AreaTexto";
import { Campo } from "@/components/ui/Campo";
import { OpcaoCartao } from "@/components/ui/OpcaoCartao";
import type { CampoForm } from "@/lib/dominio/tipos";

/** id do elemento focável de cada campo (para levar o foco ao primeiro erro). */
export function idDoCampo(chave: string): string {
  return `campo-${chave}`;
}

/** Monta o campo do formulário dinâmico conforme campos_form.tipo (mockup, tela 2). */
export function CampoDinamico({
  campo,
  valor,
  erro,
  aoMudar,
}: {
  campo: CampoForm;
  valor: unknown;
  erro?: string;
  aoMudar: (valor: unknown) => void;
}) {
  const id = idDoCampo(campo.chave);
  const texto = typeof valor === "string" ? valor : valor == null ? "" : String(valor);
  const comum = {
    id,
    rotulo: campo.label,
    required: campo.obrigatorio,
    ajuda: campo.ajuda ?? undefined,
    erro,
  };

  switch (campo.tipo) {
    case "texto":
      return <Campo {...comum} value={texto} onChange={(e) => aoMudar(e.target.value)} />;
    case "texto_longo":
      return <AreaTexto {...comum} value={texto} onChange={(e) => aoMudar(e.target.value)} />;
    case "numero":
      return (
        <Campo
          {...comum}
          inputMode="decimal"
          value={texto}
          onChange={(e) => aoMudar(e.target.value)}
        />
      );
    case "data":
      return (
        <Campo {...comum} type="date" value={texto} onChange={(e) => aoMudar(e.target.value)} />
      );
    case "selecao":
    case "multipla_selecao":
    case "sim_nao": {
      const multipla = campo.tipo === "multipla_selecao";
      const opcoes =
        campo.tipo === "sim_nao"
          ? [
              { valor: "sim", rotulo: "Sim" },
              { valor: "nao", rotulo: "Não" },
            ]
          : campo.opcoes.map((o) => ({ valor: o, rotulo: o }));
      const marcados = multipla ? (Array.isArray(valor) ? valor.map(String) : []) : [texto];
      const idErro = `${id}-erro`;
      return (
        <fieldset
          className="flex flex-col gap-2"
          aria-invalid={erro ? true : undefined}
          aria-describedby={erro ? idErro : undefined}
        >
          <legend className="mb-1.5 font-semibold">
            {campo.label}
            {campo.obrigatorio ? <span className="text-perigo"> *</span> : null}
          </legend>
          {campo.ajuda ? <p className="-mt-1 text-sm text-texto-suave">{campo.ajuda}</p> : null}
          {opcoes.map((o, i) => (
            <OpcaoCartao
              key={o.valor}
              id={i === 0 ? id : undefined}
              nome={campo.chave}
              valor={o.valor}
              rotulo={o.rotulo}
              multipla={multipla}
              marcador={campo.chave === CHAVE_SISTEMA ? corDoSistema(o.valor)?.fundo : undefined}
              selecionado={marcados.includes(o.valor)}
              aoSelecionar={(v) =>
                aoMudar(
                  multipla
                    ? marcados.includes(v)
                      ? marcados.filter((m) => m !== v)
                      : [...marcados, v]
                    : v,
                )
              }
            />
          ))}
          {erro ? (
            <p id={idErro} role="alert" className="text-sm font-medium text-perigo">
              {erro}
            </p>
          ) : null}
        </fieldset>
      );
    }
  }
}
