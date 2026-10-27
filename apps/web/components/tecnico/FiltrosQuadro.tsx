"use client";

import { User } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { OpcaoSistema, PerfilPublico } from "@/lib/dados/tipos";
import { PRIORIDADES_DA_TI, type Categoria } from "@/lib/dominio/tipos";
import { COR_PRIORIDADE } from "./cores";
import type { FiltrosQuadro as Filtros } from "./quadro";

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

const BOTAO =
  "min-h-10 rounded-xl border bg-superficie px-3 text-sm font-semibold text-texto hover:border-texto-suave";

/**
 * Um filtro (ata de 26/10/2026, itens 02 e 09): sem "Qualquer"/"Todas". Sem filtro, mostra o nome do filtro
 * ("Categoria"); com filtro, o escolhido fica em destaque. A 1ª opção da lista tira o filtro.
 */
function Filtro({
  rotulo,
  valor,
  opcoes,
  aoMudar,
}: {
  rotulo: string;
  valor: string;
  opcoes: { valor: string; rotulo: string }[];
  aoMudar: (valor: string | null) => void;
}) {
  const ativo = valor !== "";
  return (
    <select
      aria-label={`Filtrar por ${rotulo.toLocaleLowerCase("pt-BR")}`}
      className={`max-w-[12rem] ${BOTAO} ${ativo ? "border-texto" : "border-borda"}`}
      value={valor}
      onChange={(e) => aoMudar(e.target.value || null)}
    >
      <option value="">{ativo ? `${rotulo}: tirar filtro` : rotulo}</option>
      {opcoes.map((o) => (
        <option key={o.valor} value={o.valor}>
          {o.rotulo}
        </option>
      ))}
    </select>
  );
}

/** Filtros do quadro (layout novo): Responsável · Categoria · Sistema · Prioridade · Só os meus. */
export function FiltrosQuadro({
  filtros,
  categorias,
  sistemas,
  tecnicos,
}: {
  filtros: Filtros;
  categorias: Categoria[];
  sistemas: OpcaoSistema[];
  tecnicos: PerfilPublico[];
}) {
  const router = useRouter();
  const caminho = usePathname();
  const parametros = useSearchParams();
  const atuais = new URLSearchParams(parametros.toString());
  const trocar = (chave: string, valor: string | null) =>
    router.replace(comParametro(atuais, chave, valor, caminho));

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Filtro
        rotulo="Responsável"
        valor={filtros.responsavel === "todos" ? "" : filtros.responsavel}
        opcoes={[
          { valor: "sem_responsavel", rotulo: "Sem responsável" },
          ...tecnicos.map((t) => ({ valor: t.id, rotulo: t.nome })),
        ]}
        aoMudar={(v) => trocar("filtro", v)}
      />
      <Filtro
        rotulo="Categoria"
        valor={filtros.categoriaId === null ? "" : String(filtros.categoriaId)}
        opcoes={categorias.map((c) => ({ valor: String(c.id), rotulo: c.nomeCurto }))}
        aoMudar={(v) => trocar("categoria", v)}
      />
      <Filtro
        rotulo="Sistema"
        valor={filtros.sistema ?? ""}
        opcoes={sistemas.map((s) => ({ valor: s.nome, rotulo: s.nome }))}
        aoMudar={(v) => trocar("sistema", v)}
      />
      <Filtro
        rotulo="Prioridade"
        valor={filtros.prioridade ?? ""}
        opcoes={PRIORIDADES_DA_TI.map((p) => ({
          valor: p,
          rotulo: COR_PRIORIDADE[p]?.rotulo ?? p,
        }))}
        aoMudar={(v) => trocar("prioridade", v)}
      />
      <button
        type="button"
        aria-pressed={filtros.soMeus}
        onClick={() => {
          // "Só os meus" substitui a opção "Eu" do filtro de responsável (ata, item 01).
          const p = new URLSearchParams(atuais);
          p.delete("filtro");
          if (filtros.soMeus) p.delete("meus");
          else p.set("meus", "1");
          const texto = p.toString();
          router.replace(texto ? `${caminho}?${texto}` : caminho);
        }}
        className={`inline-flex items-center gap-1.5 ${BOTAO} ${
          filtros.soMeus
            ? "border-texto bg-primaria text-sobre-primaria hover:border-texto"
            : "border-borda"
        }`}
      >
        <User aria-hidden="true" className="size-4" />
        Só os meus
      </button>
    </div>
  );
}
