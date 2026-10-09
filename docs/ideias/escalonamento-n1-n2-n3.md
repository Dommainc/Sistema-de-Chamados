# Escalonamento N1 → N2 → N3 com "bater ponto" (ideia — não implantar)

**Situação:** proposta para discussão entre a TI e o Renato (2026-10-09). Nada disto está no sistema.
Pendência: P-044.

## A ideia em uma frase
Cada chamado tem um **relógio**. Se passar do tempo combinado sem ninguém agir, o bot do Teams avisa o **N1**;
se continuar parado, sobe para o **N2** e depois para o **N3**. O **"bater ponto"** diz ao sistema **quem está
trabalhando agora**, para não avisar quem está de férias ou já foi embora.

## 1. Quem é quem
| Nível | Quem costuma ser | Papel no aviso |
|---|---|---|
| **N1** | Técnicos que atendem a fila | Recebem o primeiro aviso e devem agir |
| **N2** | Técnico sênior / coordenador | Recebe quando o N1 não agiu; pode reassumir ou redistribuir |
| **N3** | Gestor da TI | Recebe quando nem o N2 resolveu — aviso de gestão |

## 2. O que conta como "atrasado" (gatilhos)
- **Ninguém iniciou:** em Novos há X horas úteis.
- **Prazo vencido:** o prazo definido pela TI passou e o chamado não foi concluído.
- **Parado:** em atendimento sem mensagem, relato ou ação há X horas úteis.
- **Transferido sem iniciar:** o técnico de destino não pegou (já é a P-021).

A **prioridade** encurta os tempos. Exemplo para "ninguém iniciou" (horas úteis, valores só para conversa):

| Prioridade | Avisa N1 | Sobe para N2 | Sobe para N3 |
|---|---|---|---|
| Alta | 30 min | 1 h | 2 h |
| Média | 2 h | 4 h | 8 h |
| Baixa | 4 h | 8 h | 16 h |

## 3. "Bater ponto" (disponibilidade)
- **(a) Botão na Central:** "Estou disponível · Em pausa · Encerrei o dia" — simples e visível para todos.
- **(b) Automático pelo expediente + agenda de ausências:** todos disponíveis no expediente, menos quem está
  marcado de férias ou folga.
- ~~Presença do Teams~~: exigiria Microsoft Graph, que o projeto não permite.

Sugestão: **(a) + a agenda de ausências de (b)** — o botão cobre o dia a dia (almoço, reunião, saiu mais cedo);
a agenda cobre férias.

## 4. Circunstâncias
| Situação | O que o sistema faz |
|---|---|
| N1 não bateu ponto, de férias ou em pausa | Avisa outro N1 disponível; se não houver, **pula para o N2** |
| N2 indisponível | Pula para o **N3** |
| Ninguém disponível | Avisa o N3 e marca o chamado "sem cobertura" no quadro |
| Técnico encerrou o dia com chamados abertos | Aviso ao N2 ("Rafael saiu com 3 chamados em atendimento") para redistribuir |
| Fora do expediente | O relógio **para** (horas úteis), como nas automações atuais. Plantão para Alta seria outra regra |
| Aguardando usuário | O relógio **para** (a bola está com o solicitante) |
| Alguém agiu (iniciou, respondeu, mudou o prazo) | O escalonamento **zera** para aquele chamado |
| Avisos repetidos | **Um aviso por chamado e por etapa** em cada nível + no máximo um resumo diário |

## 5. Exemplos de aviso
- **N1:** "⏰ Chamado #42 está sem início há 2 h (prioridade média). [Abrir]"
- **N2:** "⚠ #42 continua sem início há 4 h — Rafael e Thiago foram avisados. [Abrir]"
- **N3:** "🚨 #42 parado há 8 h úteis, sem resposta do N1 e do N2. [Abrir]"

## 6. Encaixe no que já existe
- **Relógio:** a rotina do banco que roda a cada 5 min (`app.processar_inatividade`, ADR 0011) ganharia estes gatilhos.
- **Avisos:** a fila de notificações (outbox, ADR 0003); o bot só lê e envia — sem nova integração.
- **Novo:** configuração dos níveis (quem é N1/N2/N3), tempos por prioridade, registro de ponto e ausências,
  histórico dos escalonamentos.
- **Dashboard:** quantos chamados escalaram e até que nível (indicador de gargalo).

## 7. Decisões em aberto
1. Quem é N1, N2 e N3? Pessoa fixa ou grupo?
2. Quais gatilhos valem (sem início, prazo vencido, parado, transferido)?
3. Quais tempos, por prioridade e por nível?
4. Como bater ponto: botão, agenda de ausências ou os dois?
5. O N2 só é avisado ou pode reassumir/redistribuir chamados dos outros?
6. Plantão fora do expediente para prioridade Alta?
7. Resumo diário para o N3 ("hoje 2 chamados escalaram")?
