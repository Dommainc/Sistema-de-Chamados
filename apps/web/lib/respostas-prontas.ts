// Respostas prontas do chat (tabela respostas_prontas — migration 0023; só a TI).

/**
 * "{nome}" vira o primeiro nome do solicitante ("Oi, {nome}!" → "Oi, Ana!").
 * Sem nome conhecido, o "{nome}" sai sem deixar vírgula sobrando ("Oi!", "Vou acessar...").
 */
export function preencherNome(texto: string, nome: string): string {
  if (nome) return texto.replaceAll("{nome}", nome);
  const limpo = texto
    .replace(/^\{nome\},\s*/, "")
    .replace(/,\s*\{nome\}(?=[!?.])/g, "")
    .replaceAll("{nome}", "")
    .trim();
  return limpo.charAt(0).toLocaleUpperCase("pt-BR") + limpo.slice(1);
}
