"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { OpcaoSistema, PerfilPublico } from "@/lib/dados/tipos";
import type { Categoria } from "@/lib/dominio/tipos";
import { classesDaCor } from "@/lib/sistemas";
import { COR_PRAZO, COR_STATUS } from "./cores";
import { COLUNAS, type FiltroPrazo, type FiltrosQuadro as Filtros } from "./quadro";

const PRAZOS: { valor: FiltroPrazo; rotulo: string }[] = [
  { valor: "todos", rotulo: "Qualquer prazo" },
  { valor: "vencido", rotulo: "Vencido" },
  { valor: "vence_em_breve", rotulo: "Vence em menos de 1h" },
  { valor: "no_prazo", rotulo: "No prazo" },
  { valor: "sem_prazo", rotulo: "Sem prazo" },
];

/** Monta a URL trocando um parâmetro (filtros ficam na URL para poder compartilhar o link). */
export function comParametro(
  atuais: URLSearchParams,
  chave: string,
  valor: string | null,
  caminho: string,
): string {
  const p = new URLSearchParams(atuais);
  if (valor === null) p.delete(chave);
  else p.set(chave, valor);
  const texto = p.toString();
  return texto ? `${caminho}?${texto}` : caminho;
}

/** Legenda: a cor do cartão é o STATUS; o retângulo do prazo mostra a situação do prazo. */
export function Legenda() {
  return (
    <div className="flex flex-col gap-1.5 text-xs text-texto-suave">
      <ul className="flex flex-wrap items-center gap-x-4 gap-y-1" aria-label="Cores de status">
        <li className="font-semibold text-texto">Cor do cartão = status:</li>
        {COLUNAS.map((c) => (
          <li key={c.id} className="flex items-center gap-1.5">
            <span className={`size-2.5 rounded-full ${COR_STATUS[c.id].bolinha}`} />
            {c.titulo}
          </li>
        ))}
      </ul>
      <ul className="flex flex-wrap items-center gap-x-3 gap-y-1" aria-label="Cores do prazo">
        <li className="font-semibold text-texto">Prazo:</li>
        <li className={`rounded px-1.5 py-0.5 font-semibold ${COR_PRAZO.vencido}`}>Vencido</li>
        <li className={`rounded px-1.5 py-0.5 font-semibold ${COR_PRAZO.vence_em_breve}`}>
          Vence em menos de 1h
        </li>
        <li className={`rounded px-1.5 py-0.5 font-semibold ${COR_PRAZO.sem_prazo}`}>Sem prazo</li>
        <li className={`rounded px-1.5 py-0.5 ${COR_PRAZO.no_prazo}`}>Em dia</li>
      </ul>
    </div>
  );
}

const SELECT =
  "min-h-11 rounded-xl border border-borda bg-superficie px-3 text-sm font-semibold text-texto";

/** Filtros do quadro: status, pessoa atendendo, categoria, sistema e prazo (todos na URL). */
export function FiltrosQuadro({
  filtros,
  categorias,
  sistemas,
  tecnicos,
}: {
  filtros: Filtros;
  categorias: Categoria[];
  /** Sistemas da empresa (com a cor do banco), para "Sistema". */
  sistemas: OpcaoSistema[];
  /** Técnicos da TI, para "Pessoa atendendo". */
  tecnicos: PerfilPublico[];
}) {
  const router = useRouter();
  const caminho = usePathname();
  const parametros = useSearchParams();
  const atuais = new URLSearchParams(parametros.toString());
  const trocar = (chave: string, valor: string | null) =>
    router.replace(comParametro(atuais, chave, valor, caminho));
  const corSistema = classesDaCor(sistemas.find((s) => s.nome === filtros.sistema)?.cor);

  return (
    <div className="flex flex-wrap items-center gap-3">
      <select
        aria-label="Filtrar por status"
        className={SELECT}
        value={filtros.coluna ?? ""}
        onChange={(e) => trocar("status", e.target.value || null)}
      >
        <option value="">Todos os status</option>
        {COLUNAS.map((c) => (
          <option key={c.id} value={c.id}>
            {c.titulo}
          </option>
        ))}
      </select>
      <select
        aria-label="Filtrar por pessoa atendendo"
        className={SELECT}
        value={filtros.responsavel}
        onChange={(e) => trocar("filtro", e.target.value === "todos" ? null : e.target.value)}
      >
        <option value="todos">Qualquer pessoa</option>
        <option value="meus">Eu</option>
        <option value="sem_responsavel">Ninguém ainda</option>
        {tecnicos.map((t) => (
          <option key={t.id} value={t.id}>
            {t.nome}
          </option>
        ))}
      </select>
      <select
        aria-label="Filtrar por categoria"
        className={SELECT}
        value={filtros.categoriaId ?? ""}
        onChange={(e) => trocar("categoria", e.target.value || null)}
      >
        <option value="">Todas as categorias</option>
        {categorias.map((c) => (
          <option key={c.id} value={c.id}>
            {c.nomeCurto}
          </option>
        ))}
      </select>
      <div className="relative flex items-center">
        {/* Quadradinho da cor do sistema escolhido (o select nativo não mostra cor nas opções). */}
        {corSistema ? (
          <span
            aria-hidden="true"
            className={`pointer-events-none absolute left-3 size-2.5 rounded-sm ${corSistema.fundo}`}
          />
        ) : null}
        <select
          aria-label="Filtrar por sistema"
          className={`${SELECT} ${corSistema ? "pl-7" : ""}`}
          value={filtros.sistema ?? ""}
          onChange={(e) => trocar("sistema", e.target.value || null)}
        >
          <option value="">Qualquer sistema</option>
          {sistemas.map((s) => (
            <option key={s.nome} value={s.nome}>
              {s.nome}
            </option>
          ))}
        </select>
      </div>
      <select
        aria-label="Filtrar por prazo"
        className={SELECT}
        value={filtros.prazo}
        onChange={(e) => trocar("prazo", e.target.value === "todos" ? null : e.target.value)}
      >
        {PRAZOS.map((p) => (
          <option key={p.valor} value={p.valor}>
            {p.rotulo}
          </option>
        ))}
      </select>
    </div>
  );
}
