# Etapa 1A-3 — Experiência por perfil: portal do solicitante e área técnica

Substitui o antigo `1A-3-web-base.md` e reúne as partes de interface de `1B`, `1C` e `1D`.
As regras de API, banco e erros desses arquivos continuam valendo como referência, **exceto os status**:
valem os 6 status do `docs/adr/0005` e a tabela do `CLAUDE.md` (sem confirmar, reabrir ou fechamento automático).

**Dados:** as três entregas rodam com a **camada de dados simulada** (`docs/adr/0006`), sem Supabase e sem API.
Nenhuma tela acessa Supabase ou API diretamente: tudo por `lib/dados/`. A implementação `real` vem depois da 1A-2.
Onde este documento cita rotas de API (`POST /chamados`, `GET /me`...), na versão simulada elas são métodos da camada de dados
com o mesmo comportamento e os mesmos erros.

**Visual:** o mockup oficial está descrito em `docs/ui-ux.md` (com as adaptações ao ADR 0005). Em conflito de aparência, vale ele;
em conflito de regra de negócio, valem o `CLAUDE.md` e os ADRs.

**Execução:** três entregas, uma por sessão, cada uma com plano aprovado antes de codar.
Ordem: Entrega 1 → CI do front (parte da `1A-4`) → Entrega 2 → Entrega 3.

---

## Conceito

São duas experiências separadas no mesmo sistema. Quem entra cai direto na sua área.

| | Solicitante | Técnico (TI) |
|---|---|---|
| O que é | Um **portal simples**: abrir pedido e acompanhar | **Ferramenta de trabalho**: atender chamados |
| Entra em | `/` (Abrir chamado) | `/atendimento` (Fila) |
| Vê | Formulário · Meus chamados · Chat do próprio chamado | Fila · Meus atendimentos · Todos · Abrir chamado · Chat com notas internas |
| Não vê | Fila, outros chamados, notas internas, nada técnico | "Meus chamados" do portal do solicitante |
| Visual | Leve, poucos elementos, pensado para celular (obra) | Denso, tabelas, filtros, pensado para desktop |

A separação na interface é **experiência**, não segurança. A segurança continua no RLS e na API.

---

## Entrega 1 — Base do front e separação de perfis

1. **Projeto** `apps/web`, conforme o CLAUDE.md:
   - Next.js App Router, TypeScript strict, Tailwind, ESLint, Prettier, Vitest e pnpm;
   - `@supabase/ssr` só com a anon key;
   - `lib/api.ts` com tratamento de erros pelo catálogo.

2. **Camada de dados** `lib/dados/` (ADR 0006): interface `FonteDeDados` + implementação `simulada`
   (dados de exemplo baseados no `supabase/seed.sql`, `localStorage`, `BroadcastChannel` entre abas).
   Seleção por `NEXT_PUBLIC_FONTE_DADOS`; build de produção falha com `simulada`.

3. **Login:**
   - Versão simulada: tela "Entrar como" com Ana, Bruno e Técnico.
   - Versão real (depois): botão "Entrar com a conta Microsoft"; login dev por e-mail e senha só com `NEXT_PUBLIC_LOGIN_DEV=true`;
     depois do login `POST /auth/sincronizar` e `GET /me`.

4. **Roteamento por papel.** O papel vem sempre de `GET /me` ou do banco (`profiles.papel` sob RLS),
   **nunca** de dado editável no cliente. Na versão simulada, vem de uma lista fixa de usuários no servidor (ADR 0006).
   ```
   app/
     (solicitante)/            layout leve
       page.tsx                  /                  → Abrir chamado
       meus-chamados/page.tsx    /meus-chamados
       meus-chamados/[id]/       /meus-chamados/42
     (tecnico)/                layout de trabalho
       atendimento/page.tsx      /atendimento       → Fila
       atendimento/novo/         /atendimento/novo  → Abrir chamado (mesmo formulário do portal)
       atendimento/[id]/         /atendimento/42
     chamados/[id]/route.ts    /chamados/42 → link universal
     login/ · auth/callback/ · primeiro-acesso/ · sem-acesso/
     not-found.tsx · error.tsx
   ```
   - **Link universal `/chamados/42`**: é o link usado nos avisos do Teams. Redireciona o solicitante para `/meus-chamados/42` e a TI para `/atendimento/42`.
   - **`proxy.ts`** (no Next.js 16 o `middleware.ts` passou a se chamar `proxy.ts`):
     - sem sessão → `/login`;
     - solicitante em `/atendimento/*` → `/sem-acesso`;
     - TI no portal do solicitante → `/atendimento`.
   - Solicitante abrindo `/meus-chamados/{n}` de outra pessoa ou inexistente → mesma tela de `SEM_PERMISSAO`, para não revelar quais números existem.

