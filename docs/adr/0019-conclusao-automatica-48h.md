# ADR 0019 — Conclusão automática em 48 h úteis, lembrete de 12 h e aviso fora do expediente

**Status:** aceito · **Data:** 2026-10-16 · **Atualiza:** [ADR 0005](0005-status-simplificados.md) ("sem fechamento
automático") e [ADR 0011](0011-regras-de-atendimento-e-automacoes.md) (automações por tempo)

## Contexto
O dono trouxe um pacote de mudanças ("avisos-teams") feito à parte. A parte do bot dependia de um bot externo que
não existe mais (o bot é a própria API — [ADR 0018](0018-bot-do-teams-dentro-da-api.md)) e ficou de fora. Das
regras novas, o dono escolheu três; a quarta (transferência deixar de avisar o solicitante) **não** entrou: o
solicitante continua sendo avisado.

## Decisão
A contagem é a mesma do ADR 0011: começa na **última mensagem pública da TI** (ou na volta para "Em andamento", o
que for mais recente) e **zera quando o solicitante responde**. A mensagem automática das 24 h não zera.

| Horas úteis | O que acontece | Aviso (`notificacoes.tipo`) |
|---|---|---|
| 2 | Em andamento → Aguardando usuário (já existia) | `status_alterado` → `aguardando_usuario` |
| **12** | **Só o lembrete no Teams** (novo), uma vez por contagem | `lembrete_resposta` |
| 24 | Mensagem automática no chat (já existia; agora avisa que o chamado será concluído) | `aviso_inatividade` |
| **48** | **Concluído automaticamente** (novo): histórico sem autor, `motivo = sem_resposta_48h_uteis` | `status_alterado` → `concluido` com o motivo |

- Se vários limites vencem juntos (job parado), só o **maior** gera aviso.
- O pg_cron chama `app.processar_inatividade_agendado()`, que **só roda no expediente** (`app.eh_horario_util`).
- `app.processar_inatividade(p_agora)` recebe o instante (testes com datas fixas: pgTAP 008 e 015).
- **Aviso fora do expediente:** quem abre chamado fora do horário recebe no Teams "No momento não há técnicos em
  horário de atendimento. A equipe volta {hoje | amanhã | segunda-feira…} às 8h" (`app.proxima_abertura`, com
  feriados). A TI recebe o "Chamado novo" normalmente.
- Na Central, o histórico mostra "Concluído automaticamente: sem resposta por 48 horas úteis" (solicitante) e
  "Sistema · concluído automaticamente" (TI). O chamado concluído assim também pode ser avaliado.
- Modo de demonstração (`lib/dados/simulada/inatividade.ts`) faz as mesmas contas, também só no expediente.

## Consequências
- Um chamado pode ser concluído sem a TI. Se o problema continuar, o solicitante abre um novo (não há reabertura).
- Migrations 0028 (`20261016150000_conclusao_automatica_e_lembretes.sql`) e 0029 (GRANT para a API).
