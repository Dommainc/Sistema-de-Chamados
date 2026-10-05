// Formatação para exibição. Datas são armazenadas em UTC e exibidas em America/Sao_Paulo.

const FUSO = "America/Sao_Paulo";

export function formatarNumeroChamado(id: number): string {
  return `#${id}`;
}

const formatoDataHora = new Intl.DateTimeFormat("pt-BR", {
  timeZone: FUSO,
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

/** "06/10/2026 11:00" */
export function formatarDataHora(iso: string): string {
  return formatoDataHora.format(new Date(iso)).replace(",", "");
}

const formatoDiaHora = new Intl.DateTimeFormat("pt-BR", {
  timeZone: FUSO,
  day: "2-digit",
  month: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

/** "06/10 às 11:00" — usado na previsão de atendimento. */
export function formatarPrevisao(iso: string): string {
  const partes = formatoDiaHora.formatToParts(new Date(iso));
  const p = (tipo: Intl.DateTimeFormatPartTypes) => partes.find((x) => x.type === tipo)?.value;
  return `${p("day")}/${p("month")} às ${p("hour")}:${p("minute")}`;
}

/** "agora mesmo", "há 5 min", "há 2h", "há 3 dias". */
export function tempoRelativo(iso: string, agora: Date = new Date()): string {
  const segundos = Math.max(0, Math.floor((agora.getTime() - new Date(iso).getTime()) / 1000));
  if (segundos < 60) return "agora mesmo";
  const minutos = Math.floor(segundos / 60);
  if (minutos < 60) return `há ${minutos} min`;
  const horas = Math.floor(minutos / 60);
  if (horas < 24) return `há ${horas}h`;
  const dias = Math.floor(horas / 24);
  return dias === 1 ? "há 1 dia" : `há ${dias} dias`;
}
