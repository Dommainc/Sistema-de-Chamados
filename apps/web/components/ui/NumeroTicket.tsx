import type { SituacaoPrazo } from "@/lib/prazo";

const TONS: Record<SituacaoPrazo | "neutro", string> = {
  vencido: "bg-perigo text-white",
  vence_em_breve: "bg-laranja-suave text-alerta",
  no_prazo: "bg-sucesso-suave text-sucesso",
  sem_prazo: "bg-superficie-2 text-texto-suave",
  neutro: "bg-superficie-2 text-texto-suave",
};

/**
 * Canhoto "Nº 36" dos cartões da área técnica (mockup, telas 6 e 8).
 * A cor indica o prazo: vermelho (vencido), laranja-claro (< 1 h), verde-claro (no prazo),
 * cinza (sem prazo: a TI ainda não definiu — ADR 0009).
 */
export function NumeroTicket({
  numero,
  situacao = "neutro",
  className = "",
}: {
  numero: number;
  situacao?: SituacaoPrazo | "neutro";
  className?: string;
}) {
  return (
    <span
      className={`flex w-16 shrink-0 flex-col items-center justify-center font-mono ${TONS[situacao]} ${className}`}
    >
      <span className="text-[10px] font-semibold tracking-wider opacity-80">Nº</span>
      <span className="text-xl leading-tight font-semibold">{numero}</span>
    </span>
  );
}
