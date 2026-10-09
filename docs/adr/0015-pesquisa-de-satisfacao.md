# ADR 0015 — Pesquisa de satisfação

**Status:** aceito · **Data:** 2026-10-09 · **Antecipa:** a pesquisa de satisfação que estava na Fase 2 (`docs/escopo.md`)

## Contexto
O dono pediu uma pesquisa de satisfação depois do encerramento e perguntou se dava para fazê-la pelo bot do Teams.
O bot é um projeto separado que hoje só **recebe** avisos (`POST /notificar`, ADR 0003); responder dentro do Teams
exigiria o bot devolver a resposta para a nossa API (rota nova e autenticação entre sistemas).

## Decisão
- **Quem/quando:** o solicitante avalia **uma vez** cada chamado **concluído** (cancelado não). **Sem prazo**: o selo
  "Avalie o atendimento" fica em "Meus chamados" até ele avaliar. A avaliação não muda nem é apagada e não reabre nada.
- **Formato:** **1 a 5 estrelas** (Péssimo · Ruim · Regular · Bom · Ótimo) + **texto**, obrigatório com nota **1 ou 2**
  ("Conte o que podemos melhorar") e opcional nas outras.
- **Onde responde:** na Central — no chamado concluído, no lugar do campo de mensagem. **Teams:** o aviso de
  "chamado concluído" leva o link para a avaliação (etapa 1E); responder dentro do Teams fica para depois.
- **Quem vê:** a **TI vê a nota com o nome** de quem avaliou (decisão do dono): bloco "Avaliação" no chamado,
  histórico ("Avaliado por Ana: 4 estrelas"), **Dashboard** (satisfação média, % dos concluídos avaliados e **nota
  média por técnico**) e a página **"Avaliações"** (`/atendimento/avaliacoes`) com todas, filtráveis por período,
  técnico e nota. O solicitante vê só a dele.
- **Banco:** tabela `avaliacoes` (migration 0024): PK = `chamado_id` (uma por chamado), nota 1–5, texto obrigatório
  com nota ≤ 2 (check), trigger que exige chamado concluído e avaliador = solicitante, sem update/delete. RLS: a
  própria ou TI. Escrita só pela API (`POST /chamados/{id}/avaliacao`), com o evento `avaliado` no histórico na mesma
  transação.
- **Erros novos:** `AVALIACAO_INDISPONIVEL` (não concluído) e `AVALIACAO_JA_ENVIADA` (409).

## Consequências
- A nota do técnico no Dashboard conta os chamados que **ele concluiu** no período.
- Avaliar pelo Teams com um clique pode vir depois sem mudar a tabela: só uma rota para o bot.
