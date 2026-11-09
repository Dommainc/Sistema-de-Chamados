import type { Metadata } from "next";
import { TelaConfiguracoes } from "@/components/tecnico/configuracoes/TelaConfiguracoes";
import { abaDaUrl } from "@/components/tecnico/configuracoes/abas";

export const metadata: Metadata = { title: "Painel" };

/** Painel da TI — configurações (ADR 0022). Aba na URL: ?aba=formularios|assuntos|respostas|feriados */
export default async function PaginaConfiguracoes({
  searchParams,
}: PageProps<"/atendimento/painel">) {
  const { aba } = await searchParams;
  return <TelaConfiguracoes aba={abaDaUrl(aba)} />;
}
