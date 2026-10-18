"use client";

import { Search } from "lucide-react";
import { Fragment, useState } from "react";
import { AreaTexto } from "@/components/ui/AreaTexto";
import { Campo } from "@/components/ui/Campo";
import { OpcaoCartao } from "@/components/ui/OpcaoCartao";
import type { CampoForm } from "@/lib/dominio/tipos";

/** A partir de quantas opções a lista vira grade de botões compactos (2 colunas no celular, 3 no computador). */
const OPCOES_PARA_GRADE = 7;
/** A partir de quantas opções aparece o campo "Buscar" (ex.: os 25 sistemas). */
const OPCOES_PARA_BUSCA = 13;

/** id do elemento focável de cada campo (para levar o foco ao primeiro erro). */
export function idDoCampo(chave: string): string {
  return `campo-${chave}`;
}

/** Sem acento e em minúsculas: "Gestão" acha com "gestao". */
function normalizar(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();
}

/** Monta o campo do formulário dinâmico conforme campos_form.tipo (mockup, tela 2). */
export function CampoDinamico({
  campo,
  valor,
  erro,
  aoMudar,
  ramos,
}: {
  campo: CampoForm;
  valor: unknown;
  erro?: string;
  aoMudar: (valor: unknown) => void;
  /** Ramificação: pergunta que abre logo abaixo de uma opção escolhida (ex.: módulo do Sienge). */
  ramos?: (opcao: string) => React.ReactNode;
}) {
  const [busca, setBusca] = useState("");
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
      // Lista grande (ex.: 25 sistemas): grade compacta e, se for muito grande, busca. A opção escolhida
      // continua aparecendo mesmo fora da busca.
      const grade = opcoes.length >= OPCOES_PARA_GRADE;
      const comBusca = opcoes.length >= OPCOES_PARA_BUSCA;
      const termo = normalizar(busca.trim());
      const visiveis = termo
        ? opcoes.filter((o) => marcados.includes(o.valor) || normalizar(o.rotulo).includes(termo))
        : opcoes;
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
          {comBusca ? (
            <div className="relative">
              <Search
                aria-hidden="true"
                className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-texto-suave"
              />
              <input
                type="search"
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                // Enter na busca não envia o formulário.
                onKeyDown={(e) => {
                  if (e.key === "Enter") e.preventDefault();
                }}
                aria-label={`Buscar em "${campo.label}"`}
                placeholder="Digite para buscar…"
                className="min-h-11 w-full rounded-xl border border-borda bg-superficie pr-3 pl-9"
              />
            </div>
          ) : null}
          <div
            className={
              grade
                ? "grid grid-flow-dense grid-cols-2 gap-2 sm:grid-cols-3"
                : "flex flex-col gap-2"
            }
          >
            {visiveis.map((o, i) => {
              const ramo = marcados.includes(o.valor) ? ramos?.(o.valor) : null;
              return (
                <Fragment key={o.valor}>
                  <OpcaoCartao
                    id={i === 0 ? id : undefined}
                    nome={campo.chave}
                    valor={o.valor}
                    rotulo={o.rotulo}
                    multipla={multipla}
                    compacto={grade}
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
                  {ramo ? (
                    // Na grade, o galho ocupa a linha inteira logo abaixo da opção escolhida.
                    <div className="col-span-full mb-2 ml-4 flex flex-col gap-4 border-l-2 border-primaria py-1 pl-4">
                      {ramo}
                    </div>
                  ) : null}
                </Fragment>
              );
            })}
          </div>
          {visiveis.length === 0 ? (
            <p className="text-sm text-texto-suave">
              Nada encontrado com “{busca.trim()}”. Confira o nome ou escolha “Não se aplica”.
            </p>
          ) : null}
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
