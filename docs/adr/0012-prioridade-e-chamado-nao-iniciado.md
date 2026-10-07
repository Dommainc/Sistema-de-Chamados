# ADR 0012 — Prioridade definida pela TI e chamado não iniciado travado

**Status:** aceito · **Data:** 2026-10-07 · **Atualiza:** [ADR 0009](0009-prazo-definido-pela-ti.md) (prazo só depois de
iniciar) e [ADR 0011](0011-regras-de-atendimento-e-automacoes.md) (o Relato também trava antes de iniciar)

## Contexto
Pedidos do dono: "se eu não iniciar o chamado, não posso mexer em nada dele" (mas posso abrir para ver) e uma
**prioridade** por chamado — Alta (vermelho), Média (amarelo), Baixa (cinza) —, com a alta avisada no cartão do quadro.

## Decisão

### Chamado não iniciado (`pendente` ou `transferido`)
- Dá para **abrir e ver tudo** (conversa, pedido, histórico, relato).
- Só dá para **Iniciar** (o técnico de destino, no transferido) ou **Cancelar** (para duplicados/engano — escolha do
  dono). No transferido para outro técnico, "Devolver à fila" continua (regra do ADR 0005).
- Travados: **conversa, Relato técnico, prazo e prioridade**. A API responde `CHAMADO_NAO_INICIADO` (409); a tela
  mostra "Chamado ainda não iniciado…" no cabeçalho e "Inicie o chamado para…" no lugar dos campos.

### Prioridade
| Ponto | Regra |
|---|---|
| Valores | **Alta** (vermelho) · **Média** (amarelo) · **Baixa** (cinza). Todo chamado nasce Média. `critica` existe no enum do banco, sem uso |
| Quem / quando | Só a **TI**, **depois de iniciar**, enquanto não estiver encerrado |
| Quem vê | **Só a TI**. O histórico (`prioridade_alterada`, `detalhe: {de, para}`) é **interno**; o solicitante não é avisado |
| Quadro | **Alta sobe para o topo** de cada coluna (antes até dos vencidos) e o cartão mostra **"⚠ Prioridade alta"** |
| API | `POST /chamados/{id}/prioridade` `{prioridade: "alta"|"media"|"baixa"}`; mesma prioridade = nada muda |
| Banco | Coluna `chamados.prioridade` já existia (migration 0005) — **sem migration** |

## Consequências
- Testes: API (rotas + integração com banco real), modo de demonstração, tela e quadro.
- Os exemplos do modo de demonstração têm #36 e #38 com prioridade alta.
