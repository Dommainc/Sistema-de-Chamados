# Runbook — avisos do Teams parados

O bot é a própria API da Central ([ADR 0018](../adr/0018-bot-do-teams-dentro-da-api.md)); instalação em
[bot-teams.md](bot-teams.md).

## O que acontece quando o Teams falha
- **A Central continua funcionando normalmente**: abrir, atender, conversar. Falha no Teams nunca bloqueia a ação
  ([ADR 0003](../adr/0003-notificacoes-outbox.md)).
- Os avisos ficam na tabela `notificacoes` como `pendente`. A cada minuto o banco chama a API, que tenta enviar;
  se falhar, tenta de novo em 1 e 5 minutos e, na 3ª falha, marca `falhou` com o erro.
- Aviso parado há mais de 24 horas não é mais enviado (`falhou` com "aviso antigo").

## Como perceber
```sql
-- Avisos da última hora, por situação
select status, count(*) from public.notificacoes
 where criado_em > now() - interval '1 hour'
 group by status;

-- Últimas falhas e o motivo
select id, chamado_id, tipo, tentativas, erro, criado_em
  from public.notificacoes where status = 'falhou' order by criado_em desc limit 20;

-- O banco está chamando a API? (respostas do pg_net nas últimas horas)
select status_code, content, created from net._http_response order by created desc limit 10;
```

## O que fazer, pelo erro
| Erro | Causa provável | O que fazer |
|---|---|---|
| `token: HTTP 401` / `400` | Segredo do bot vencido ou errado | Novo segredo no App Registration do bot → `BOT_APP_SEGREDO` na Vercel → Redeploy |
| `Teams: HTTP 403` | Pessoa removeu o app, ou app bloqueado no Teams | Conferir o app no admin do Teams |
| `Teams: HTTP 5xx` / `ConnectTimeout` | Teams instável | Nada: a fila tenta de novo sozinha |
| `pessoa sem conversa com o bot` | App não instalado para ela | Política de configuração do Teams ([bot-teams.md](bot-teams.md), passo 6) |
| Nada sai, tudo `pendente` | Vault sem `central_api_url`/`central_processador_segredo`, ou `PROCESSADOR_SEGREDO` diferente dos dois lados | [bot-teams.md](bot-teams.md), passos 2 a 4; ver `net._http_response` (403 = segredo diferente) |

Depois de corrigir, reenviar os que falharam no último dia:
```sql
update public.notificacoes
   set status = 'pendente', tentativas = 0, proxima_tentativa_em = now(), erro = null
 where status = 'falhou' and criado_em > now() - interval '1 day'
   and erro <> 'aviso antigo (mais de 24 h): não enviado';
```
(rodar como administrador no SQL Editor). Avisar a equipe de TI que os avisos voltaram.
