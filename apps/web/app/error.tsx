"use client";

import { useEffect, useMemo } from "react";
import { TelaMensagem } from "@/components/comum/TelaMensagem";
import { Botao } from "@/components/ui/Botao";
import { gerarRefErro, mensagemErro } from "@/lib/erros/catalogo";

export default function ErroInesperado({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  const ref = useMemo(() => gerarRefErro(), []);

  useEffect(() => {
    console.error(`[${ref}]`, error);
  }, [error, ref]);

  return (
    <main className="flex flex-1">
      <TelaMensagem
        titulo="Algo deu errado"
        texto={mensagemErro("ERRO_INESPERADO", { ref })}
        acao={{ rotulo: "Voltar para o início", href: "/" }}
      >
        <Botao variante="secundario" onClick={() => retry()}>
          Tentar de novo
        </Botao>
      </TelaMensagem>
    </main>
  );
}
