import {
  AppWindow,
  Cctv,
  Download,
  Ellipsis,
  Grid2x2,
  KeyRound,
  Laptop,
  LayoutGrid,
  Mail,
  MessageSquare,
  Package,
  Printer,
  Smartphone,
  UserMinus,
  UserPlus,
  Wifi,
  type LucideIcon,
} from "lucide-react";
import type { ICONES_ASSUNTO } from "@/lib/dominio/configuracoes";

/** Ícones permitidos em categorias.icone (kebab-case, igual ao banco; lista em ICONES_ASSUNTO). */
const ICONES: Record<(typeof ICONES_ASSUNTO)[number], LucideIcon> = {
  "key-round": KeyRound,
  wifi: Wifi,
  mail: Mail,
  "message-square": MessageSquare,
  laptop: Laptop,
  printer: Printer,
  smartphone: Smartphone,
  "layout-grid": LayoutGrid,
  "grid-2x2": Grid2x2,
  "app-window": AppWindow,
  cctv: Cctv,
  download: Download,
  "user-plus": UserPlus,
  "user-minus": UserMinus,
  package: Package,
  ellipsis: Ellipsis,
};

/**
 * Ícone da categoria. "normal": quadrado azul-claro (listas). "grande": círculo grande da tela
 * "Com o que você precisa de ajuda?" (ícones em linha, pedido do dono, 2026-11-09). Desconhecido = "…".
 */
export function IconeCategoria({
  icone,
  tamanho = "normal",
}: {
  icone: string;
  tamanho?: "normal" | "grande";
}) {
  const Icone = ICONES[icone as keyof typeof ICONES] ?? Ellipsis;
  const grande = tamanho === "grande";
  return (
    <span
      className={`flex shrink-0 items-center justify-center bg-primaria-suave text-primaria transition-colors ${
        grande ? "size-16 rounded-full sm:size-20" : "size-12 rounded-xl"
      }`}
    >
      <Icone
        aria-hidden="true"
        className={grande ? "size-7 sm:size-9" : "size-6"}
        strokeWidth={1.75}
      />
    </span>
  );
}
