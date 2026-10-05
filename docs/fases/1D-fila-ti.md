# Etapa 1D — Fila da TI

> ⚠️ **Não é mais uma etapa.** Absorvida pela `1A-3-experiencia-por-perfil.md`; use só como referência de API, banco e erros.
> Status, confirmar/reabrir e fechamento automático aqui estão desatualizados: valem `docs/adr/0005` e o `CLAUDE.md`.

## Objetivo
Tela de trabalho da TI: ver, filtrar e agir sobre os chamados rapidamente.

## Escopo — Web (leitura direto do Supabase sob RLS; ações pela API da 1B)
1. **`/fila`** — abas: **Fila** (aberto, em_analise, transferido sem responsável) · **Meus atendimentos** (responsável = eu,
   não encerrados) · **Todos**.
2. **Filtros** combináveis, refletidos na URL (link compartilhável): status, categoria, prioridade, responsável,
   prazo (vencido / vence hoje / no prazo), período de abertura.
3. **Busca**: só dígitos (`42` ou `#42`) → abre `/chamados/42` direto; texto → busca no título (índice trigram).
4. **Tabela**: número, título, solicitante (nome + departamento via `perfis_publicos`), categoria, status, responsável,
   aberto há, prazo. Ordenação padrão: prazo mais próximo primeiro. Paginação por cursor (50 por página).
5. **Destaque de prazo**: vencido (vermelho + ícone), vence em menos de 20% do SLA (âmbar). Cálculo no front a partir de
   `prazo_sla` e `criado_em`; texto "vence em 2h" / "venceu há 1 dia útil".
6. **Ações rápidas** na linha: Assumir; menu com Transferir, Mudar status, Cancelar (mesmos modais da 1B).
7. **Tempo real**: assinatura em `chamados` atualiza a lista; chamado novo aparece com destaque por alguns segundos.
8. Contadores no topo: na fila, meus, vencidos.

## Critérios de aceite
- Com 200 chamados de teste (script `supabase/scripts/gerar_chamados_teste.sql`, só dev), filtro e busca respondem < 500 ms.
- `42` na busca abre o chamado 42.
- Solicitante que acessa `/fila` vê "Você não tem acesso".
- Chamado aberto em outra janela aparece na fila sem recarregar.
