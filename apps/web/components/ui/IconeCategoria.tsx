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

/** Ícones permitidos em categorias.icone (kebab-case, igual ao banco). */
const ICONES: Record<string, LucideIcon> = {
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

/** Ícone da categoria dentro do quadrado azul-claro (mockup, tela 1). Desconhecido = "…". */
export function IconeCategoria({ icone }: { icone: string }) {
  const Icone = ICONES[icone] ?? Ellipsis;
  return (
    <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-primaria-suave text-primaria">
      <Icone aria-hidden="true" className="size-6" strokeWidth={1.75} />
    </span>
  );
}
