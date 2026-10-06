"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Segmentado } from "@/components/ui/Segmentado";
import type { Categoria } from "@/lib/dominio/tipos";
import type { FiltroPrazo, FiltrosQuadro as Filtros } from "./quadro";
import type { FiltroResponsavel } from "./parametros";

const RESPONSAVEL: { valor: FiltroResponsavel; rotulo: string }[] = [
  { valor: "todos", rotulo: "Todos" },
  { valor: "meus", rotulo: "Só os meus" },
  { valor: "sem_responsavel", rotulo: "Sem responsável" },
];

const PRAZOS: { valor: FiltroPrazo; rotulo: string }[] = [
  { valor: "todos", rotulo: "Qualquer prazo" },
  { valor: "vencido", rotulo: "Vencido" },
  { valor: "vence_em_breve", rotulo: "Vence em menos de 1h" },
  { valor: "no_prazo", rotulo: "No prazo" },
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

export function Legenda() {
  return (
    <ul className="flex items-center gap-4 text-xs text-texto-suave" aria-label="Legenda de prazo">
      <li className="flex items-center gap-1.5">
        <span className="size-2.5 rounded-sm bg-perigo" /> Vencido
      </li>
      <li className="flex items-center gap-1.5">
        <span className="size-2.5 rounded-sm bg-laranja" /> Vence em menos de 1h
      </li>
      <li className="flex items-center gap-1.5">
        <span className="size-2.5 rounded-sm bg-sucesso" /> No prazo
      </li>
    </ul>
  );
}

const SELECT =
  "min-h-11 rounded-xl border border-borda bg-superficie px-3 text-sm font-semibold text-texto";

/** Filtros do quadro (mockup, tela 6): responsável, categoria e prazo. */
export function FiltrosQuadro({
  filtros,
  categorias,
}: {
  filtros: Filtros;
  categorias: Categoria[];
}) {
  const router = useRouter();
  const caminho = usePathname();
  const parametros = useSearchParams();
  const atuais = new URLSearchParams(parametros.toString());

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Segmentado
        rotuloAcessivel="Filtrar por responsável"
        valor={filtros.responsavel}
        opcoes={RESPONSAVEL.map((r) => ({
          ...r,
          href: comParametro(atuais, "filtro", r.valor === "todos" ? null : r.valor, caminho),
        }))}
      />
      <select
        aria-label="Filtrar por categoria"
        className={SELECT}
        value={filtros.categoriaId ?? ""}
        onChange={(e) =>
          router.replace(comParametro(atuais, "categoria", e.target.value || null, caminho))
        }
      >
        <option value="">Todas as categorias</option>
        {categorias.map((c) => (
          <option key={c.id} value={c.id}>
            {c.nomeCurto}
          </option>
        ))}
      </select>
      <select
        aria-label="Filtrar por prazo"
        className={SELECT}
        value={filtros.prazo}
        onChange={(e) =>
          router.replace(
            comParametro(
              atuais,
              "prazo",
              e.target.value === "todos" ? null : e.target.value,
              caminho,
            ),
          )
        }
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
