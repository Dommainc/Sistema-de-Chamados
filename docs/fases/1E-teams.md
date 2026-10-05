# Etapa 1E — Notificações no Teams e resposta automática do bot

## Pré-requisito
Acesso ao código do bot existente (Azure Bot Service + Graph). **Antes de planejar, pergunte a linguagem/SDK e onde ele roda.**
Se ainda não houver acesso, implemente só o lado da Central contra um **bot simulado** (`apps/bot-mock`) que respeite o contrato abaixo.

## Contrato Central ↔ bot
| Direção | Endpoint | Uso |
|---|---|---|
| Central → bot | `POST {BOT_URL}/notificar` | `{ teams_user_id \| conversation_ref, card }` — envia Adaptive Card proativo |
| Bot → Central | `POST /internal/bot/conversas` | registra/atualiza `teams_conversas` quando o bot é instalado ou recebe mensagem |
| Bot → Central | `POST /internal/bot/resposta-automatica` | `{ teams_user_id, texto }` → Central registra o log e devolve o card de resposta |

Autenticação entre os dois por segredo compartilhado (header `X-Central-Secret`), em `docs/segredos.md`.

## Escopo — Central (API)
1. **Processador do outbox** `POST /internal/notificacoes/processar` (chamado pelo Database Webhook do Supabase no INSERT
   de `notificacoes`, com segredo) e `GET /internal/cron/notificacoes` (Vercel Cron, a cada 5 min, `CRON_SECRET`):
   pega `pendente` com `proxima_tentativa_em <= now()` (`for update skip locked`), envia, marca `enviada` ou incrementa
   `tentativas` com backoff (1, 5, 15 min); após 3 → `falhou` com `erro`. Timeout de 5 s por envio.
2. Sem `teams_conversas` para o destinatário → `falhou` com erro "usuário sem conversa com o bot" (não tentar de novo).
3. Atualiza `teams_conversas.ultimo_chamado_notificado`.
4. **Adaptive Cards** (templates em `app/integracoes/cards/`): título "Chamado #42", título do chamado, o que aconteceu
   ("Seu chamado foi assumido por João"), status, botão **Abrir chamado** (`{URL_CENTRAL}/chamados/42`). Um template por tipo:
   chamado_aberto (solicitante e TI), chamado_assumido, chamado_transferido, nova_mensagem, status_alterado.
5. **Resposta automática**: `POST /internal/bot/resposta-automatica` grava em `bot_respostas_automaticas` e devolve o card:
   texto de `configuracoes.bot_resposta_automatica` + "Para falar sobre o chamado #N, responda pelo próprio chamado: [Abrir chamado]"
   (se houver `ultimo_chamado_notificado`) + "Para abrir um novo pedido: [Abrir Central]". Nada é gravado no chamado.
   Deixar isolado para ser substituído na Fase 3 ("abrir chamado pelo Teams").
6. Job de limpeza de `temporarios/` (1C) no mesmo cron.

## Escopo — Bot existente (quando houver acesso)
`/notificar`, captura da conversation reference em `onInstallationUpdate`/`onMessage`, e no `onMessage`
chamar a Central e responder com o card devolvido. Não alterar o comportamento atual do bot além disso.

## Critérios de aceite
- Abrir, assumir, transferir, mensagem e mudança de status geram card (no mock: registro do payload).
- Bot fora do ar: a ação na Central funciona normalmente; notificação termina `falhou` após 3 tentativas com o erro registrado.
- Responder ao bot gera a resposta automática com o link do último chamado e um registro no log.
