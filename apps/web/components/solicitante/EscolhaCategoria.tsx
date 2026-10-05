"use client";

import { Search } from "lucide-react";
import { useMemo, useState } from "react";
import { IconeCategoria } from "@/components/ui/IconeCategoria";
import { useConsulta } from "@/lib/dados/provedor";
import type { FonteDeDados } from "@/lib/dados/tipos";
import type { Categoria } from "@/lib/dominio/tipos";

const consultarCategorias = (fonte: FonteDeDados) => fonte.listarCategorias();

/** Ignora acentos e maiúsculas: "impressao" encontra "Impressão". */
function normalizar(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLocaleLowerCase("pt-BR");
}

function filtrar(categorias: Categoria[], termo: string): Categoria[] {
  const t = normalizar(termo.trim());
  if (!t) return categorias;
  return categorias.filter((c) =>
    [c.nomeCurto, c.nome, c.descricao].some((campo) => normalizar(campo).includes(t)),
  );
}

/**
 * Passo 1 do "Abrir chamado" (mockup, tela 1): busca + grade de assuntos.
 * Nesta etapa os cartões só são exibidos; o formulário (passos 2 e 3) chega na Entrega 2.
 */
export function EscolhaCategoria() {
  const { dados: categorias, erro, carregando } = useConsulta(consultarCategorias);
  const [termo, setTermo] = useState("");
  const visiveis = useMemo(() => filtrar(categorias ?? [], termo), [categorias, termo]);

  if (carregando) return <p className="text-texto-suave">Carregando...</p>;
  if (erro) return <p className="text-perigo">{erro.message}</p>;

  return (
    <div className="flex flex-col gap-4">
      <div className="relative">
        <Search
          aria-hidden="true"
          className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-texto-suave"
        />
        <input
          type="search"
          value={termo}
          onChange={(e) => setTermo(e.target.value)}
          aria-label="Buscar assunto"
          placeholder="Buscar assunto (ex.: senha, impressora)"
          className="min-h-12 w-full rounded-xl border border-borda bg-superficie pr-4 pl-12 text-base placeholder:text-texto-suave"
        />
      </div>

      {visiveis.length === 0 ? (
        <p className="text-texto-suave">
          Nenhum assunto encontrado. Escolha <strong>Outros pedidos para a TI</strong>.
        </p>
      ) : null}

      <ul className="grid grid-cols-2 gap-3">
        {visiveis.map((c) => (
          <li key={c.id} className={c.icone === "ellipsis" ? "col-span-2" : ""}>
            <div className="flex h-full min-h-20 items-center gap-3 rounded-2xl border border-borda bg-superficie p-3 font-semibold shadow-sm">
              <IconeCategoria icone={c.icone} />
              <span className="leading-snug">{c.nomeCurto}</span>
            </div>
          </li>
        ))}
      </ul>
      <p className="text-center text-sm text-texto-suave">
        O formulário de abertura chega na próxima entrega.
      </p>
    </div>
  );
}
