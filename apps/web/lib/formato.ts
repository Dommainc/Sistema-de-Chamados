// Formatação para exibição (docs/ui-ux.md). Datas são armazenadas em UTC e exibidas em America/Sao_Paulo.

const FUSO = "America/Sao_Paulo";

export function formatarNumeroChamado(id: number): string {
  return `#${id}`;
}

/** Primeira letra maiúscula ("hoje, 11:30" → "Hoje, 11:30"). */
export function maiuscula(texto: string): string {
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

/** "Ana Souza" → "AS". */
export function iniciais(nome: string): string {
  const partes = nome.trim().split(/\s+/).filter(Boolean);
  const primeira = partes[0]?.[0] ?? "";
  const ultima = partes.length > 1 ? partes[partes.length - 1][0] : "";
  return (primeira + ultima).toUpperCase();
}

const formatoPartes = new Intl.DateTimeFormat("pt-BR", {
  timeZone: FUSO,
  weekday: "short",
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

interface PartesData {
  dia: string;
  mes: string;
  ano: string;
  hora: string;
  minuto: string;
  semana: string;
  /** Número de dias desde 1970 no fuso de São Paulo (para comparar "hoje", "ontem"...). */
  diaAbsoluto: number;
}

function partes(data: Date): PartesData {
  const p = formatoPartes.formatToParts(data);
  const v = (tipo: Intl.DateTimeFormatPartTypes) => p.find((x) => x.type === tipo)?.value ?? "";
  const dia = v("day");
  const mes = v("month");
  const ano = v("year");
  return {
    dia,
    mes,
    ano,
    hora: v("hour"),
    minuto: v("minute"),
    semana: v("weekday").replace(".", ""),
    diaAbsoluto: Math.floor(Date.UTC(Number(ano), Number(mes) - 1, Number(dia)) / 86_400_000),
  };
}

/** "06/10/2026 11:00" */
export function formatarDataHora(iso: string): string {
  const p = partes(new Date(iso));
  return `${p.dia}/${p.mes}/${p.ano} ${p.hora}:${p.minuto}`;
}

/** "11:30" */
export function formatarHora(iso: string): string {
  const p = partes(new Date(iso));
  return `${p.hora}:${p.minuto}`;
}

function diferencaDias(iso: string, agora: Date): number {
  return partes(new Date(iso)).diaAbsoluto - partes(agora).diaAbsoluto;
}

/** "hoje, 11:30" · "amanhã, 17:00" · "ontem, 09:00" · "13/10, 09:00". */
export function formatarQuando(iso: string, agora: Date = new Date()): string {
  const p = partes(new Date(iso));
  const hora = `${p.hora}:${p.minuto}`;
  const dif = diferencaDias(iso, agora);
  if (dif === 0) return `hoje, ${hora}`;
  if (dif === 1) return `amanhã, ${hora}`;
  if (dif === -1) return `ontem, ${hora}`;
  return `${p.dia}/${p.mes}, ${hora}`;
}

/** Previsão de atendimento: "hoje, até 11:30" · "amanhã, até 17:00" · "até 13/10 às 09:00". */
export function formatarPrevisao(iso: string, agora: Date = new Date()): string {
  const p = partes(new Date(iso));
  const hora = `${p.hora}:${p.minuto}`;
  const dif = diferencaDias(iso, agora);
  if (dif === 0) return `hoje, até ${hora}`;
  if (dif === 1) return `amanhã, até ${hora}`;
  return `até ${p.dia}/${p.mes} às ${hora}`;
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

/** Última atualização nos cartões: "há 12 min" (hoje) · "ontem" · "sex, 02/10". */
export function formatarAtualizacao(iso: string, agora: Date = new Date()): string {
  const dif = diferencaDias(iso, agora);
  if (dif === 0) return tempoRelativo(iso, agora);
  if (dif === -1) return "ontem";
  const p = partes(new Date(iso));
  return `${p.semana}, ${p.dia}/${p.mes}`;
}