5. **Primeiro acesso.** Pede departamento e telefone uma única vez, só para solicitantes. A TI pula essa etapa.

6. **Layouts:**
   - Solicitante: cabeçalho com logo DOMMA, "Abrir chamado", "Meus chamados", nome e sair.
   - TI: barra com Fila · Meus atendimentos · Todos · **Abrir chamado**, contadores, nome e sair.

7. **Base visual:**
   - tokens de cor em variáveis CSS, fáceis de trocar pelo padrão do Cadastro de Insumos depois;
   - componentes `Botao`, `Campo`, `Toast`, `Modal`, `BadgeStatus` e `Card`;
   - contraste AA e alvos de toque de pelo menos 44px.

8. **Rótulos de status por perfil**, em `lib/status.ts`:

   | Status | Solicitante vê | TI vê |
   |---|---|---|
   | pendente | Pendente | Pendente |
   | em_andamento | Em andamento | Em andamento |
   | aguardando_usuario | **Aguardando sua resposta** (destaque) | Aguardando usuário |
   | transferido | Em andamento | Transferido |
   | concluido | Concluído | Concluído |
   | cancelado | Cancelado | Cancelado |

**Aceite:**
- Ana (solicitante) cai em `/`; Técnico cai em `/atendimento`.
- Cada um é barrado na área do outro.
- `/chamados/42` leva cada um para a tela certa.
- Testes do proxy (regra em `lib/rotas.ts`), de `lib/status.ts` e da camada simulada.
- Roda com `pnpm dev` sem Supabase, Docker ou API.

---

## Entrega 2 — Portal do solicitante

Inclui as rotas de API de 1B e 1C que o solicitante usa:
- `POST /chamados` e `POST /chamados/{id}/cancelar`;
- mensagens e anexos;
- a transição automática `aguardando_usuario` → `em_andamento` quando o solicitante responde no chat.

### `/` — Abrir chamado (fluxo em 3 passos, uma pergunta por tela)
O mesmo componente é usado pela TI em `/atendimento/novo` (o técnico vira o solicitante do chamado).

1. **"Com o que você precisa de ajuda?"**
   - Cards de categoria com ícone, nome e descrição curta, ordenados por `ordem`.
   - "Não encontrou? Escolha **Outros**".
2. **Formulário:**
   - "Resumo do problema" (vira o título).
   - Campos dinâmicos de `campos_form`.
   - Área de anexos com botão, arrastar-e-soltar e **Ctrl+V**.
   - Validação inline pelo catálogo.
   - Botão "Voltar" mantém o que já foi digitado.
3. **Confirmação:**
   - "Pronto! Seu chamado é o **#42**."
   - "Previsão de atendimento: até 06/10 às 11:00."
   - "Você vai receber avisos no Teams."
   - Botões: [Acompanhar meu chamado] e [Abrir outro pedido].

Se houver algum chamado em `aguardando_usuario`, mostrar no topo da página: "O técnico está esperando sua resposta no chamado #42 → Responder".

### `/meus-chamados`
- Abas **Em andamento** / **Encerrados** (concluídos e cancelados).
- Cards com:
  - número, título, rótulo do status e "atualizado há 2h";
  - selo **"Nova mensagem"** quando houver mensagem da TI não lida.
- Realtime: o status e o selo atualizam sozinhos.
- **Não lidas.** Para o selo funcionar, criar uma migration nova `chamado_leituras` (`chamado_id`, `profile_id`, `lido_ate`), com RLS para o próprio usuário, grants e teste pgTAP. Abrir o chamado marca como lido.

### `/meus-chamados/[id]` — o chat é o centro da tela
- **Topo:**
  - "Chamado #42", título e rótulo de status;
  - barra de progresso: **Pendente → Em andamento → Concluído**, com destaque quando estiver "Aguardando sua resposta";
  - nome do técnico responsável e previsão.
- **Centro:** chat em tempo real com anexos e Ctrl+V. Nunca recebe notas internas.
- **"Detalhes do pedido"** (recolhível): respostas do formulário, arquivos enviados e linha do tempo pública.
- **Cancelar** aparece só em Pendente, sempre pedindo motivo.
- **Concluído ou cancelado:** tudo somente leitura, com o aviso
  "Este chamado foi encerrado. O problema voltou ou precisa de algo? [Abrir novo pedido]".
  O novo pedido já vem com "Referente ao chamado #42" no resumo. Não há confirmação nem reabertura (ADR 0005).

**Mobile-first.** Tudo precisa funcionar bem num celular de 360px de largura.

