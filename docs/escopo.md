# Escopo — Central de Chamados DOMMA

> Documento de origem do projeto. Quando algo aqui conflitar com o `CLAUDE.md` ou um ADR, **valem o CLAUDE.md e os ADRs**
> (são decisões posteriores). Resumo das decisões tomadas depois deste escopo:
> - Só a área de TI na Fase 1.
> - Dois papéis: `solicitante` e `ti` (sem nível coordenador; toda a TI tem o mesmo acesso, incluindo configurações e painel).
> - Papel via grupo `Central-Chamados-TI` do Entra ID (ADR 0004).
> - Hospedagem na Vercel (front e API), região `gru1`.
> - Sem observadores e sem "abrir chamado em nome de outro" na Fase 1.
> - SLA em horas úteis (seg–sex, 08h–18h, sem feriados), valores no `supabase/seed.sql`; fechamento automático em 3 dias úteis.

## 1. Contexto
- Incorporadora e construtora no Rio de Janeiro; todos usam Microsoft 365 (Entra ID, Outlook, Teams).
- Hoje: quem abre chamado não acompanha o andamento, não conversa com a TI, não há prazos nem métricas, e as automações
  do Power Automate são difíceis de manter.
- Objetivo: lugar único para abrir, acompanhar e conversar sobre pedidos de suporte, com avisos no Teams e números para a gestão.
- Integrações permitidas: **apenas** login Entra ID e bot do Teams existente. Nenhuma integração com Lists, SharePoint ou Power Automate.
- Reaproveitar: o bot de helpdesk existente e **apenas o padrão visual e de formulários** do sistema "Cadastro de Insumos".
- Público não técnico: interface e mensagens simples, em português do Brasil.

## 4. Número do chamado
Inteiro sequencial (1, 2, 3...), gerado pelo banco, imutável, nunca reaproveitado. Exibição "Chamado 42" / "#42";
URL `/chamados/42`; busca por `42` abre direto. Segurança 100% via RLS: `/chamados/43` sem permissão → `SEM_PERMISSAO`.

## 5. Ciclo de vida
```
aberto → em_analise → em_atendimento ⇄ aguardando_usuario → resolvido → fechado
                ↘ transferido → em_analise
   (qualquer status antes de "resolvido") → cancelado
```
- `aguardando_usuario`: SLA pausado; volta para `em_atendimento` quando o solicitante responde no chat.
- `transferido`: exige destino e motivo; novo responsável/fila é avisado; histórico guarda origem e destino.
- `resolvido`: solicitante confirma ou reabre; fecha sozinho após X dias úteis.
- `fechado`: somente leitura; dispara pesquisa de satisfação (Fase 2).
- `cancelado`: solicitante só antes de `em_atendimento`; TI antes de `resolvido`; motivo obrigatório; fora do SLA.
- Tabela detalhada de transições: `CLAUDE.md`.

## 7. Funcionalidades
### 7.1 Abertura
Escolhe categoria → formulário dinâmico (`campos_form`) → mostra número e prazo.

### 7.2 Chat
Tempo real (Supabase Realtime). Mensagens internas só para TI, com destaque. Resposta do solicitante em
`aguardando_usuario` volta o status para `em_atendimento`.

### 7.3 Anexos e imagens
- Botão e arrastar-e-soltar.
- **Colar imagem com Ctrl+V / Cmd+V** no chat e no formulário de abertura: evento `paste`, `clipboardData.items`, itens
  `image/*`; pré-visualização com remover; nome `print-AAAAMMDD-HHMMSS.png`; `origem = 'colado'`; várias imagens seguidas.
- Limites configuráveis: 10 MB; imagem, PDF, Office e TXT. Validar no front **e** no back.
- Bucket privado, URL assinada, acesso vinculado ao chamado.

### 7.4 Fila da TI
Filtros (status, categoria, prioridade, responsável, prazo), busca por número/título, ações (assumir, transferir,
mudar status, cancelar), destaque de prazo perto de vencer ou vencido.

### 7.5 Notificações no Teams
Adaptive Card com número e botão "Abrir chamado" quando: chamado aberto (solicitante e fila); assumido; transferido
(novo responsável/fila e solicitante); mensagem nova não interna; mudança de status (incluindo cancelado e resolvido);
prazo perto de vencer (só TI — Fase 2). Tudo registrado em `notificacoes`. **Falha no Teams nunca impede a ação.**

### 7.6 Resposta automática do bot
Se alguém responder ao bot no Teams, o bot responde (sem registrar nada no chamado):
> Olá! Este canal é usado apenas para avisos e as mensagens enviadas aqui não são lidas pela equipe de TI.
> Para falar sobre o chamado **#42**, responda pelo próprio chamado: [Abrir chamado]
> Para abrir um novo pedido, acesse a Central de Chamados: [Abrir Central]

Com o último chamado notificado, se houver; senão só o link da Central. Registrar em log (usuário, data, texto).
Mensagem configurável e substituível na Fase 3.

