import type { Metadata } from "next";
import Link from "next/link";
import { Dica, Guia, SecaoGuia } from "@/components/comum/Guia";
import { PassosAbrirChamado } from "@/components/comum/GuiaAbrirChamado";

export const metadata: Metadata = { title: "Como abrir um chamado" };

/** Ajuda da área "Abrir chamado" da TI: o mesmo passo a passo do colaborador (pedido do dono, 2026-11-09). */
export default function PaginaAjudaAbrir() {
  return (
    <Guia
      titulo="Como abrir um chamado"
      subtitulo="A TI também abre chamado pela Central: o caminho é o mesmo do colaborador."
    >
      <SecaoGuia id="abrir" titulo="Abrir um chamado">
        <PassosAbrirChamado
          inicio={
            <>
              Em{" "}
              <Link href="/atendimento/novo" className="font-semibold text-primaria underline">
                Abrir chamado
              </Link>{" "}
              (menu do seu nome),
            </>
          }
        />
        <Dica>
          você não atende o chamado que abriu: ele aparece em Novos para um colega da TI iniciar.
          Você acompanha e conversa com quem estiver atendendo.
        </Dica>
      </SecaoGuia>
    </Guia>
  );
}
