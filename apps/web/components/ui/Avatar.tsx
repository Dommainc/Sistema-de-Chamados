import { iniciais } from "@/lib/formato";

type TomAvatar = "primaria" | "claro" | "escuro" | "suave";

const TONS: Record<TomAvatar, string> = {
  primaria: "bg-primaria text-sobre-primaria",
  claro: "bg-sobre-barra text-barra",
  escuro: "bg-barra text-sobre-barra",
  suave: "bg-primaria-suave text-primaria",
};

const TAMANHOS = {
  pequeno: "size-7 text-[11px]",
  normal: "size-10 text-sm",
  grande: "size-12 text-base",
} as const;

/** Círculo com as iniciais (mockup: "AS", "RL", "TM"). */
export function Avatar({
  nome,
  tom = "primaria",
  tamanho = "normal",
}: {
  nome: string;
  tom?: TomAvatar;
  tamanho?: keyof typeof TAMANHOS;
}) {
  return (
    <span
      title={nome}
      aria-hidden="true"
      className={`inline-flex shrink-0 items-center justify-center rounded-full font-semibold ${TONS[tom]} ${TAMANHOS[tamanho]}`}
    >
      {iniciais(nome)}
    </span>
  );
}
