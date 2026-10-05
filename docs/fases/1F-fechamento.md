# Etapa 1F — Fechamento da Fase 1

## Objetivo
Revisar tudo contra os critérios de pronto e entregar a documentação final.

## Escopo
1. **Erros**: teste (API + componente) para **cada** código da seção 8 do escopo, verificando mensagem e forma de exibição
   (toast, inline, tela). Revisão manual: nenhuma mensagem técnica visível em nenhum fluxo.
2. **Segurança via API** (pytest, sem front): com o token da Ana, tentar ler/alterar/comentar/baixar anexo do chamado do Bruno
   em todas as rotas → `SEM_PERMISSAO`. Mesmo teste direto no PostgREST do Supabase com a anon key.
3. **Testes E2E** (Playwright, contra ambiente local): os itens da seção 13 do escopo.
4. **Documentação**: completar `docs/` (arquitetura, banco, status, erros, segredos, runbooks, ADRs) e `guia-usuario.md`
   (1 página, linguagem simples, com prints: como abrir, acompanhar, conversar, colar print, confirmar/reabrir).
5. **Checklist de go-live** em `docs/go-live.md`: projetos Supabase em `sa-east-1` (confirmar no painel), plano Pro, backups,
   **restore testado**, senha `central_api` definida, Azure provider configurado com o tenant, webhook e cron ativos,
   secret scanning/push protection ligados, variáveis de produção na Vercel em `gru1`.

## Critérios de aceite
Todos os itens da seção 13 do escopo marcados, com evidência (teste automatizado ou passo manual descrito) em `docs/fases/STATUS.md`.
