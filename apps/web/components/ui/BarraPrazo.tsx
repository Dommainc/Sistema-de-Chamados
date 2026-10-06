import { progressoPrazo, situacaoPrazo, textoPrazo, type SituacaoPrazo } from "@/lib/prazo";

const COR_TEXTO: Record<SituacaoPrazo, string> = {
  vencido: "text-perigo font-semibold",
  vence_em_breve: "text-alerta font-semibold",
  no_prazo: "text-texto",
  sem_prazo: "text-texto-suave",
};

const COR_BARRA: Record<SituacaoPrazo, string> = {
  vencido: "bg-perigo",
  vence_em_breve: "bg-laranja",
  no_prazo: "bg-sucesso",
  sem_prazo: "bg-superficie-2",
};

/** Prazo em texto + barra fina do tempo consumido (mockup, cartões da área técnica). */
export function BarraPrazo({
  criadoEm,
  prazo,
  agora = new Date(),
  semTexto = false,
}: {
  criadoEm: string;
  /** null = a TI ainda não definiu (docs/adr/0009): texto "Sem prazo" e barra vazia. */
  prazo: string | null;
  agora?: Date;
  /** Só a barra (quando o texto do prazo já aparece ao lado, como no cartão PRAZO). */
  semTexto?: boolean;
}) {
  const situacao = situacaoPrazo(prazo, agora);
  const progresso =
    prazo === null ? 0 : situacao === "vencido" ? 1 : progressoPrazo(criadoEm, prazo, agora);
  return (
    <div className="flex min-w-0 flex-1 flex-col gap-1">
      {semTexto ? null : (
        <span className={`text-sm ${COR_TEXTO[situacao]}`}>{textoPrazo(prazo, agora)}</span>
      )}
      <span className="h-1 w-full overflow-hidden rounded-full bg-superficie-2" aria-hidden="true">
        <span
          className={`block h-full rounded-full ${COR_BARRA[situacao]}`}
          style={{ width: prazo === null ? "0%" : `${Math.max(4, Math.round(progresso * 100))}%` }}
        />
      </span>
    </div>
  );
}
