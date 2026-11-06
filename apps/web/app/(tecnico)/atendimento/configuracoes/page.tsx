import type { Metadata } from "next";
import { TelaConfiguracoes } from "@/components/tecnico/configuracoes/TelaConfiguracoes";
import { abaDaUrl } from "@/components/tecnico/configuracoes/abas";

export const metadata: Metadata = { title: "Configurações" };

/** Configurações da TI (ADR 0022). Aba na URL: ?aba=formularios|assuntos|respostas|feriados */
export default async function PaginaConfiguracoes({
  searchParams,
}: PageProps<"/atendimento/configuracoes">) {
  const { aba } = await searchParams;
  return <TelaConfiguracoes aba={abaDaUrl(aba)} />;
}
