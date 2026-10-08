# ADR 0013 — Dashboard da TI calculado no navegador

**Status:** aceito · **Data:** 2026-10-08 · **Resolve:** P-040

## Contexto
O dono pediu uma aba **"Dashboard"** na área técnica, com botão no topo ao lado da busca, para acompanhar os
números do atendimento. Decisões dele: **quatro blocos** (resumo em números, volume, equipe, prazo e espera),
**toda a TI vê tudo** (inclusive por técnico), **tempos em horas úteis** e período padrão **últimos 30 dias**.
O Supabase da nuvem ainda não existe (P-022) e a DOMMA tem 50–60 colaboradores: algumas centenas de chamados
por mês.

## Decisão
- **Tela:** `/atendimento/dashboard`, só na área da TI (o `proxy.ts` já manda o solicitante para "Sem acesso").
  Período na URL: `?periodo=7d|30d|mes|mes_passado|datas&de=AAAA-MM-DD&ate=AAAA-MM-DD`.
- **Dados:** uma leitura nova no contrato, `listarDadosMetricas(inicio, fim)` — chamados **abertos agora** ou
  **abertos/concluídos/cancelados no período**, o **histórico** deles e o **expediente** (para as horas úteis).
  Na versão real é leitura direta pela `anon key` (RLS: a TI já lê tudo isso); nada passa pela API.
- **Cálculo:** puro, em `apps/web/lib/metricas.ts`, igual para a versão simulada e a real. Horas úteis por
  `horasUteisEntre` (`lib/dominio/horario-util.ts`, o inverso de `adicionarHorasUteis`).
- **Gráficos:** barras simples com os tokens de cor, **sem biblioteca** nova.

### Como cada número é contado
| Número | Regra |
|---|---|
| Abertos agora / vencidos agora | Não encerrados, de qualquer data / com prazo já passado |
| Abertos / concluídos no período | `criado_em` / `concluido_em` dentro do período |
| Tempo até iniciar | Abertura → primeiro `assumido` (chamados abertos no período) |
| Tempo até concluir | Abertura → `concluido_em` (concluídos no período) |
| % no prazo | Concluídos no período **que tinham prazo**: `concluido_em ≤ prazo` |
| Por categoria / sistema / departamento | Abertos no período. Sistema sem "Não se aplica"; departamento vazio = "Sem departamento" |
| Equipe | Concluídos (responsável), em atendimento agora (`em_andamento` + `aguardando_usuario`), tempo médio, transferências feitas (autor) e recebidas (`detalhe.para_responsavel_id`) no período |
| Tempo aguardando usuário | Soma, por chamado, dos trechos em `aguardando_usuario` que **começaram** no período (trecho aberto conta até agora) |
| Últimos cancelamentos | 5 mais recentes do período, com motivo e quem cancelou |

## Consequências
- Sem migration, sem SQL e sem esperar o Supabase. Os números aparecem já na demonstração (o modo simulado
  ganhou o histórico #1–#29, encerrados entre 9 e 60 dias atrás).
- Com o volume da DOMMA, a leitura é pequena (centenas de linhas). **Se crescer**, a conta pode virar uma view ou
  função no banco devolvendo o mesmo formato, sem mudar a tela.
- Departamento ainda é texto livre: o ranking fica confiável com a lista do RH (P-041).
- Fora por enquanto: exportar para Excel e comparação com o período anterior.
