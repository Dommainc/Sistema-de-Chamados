# Runbook — bot do Teams parado (rascunho)

> Rascunho: completar na etapa 1E, quando o código do bot existente estiver disponível.

## O que acontece quando o bot para
- **A Central continua funcionando normalmente**: abrir, atender, conversar. Falha no Teams nunca bloqueia a ação
  ([ADR 0003](../adr/0003-notificacoes-outbox.md)).
- Os avisos ficam na tabela `notificacoes` como `pendente`; a API tenta de novo (até 3 vezes, com espera de
  1, 5 e 15 minutos) e depois marca `falhou` com o erro.

## Como perceber
```sql
-- Avisos parados ou com falha na última hora
select status, count(*) from notificacoes
 where criado_em > now() - interval '1 hour'
 group by status;

select id, chamado_id, tipo, tentativas, erro, criado_em
  from notificacoes where status = 'falhou' order by criado_em desc limit 20;
```

## O que fazer
1. Verificar se o bot está no ar (onde ele roda: _completar na 1E_).
2. Verificar o segredo compartilhado (`X-Central-Secret`) — foi trocado de um lado só? Ver [rotacionar-chave.md](rotacionar-chave.md).
3. Depois de corrigir, reenviar os que falharam:
   ```sql
   update notificacoes
      set status = 'pendente', tentativas = 0, proxima_tentativa_em = now(), erro = null
    where status = 'falhou' and criado_em > now() - interval '1 day';
   ```
   (rodar como administrador; avisos muito antigos podem ser deixados como estão).
4. Avisar a equipe de TI que os avisos voltaram.
