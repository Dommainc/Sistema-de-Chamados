// Link para abrir o chat do Teams com uma pessoa (botão "Falar no Teams" — ajuste do Renato, 2026-10-08).
// É só um endereço que o Teams entende: nenhuma chamada de API (integrações permitidas: login e bot).

export function linkChatTeams(email: string): string {
  return `https://teams.microsoft.com/l/chat/0/0?users=${encodeURIComponent(email)}`;
}
