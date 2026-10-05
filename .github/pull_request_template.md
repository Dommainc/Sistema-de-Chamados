## O que muda

<!-- Resumo em uma ou duas frases. Etapa: docs/fases/... -->

## Como testar

<!-- Passos para conferir a mudança. -->

## Checklist

- [ ] Migration nova (se houver) tem `enable row level security` + GRANT + policy + teste em `supabase/tests/database/`
- [ ] Função nova no banco tem `GRANT EXECUTE` explícito para quem precisa (P-011)
- [ ] Nenhuma migration já commitada foi editada
- [ ] Textos da interface em português do Brasil, linguagem simples
- [ ] Erros passam pelo catálogo (nada de mensagem crua, SQL ou stack trace na tela)
- [ ] Front acessa dados só por `apps/web/lib/dados/` (ADR 0006)
- [ ] Sem segredos no código; `.env.example` atualizado se surgiu variável nova
- [ ] `docs/pendencias.md` e o registro de mudanças de `docs/fases/STATUS.md` atualizados
- [ ] Decisão nova de arquitetura registrada em `docs/adr/`
