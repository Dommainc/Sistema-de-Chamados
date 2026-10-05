"use client";

import { Card } from "@/components/ui/Card";
import { useConsulta } from "@/lib/dados/provedor";
import type { FonteDeDados } from "@/lib/dados/tipos";

const consultarCategorias = (fonte: FonteDeDados) => fonte.listarCategorias();

/**
 * Passo 1 do "Abrir chamado". Nesta entrega só exibe as categorias;
 * o formulário (passos 2 e 3) chega na Entrega 2.
 */
export function EscolhaCategoria() {
  const { dados: categorias, erro, carregando } = useConsulta(consultarCategorias);

  if (carregando) return <p className="text-texto-suave">Carregando...</p>;
  if (erro) return <p className="text-perigo">{erro.message}</p>;

  return (
    <div className="flex flex-col gap-4">
      <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {categorias?.map((c) => (
          <li key={c.id}>
            <Card className="h-full">
              <h3 className="font-semibold">{c.nome}</h3>
              <p className="mt-1 text-sm text-texto-suave">{c.descricao}</p>
            </Card>
          </li>
        ))}
      </ul>
      <p className="text-sm text-texto-suave">
        Não encontrou? Escolha <strong>Outros</strong>. (O formulário de abertura chega na próxima
        entrega.)
      </p>
    </div>
  );
}
