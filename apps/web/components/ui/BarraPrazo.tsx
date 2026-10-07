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
  comRotulo = false,
  semBarra = false,
  acao,
}: {
  criadoEm: string;
  /** null = a TI ainda não definiu (docs/adr/0009): texto "Sem prazo" e barra vazia. */
  prazo: string | null;
  agora?: Date;
  /** Só a barra (quando o texto do prazo já aparece ao lado, como no cartão PRAZO). */
  semTexto?: boolean;
  /** "Prazo: amanhã, 11:29" em vez de só "Amanhã, 11:29" (nos cartões, a data solta confundia). */
  comRotulo?: boolean;
  /** Só o texto (cartões do quadro: a cor do cartão já diz a urgência — ver urgenciaDoCartao). */
  semBarra?: boolean;
  /** Botão ao lado da barra (ex.: "Iniciar"); o texto do prazo fica numa linha só, acima. */
  acao?: React.ReactNode;
}) {
  const situacao = situacaoPrazo(prazo, agora);
  const textoBase = textoPrazo(prazo, agora);
  const texto =
    comRotulo && situacao === "no_prazo"
      ? `Prazo: ${textoBase.charAt(0).toLocaleLowerCase("pt-BR")}${textoBase.slice(1)}`
      : textoBase;
  const progresso =
    prazo === null ? 0 : situacao === "vencido" ? 1 : progressoPrazo(criadoEm, prazo, agora);
  const barra = (
    <span
      className="h-1 w-full min-w-8 flex-1 overflow-hidden rounded-full bg-superficie-2"
      aria-hidden="true"
    >
      <span
        className={`block h-full rounded-full ${COR_BARRA[situacao]}`}
        style={{ width: prazo === null ? "0%" : `${Math.max(4, Math.round(progresso * 100))}%` }}
      />
    </span>
  );
  if (semBarra) {
    return (
      <div className="flex min-w-0 flex-1 items-center justify-between gap-3">
        <span className={`text-sm ${COR_TEXTO[situacao]}`}>{texto}</span>
        {acao}
      </div>
    );
  }
  return (
    <div className="flex min-w-0 flex-1 flex-col gap-1.5">
      {semTexto ? null : <span className={`text-sm ${COR_TEXTO[situacao]}`}>{texto}</span>}
      {acao ? (
        <div className="flex items-center gap-3">
          {barra}
          {acao}
        </div>
      ) : (
        barra
      )}
    </div>
  );
}