## 8. Mensagens de erro
Catálogo central, português simples, sempre dizendo o que aconteceu e o que fazer.

API: `{ "erro": { "codigo": "ANEXO_MUITO_GRANDE", "mensagem": "texto amigável", "detalhe": "opcional, só em dev" } }`

Front: toast para erros de ação; inline por campo para formulário; telas amigáveis de 404 e erro inesperado com botão
de voltar; nunca stack trace, SQL ou mensagem crua do Supabase; erro inesperado gera ref curta (`ERR-7F3A`) mostrada e logada.

| Código | Quando | Mensagem |
|---|---|---|
| `CAMPO_OBRIGATORIO` | Campo vazio | Preencha o campo **{campo}** para continuar. |
| `ANEXO_MUITO_GRANDE` | Acima do limite | Esse arquivo tem mais de 10 MB. Tente um arquivo menor ou envie um print da tela. |
| `ANEXO_TIPO_INVALIDO` | Tipo não permitido | Esse tipo de arquivo não é aceito. Envie imagem, PDF ou documento do Office. |
| `COLAR_SEM_IMAGEM` | Ctrl+V sem imagem | Não encontramos uma imagem para colar. Copie o print e tente de novo. |
| `UPLOAD_FALHOU` | Erro no envio | Não conseguimos enviar o arquivo. Verifique sua conexão e tente novamente. |
| `SESSAO_EXPIRADA` | Token expirado | Sua sessão expirou. Entre novamente com sua conta Microsoft. |
| `SEM_PERMISSAO` | RLS/papel bloqueou | Você não tem acesso a este chamado. Se acha que isso é um erro, fale com a TI. |
| `CHAMADO_NAO_ENCONTRADO` | Número inexistente | Não encontramos o chamado **#{numero}**. Confira o número e tente de novo. |
| `TRANSICAO_INVALIDA` | Status não permitido | Não é possível mudar de **{de}** para **{para}**. |
| `MOTIVO_OBRIGATORIO` | Cancelar/transferir sem motivo | Informe o motivo para continuar. |
| `CANCELAMENTO_NAO_PERMITIDO` | Solicitante cancelando em atendimento | Esse chamado já está sendo atendido. Para cancelar, fale com a TI pelo chat. |
| `MENSAGEM_NAO_ENVIADA` | Falha no chat | Sua mensagem não foi enviada. Toque para tentar de novo. *(manter o texto)* |
| `SEM_CONEXAO` | Offline / Realtime caiu | Sem conexão. As mensagens novas vão aparecer quando a conexão voltar. |
| `ERRO_INESPERADO` | Qualquer outro | Algo deu errado do nosso lado. Tente novamente. Se continuar, informe o código **{ref}** para a TI. |

## 9. Segurança
Sem segredos no código (`.env` no `.gitignore`, `.env.example` vazio); secret scanning e push protection; secrets do
Actions por ambiente; front só com `anon key`, `service_role` só no back; 2FA na organização; tokens fine-grained;
`docs/segredos.md` com uso e validade de cada chave (client secrets do Azure vencem).

## 10. Estabilidade do banco
Plano Pro em produção, `sa-east-1`; backups diários e avaliação de PITR; **restore testado antes do go-live**;
projetos `dev` e `prod` separados; nunca migration direto em produção; Supavisor; RLS simples e indexado.

## 11. Documentação
`docs/` com README, arquitetura, banco, status, erros, segredos, runbooks, adr; `guia-usuario.md` de 1 página;
API documentada pelo OpenAPI da FastAPI.

## 12. Fases
- **Fase 1:** SSO, papéis, categorias e formulários dinâmicos, número sequencial, ciclo de vida completo, fila da TI,
  chat em tempo real, anexos (upload e colar), notificações no Teams, resposta automática do bot, catálogo de erros, docs base.
- **Fase 2:** SLA com pausa, prioridade, alertas de prazo, painel, pesquisa de satisfação, chamados recorrentes.
- **Fase 3:** abrir chamado pelo Teams, central de soluções, outras áreas, controle de equipamentos.
- **Futuro:** assistente com IA (classificação, resumo, sugestão de solução).

## 13. Critérios de pronto (Fase 1)
- [ ] Usuário entra com a conta Microsoft, abre um chamado e recebe o número e o aviso no Teams.
- [ ] Abrir o chamado de outra pessoa pela URL retorna `SEM_PERMISSAO`.
- [ ] Técnico assume, conversa, transfere (com motivo) e resolve; cada passo no histórico e com notificação.
- [ ] Solicitante cancela antes do atendimento (com motivo) e não consegue depois.
- [ ] Print colado com Ctrl+V aparece no chat e no formulário de abertura.
- [ ] Responder ao bot no Teams gera a resposta automática com o link do chamado.
- [ ] Todos os erros da seção 8 aparecem com a mensagem amigável correta.
- [ ] Um usuário não vê o chamado de outro (testado direto via API).
- [ ] Projeto Supabase de produção confirmado em `sa-east-1`.
