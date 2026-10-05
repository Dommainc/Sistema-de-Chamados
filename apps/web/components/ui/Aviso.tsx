import { CircleAlert, type LucideIcon } from "lucide-react";

type TomAviso = "alerta" | "info" | "perigo" | "sucesso";

const TONS: Record<TomAviso, string> = {
  alerta: "border-alerta-borda bg-alerta-suave text-alerta",
  info: "border-primaria-suave bg-primaria-suave text-primaria-forte",
  perigo: "border-perigo-suave bg-perigo-suave text-perigo",
  sucesso: "border-sucesso-suave bg-sucesso-suave text-sucesso",
};

/**
 * Faixa de aviso do mockup (ex.: "O técnico está esperando sua resposta").
 * `acao` fica à direita (link "Responder").
 */
export function Aviso({
  titulo,
  children,
  icone: Icone = CircleAlert,
  tom = "alerta",
  acao,
  className = "",
}: {
  titulo: string;
  children?: React.ReactNode;
  icone?: LucideIcon;
  tom?: TomAviso;
  acao?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      role="status"
      className={`flex items-center gap-3 rounded-xl border px-4 py-3 ${TONS[tom]} ${className}`}
    >
      <Icone aria-hidden="true" className="size-6 shrink-0" strokeWidth={1.75} />
      <div className="min-w-0 flex-1">
        <p className="font-semibold">{titulo}</p>
        {children ? <div className="text-sm">{children}</div> : null}
      </div>
      {acao ? <div className="shrink-0">{acao}</div> : null}
    </div>
  );
}