**Aceite:**
- Ana abre um chamado pelo celular colando um print.
- Ela acompanha o chamado e conversa com o técnico.
- Ela vê o selo de nova mensagem.
- Ela responde em "Aguardando sua resposta" e o status volta para "Em andamento" sozinho.
- Ela cancela em Pendente e não consegue cancelar depois (`CANCELAMENTO_NAO_PERMITIDO`).
- Testes de componente do fluxo de 3 passos e do chat (envio, falha com retry mantendo o texto, offline).

---

## Entrega 3 — Área técnica

Inclui as rotas de transição de 1B usadas pela TI e a fila de 1D:
assumir, transferir, devolver à fila, aguardar usuário, concluir e cancelar.

### `/atendimento` — Fila
- **Abas e contadores:**
  - **Fila**: chamados `pendente` (sem responsável);
  - **Meus atendimentos**: responsável = eu, não encerrados (inclui os transferidos para mim);
  - **Todos**;
  - contador de **vencidos**.
- **Filtros** refletidos na URL: status, categoria, responsável, prazo e período.
- **Busca:** `42` ou `#42` abre o chamado direto; texto busca no título.
- **Tabela:** número, título, solicitante (nome e departamento), categoria, status, responsável, aberto há e prazo.
  - Ordenada pelo prazo mais próximo.
  - Vencido em vermelho; perto de vencer (menos de 20% do SLA) em âmbar.
- **Ações rápidas:** [Assumir] na linha e menu com Transferir, Devolver à fila e Cancelar.
- **Realtime:** chamado novo entra na lista com destaque.

### `/atendimento/[id]` — duas colunas
- **Esquerda: chat.**
  - Seletor **Resposta ao solicitante / Nota interna**.
  - Notas internas com fundo âmbar e a etiqueta "Só a TI vê".
  - Anexos e Ctrl+V.
- **Direita: painel.**
  - Solicitante: nome, departamento, telefone e e-mail.
  - Status e prazo.
  - Ações disponíveis, vindas de `GET /chamados/{id}/acoes`.
  - Respostas do formulário e arquivos.
  - Histórico completo, incluindo transferências e devoluções com motivo.
- **Modais:**
  - Transferir: escolher técnico, com motivo;
  - Devolver à fila: motivo (limpa o responsável);
  - Cancelar: motivo;
  - Concluir: só confirmação, sem mensagem automática (inclusive a partir de "Aguardando usuário" sem resposta).

**Aceite:**
- O técnico assume pela fila, conversa (com nota interna que a Ana não vê), coloca em "Aguardando usuário",
  transfere com motivo e conclui.
- Outro técnico devolve à fila um chamado transferido que ninguém assumiu.
- Tudo aparece no histórico e gera notificação pendente.
- Busca por `42` funciona.
- Testes de API de cada ação, incluindo tentativa com token de solicitante (`SEM_PERMISSAO`).

---

## Atualização pelo mockup (2026-10-05)

A base visual (cores, fontes IBM Plex, ícones, cascas das duas áreas, componentes e rótulos) foi feita numa etapa
própria de UI/UX antes da Entrega 2. Mudanças em relação ao texto acima:

- **Rótulos:** solicitante vê Recebido · Em atendimento · Aguardando sua resposta · Concluído · Cancelado;
  TI vê Novo · Em atendimento · Aguardando usuário · Transferido · Concluído · Cancelado. Barra de progresso:
  Recebido → Em atendimento → Concluído.
- **Entrega 2 (portal):** busca de assunto no passo 1; categorias com ícone e nome curto (migration 0016);
  `selecao` como cartões de rádio; previsão de atendimento exibida **antes** de enviar (rodapé do passo 2);
  menu inferior no celular com contador; cartões de "Meus chamados" com a informação do canto
  ("• Nova mensagem", "Previsão: hoje, 11:30", "Com Rafael Lima"); eventos do sistema dentro do chat
  ("Rafael Lima assumiu o chamado · 09:40").
- **Entrega 3 (técnico):** modo **Quadro** (colunas Novos · Em atendimento · Aguardando usuário, "Ver encerrados")
  e modo **Lista**; faixa "Próximo da fila" com **Pegar o próximo**; **arrastar para assumir**; filtros
  Todos · Só os meus · Sem responsável · categoria · prazo; destaque **vence em menos de 1 h** (substitui 20% do SLA);
  selo "Transferido para você · por Thiago"; ação **Retomar atendimento** (aguardando_usuario → em_andamento);
  botão "Marcar como concluído"; no celular, abas Conversa · Detalhes · Histórico.
- **Só o quadro (kanban)** na área técnica (decisão do dono, 2026-10-06): sem modo Lista. Busca por texto filtra o quadro;
  "Ver encerrados" abre `/atendimento/encerrados` (cartões, só consulta).
