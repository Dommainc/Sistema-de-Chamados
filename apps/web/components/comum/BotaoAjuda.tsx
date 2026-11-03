import { CircleHelp } from "lucide-react";
import Link from "next/link";

/**
 * Botão "?" no canto de baixo à direita (ata de 26/10/2026, item 10): abre a Ajuda da área.
 * No celular do portal fica acima do menu de baixo; nas telas focadas (abrir chamado e conversa),
 * fica sempre mais alto para não cobrir o botão de enviar.
 */
export function BotaoAjuda({
  href,
  posicao = "padrao",
}: {
  href: string;
  posicao?: "padrao" | "acimaDoMenu" | "acimaDoEnvio";
}) {
  const baixo = {
    padrao: "bottom-6",
    acimaDoMenu: "bottom-24 md:bottom-6",
    acimaDoEnvio: "bottom-24",
  }[posicao];
  return (
    <Link
      href={href}
      aria-label="Ajuda"
      title="Ajuda"
      className={`fixed right-4 z-30 flex size-12 items-center justify-center rounded-full border border-borda bg-superficie text-texto shadow-lg hover:bg-superficie-2 print:hidden ${baixo}`}
    >
      <CircleHelp aria-hidden="true" className="size-6" />
    </Link>
  );
}
