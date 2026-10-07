# ADR 0011 — Só a TI cancela, conversa só depois de iniciar e automações por tempo de resposta

**Status:** aceito · **Data:** 2026-10-07 · **Atualiza:** [ADR 0005](0005-status-simplificados.md) (quem cancela;
"sem job agendado")

## Contexto
Pedidos do dono depois de ver o sistema funcionando:
1. O solicitante não deve mais cancelar o chamado.
2. A TI só começa a tratar (conversar com o solicitante) depois de **iniciar** o chamado.
3. Quando o solicitante responde, o chamado volta para "Em andamento"; quando a TI responde e o solicitante fica
   **2 horas** sem responder, o chamado vai sozinho para "Aguardando usuário".
4. **24 horas** depois da mensagem da TI sem resposta, o sistema manda um **aviso automático** no chat.
5. Os tempos contam em **horas úteis** (seg–sex, 8h–18h, sem feriados).

## Decisão

| Regra | Onde |
|---|---|
| **Só a TI cancela** (com motivo). Solicitante tentando → `CANCELAMENTO_NAO_PERMITIDO`, texto novo: "Quem cancela o chamado é a TI. Se não precisa mais, avise pelo chat." O botão sai do portal | `estados.py` / `estados.ts` (fonte única) |
| **Conversa só depois de iniciar**: a TI não envia mensagem ao solicitante com o chamado em `pendente` ou `transferido` → `CHAMADO_NAO_INICIADO` (novo, 409): "Inicie o chamado para conversar com o solicitante." O Relato técnico (nota interna) continua livre | API `enviar_mensagem`; tela mostra "Inicie o chamado para conversar com a Ana." no lugar do campo |
| **Solicitante respondeu → Em andamento** | Já existia (`resposta_solicitante`) |
| **2 h úteis** sem resposta à última mensagem pública da TI, com o chamado em andamento → **Aguardando usuário**. Conta desde a mensagem ou desde a volta para "Em andamento", o que for mais recente. Histórico sem autor ("Sistema", `detalhe.motivo = sem_resposta_2h_uteis`) e aviso ao solicitante | `app.processar_inatividade()` |
| **24 h úteis** sem resposta à última mensagem pública da TI → **mensagem automática** no chat ("Olá, Ana! Estamos aguardando sua resposta…"), **uma vez** (depois dela a última mensagem é do sistema). Só avisa: quem conclui é a TI | `app.processar_inatividade()` |

- **Tarefa agendada:** `pg_cron` a cada 5 minutos (`processar-inatividade`, migration 0021). Volta a existir um job
  agendado (o ADR 0005 tinha removido o de fechamento automático); ele não encerra chamados.
- **Mensagem do sistema:** `mensagens.autor_id = null` e `origem = 'sistema'` (check `mensagens_autor_ou_sistema`).
  Na conversa aparece num balão azul-claro "Aviso automático da Central". Conta como **não lida** para o solicitante,
  não para a TI (view `chamados_quadro` recriada na 0021).
- **Modo de demonstração:** `lib/dados/simulada/inatividade.ts` faz a mesma conta a cada leitura dos dados.
- **Notificação nova:** `aviso_inatividade` (para o bot, na 1E).

## Consequências
- O ciclo continua com os 6 status; mudaram só quem cancela e as duas automações.
- Testes: pgTAP `008`, `inatividade.test.ts` (relógio fixo: sexta 17h só vence na terça, por causa do feriado),
  API (cancelar e conversar antes de iniciar) e E2E.
- Se a TI usar "Retomar" sem escrever nada, o relógio de 2 h recomeça a contar a partir da retomada.
