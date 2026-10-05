import { Check } from "lucide-react";
import type { StatusChamado } from "@/lib/dominio/tipos";
import { PASSOS_PROGRESSO, passoProgresso } from "@/lib/status";

/**
 * Barra de progresso do solicitante (mockup, tela 5), com 3 passos (ADR 0005):
 * Recebido → Em atendimento → Concluído. Passo feito = ✓ verde; atual = ponto laranja.
 */
export function BarraProgresso({ status }: { status: StatusChamado }) {
  const { atual, cancelado } = passoProgresso(status);
  if (cancelado) return null;
  const terminado = status === "concluido";

  return (
    <ol className="grid grid-cols-3" aria-label="Andamento do chamado">
      {PASSOS_PROGRESSO.map((rotulo, i) => {
        const feito = i < atual || (terminado && i === atual);
        const corrente = i === atual && !terminado;
        return (
          <li
            key={rotulo}
            aria-current={corrente ? "step" : undefined}
            className="relative flex flex-col items-center gap-1 text-center"
          >
            {i > 0 ? (
              <span
                aria-hidden="true"
                className={`absolute top-4 right-1/2 left-[-50%] -z-0 h-0.5 ${i <= atual ? "bg-sucesso" : "bg-borda"}`}
              />
            ) : null}
            <span
              className={`relative z-10 flex size-8 items-center justify-center rounded-full border-2 bg-superficie ${
                feito
                  ? "border-sucesso bg-sucesso text-white"
                  : corrente
                    ? "border-laranja"
                    : "border-borda"
              }`}
            >
              {feito ? <Check className="size-4" strokeWidth={3} aria-hidden="true" /> : null}
              {corrente ? <span className="size-3 rounded-full bg-laranja" /> : null}
            </span>
            <span
              className={`text-sm ${feito ? "font-semibold text-sucesso" : corrente ? "font-semibold text-alerta" : "text-texto-suave"}`}
            >
              {rotulo}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
