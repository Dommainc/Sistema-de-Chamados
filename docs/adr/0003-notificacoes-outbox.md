# ADR 0003 — Notificações do Teams por outbox

**Status:** aceito · **Data:** 2026-10-03

## Decisão
A ação (abrir, assumir, transferir...) grava a notificação em `notificacoes` com
status `pendente` **na mesma transação**. O envio ao bot é separado:
- Database Webhook do Supabase em INSERT de `notificacoes` → `POST /internal/notificacoes/processar` na FastAPI;
- Vercel Cron a cada 5 min reprocessa `pendente` com `proxima_tentativa_em <= now()`, até 3 tentativas.

## Motivos
- Funções serverless da Vercel podem ser encerradas logo após a resposta; disparar o Teams
  "em segundo plano" dentro da request não é confiável.
- Falha no Teams nunca desfaz nem atrasa a ação principal (requisito da seção 7.5).
- Toda tentativa e erro fica registrado.

## Consequências
- Aviso pode chegar com alguns segundos de atraso (ou até 5 min, em caso de falha).
