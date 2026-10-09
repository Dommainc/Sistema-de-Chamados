# UI/UX — Central de Chamados

Referência visual oficial: `docs/ui/central-chamados-ui-ux.pdf` (9 telas, enviado pelo dono em 2026-10-05).
Este documento descreve o mockup em texto e registra **onde a implementação difere dele de propósito**.
Em conflito: regras de negócio do `CLAUDE.md`/ADRs > este documento > PDF.

## Adaptações ao ADR 0005 (decididas em 2026-10-05)

O mockup foi desenhado com o fluxo antigo (Resolvido + confirmação + fechamento automático). Valem os 6 status do ADR 0005:

| No mockup | Na implementação |
|---|---|
| Barra de progresso Recebido → Em atendimento → Resolvido → Encerrado | **Recebido → Em atendimento → Concluído** (3 passos) |
| Card "#35 · Deu certo? Confirme · Resolvido" | Não existe. Concluído vai para a aba Encerrados |
| Coluna "Resolvidos · Falta o solicitante confirmar" / "Fecha sozinho em 2 dias úteis" | Vira **"Concluídos"** (pedido do dono, 2026-10-06): concluídos dos **últimos 7 dias**, só leitura, sem confirmação nem fechamento automático. Arrastar para ela conclui (com confirmação). Cancelados e mais antigos: "Ver encerrados" |
| Botão "Marcar como resolvido" / "Resolver" | **"Marcar como concluído"** (desktop) / **"Concluir"** (celular) |
| Painel do técnico: "Contato: Ramal" | **"Falar no Teams"** (link que abre o chat do Teams com o solicitante) e e-mail. O primeiro acesso **não pede telefone** (ajuste do Renato, 2026-10-08) |
| Alternância "Quadro \| Lista" na barra escura | **Só o quadro (kanban)** — decisão do dono em 2026-10-06. Busca por texto filtra o quadro; "Ver encerrados" é uma página de cartões só para consulta |
| Destaque "perto de vencer" | **Menos de 1 h** para o prazo (mockup) — substitui os "20% do SLA" da 1A-3 |

## Chat no estilo dos apps de mensagem (pedido do dono, 2026-10-06)

Vale para as telas 5, 7 e 9 (substitui o "nome · hora embaixo do balão" do mockup):
- **Hora dentro do balão**, no canto de baixo à direita (ou "Enviando..." / "não enviada").
- **Mensagens seguidas da mesma pessoa** ficam agrupadas (quase coladas); entre pessoas diferentes, mais espaço.
- **"Pontinha"** do balão e **nome do autor** (dentro do balão, ex.: "Rafael Lima · TI") só no primeiro do grupo;
  as minhas não mostram nome.
- **Anexos dentro do balão**, acima do texto.
- Notas internas **não aparecem no chat**: ficam na aba **Relato técnico** da tela de atendimento (2026-10-06).
- Cores do mockup mantidas: minhas em azul à direita, dos outros em branco à esquerda; eventos do sistema em pílula.

## Fundamentos

### Cores (tokens em `apps/web/app/globals.css`)
| Token | Uso | Valor |
|---|---|---|
| `fundo` | Fundo das páginas (bege claro) | `#F2F0EB` |
| `superficie` | Cartões, cabeçalho do portal | `#FFFFFF` |
| `borda` | Bordas de cartões e campos | `#DCD8CF` |
| `texto` / `texto-suave` | Texto principal / secundário | `#1A1C20` / `#5E626A` |
| `primaria` (+ `forte`, `suave`) | Azul-marinho: botões principais, links, bolha do autor | `#1F4E8C` / `#173D6E` / `#E7EDF5` |
| `barra` | Barra superior da área técnica e botão "Iniciar" | `#16181C` |
| `sucesso` (+ `suave`) | "Concluir", passo concluído, prazo ok | `#1E6B3C` / `#E3F0E7` |
| `alerta` (+ `suave`, `borda`) | "Aguardando sua resposta", nota interna, vence em < 1 h | `#7A4A00` / `#FCF0DA` / `#E5B866` |
| `laranja` | Contador do menu ("1") e barra de "vence em breve" | `#C2570C` |
| `perigo` (+ `suave`) | Prazo vencido, "Cancelar chamado" | `#B42318` / `#FBE8E6` |
| `roxo` (+ `suave`) | Selo "Transferido para você" | `#5B3FA0` / `#EEE8FA` |

### Tipografia
- **IBM Plex Sans** (texto) e **IBM Plex Mono** (números de chamado: "Chamado #41", "Nº 36").
- Títulos de página 28–32 px semibold; títulos de cartão 16–17 px semibold; apoio 14 px `texto-suave`.

### Forma
- Cartões: fundo branco, borda `borda`, cantos 12–14 px, sombra leve.
- Botões e campos: altura mínima 44 px (alvo de toque), cantos 10–12 px.
- Ícones: `lucide-react`, traço fino, dentro de quadrado `primaria-suave` nos cartões de categoria.

### Status (rótulos em `apps/web/lib/status.ts`)
| Status | Solicitante | TI | Cor |
|---|---|---|---|
| pendente | Recebido | Novo | cinza |
| em_andamento | Em atendimento | Em atendimento | azul |
| aguardando_usuario | **Aguardando sua resposta** (destaque) | Aguardando usuário | âmbar |
| transferido | Em atendimento | Transferido | azul / roxo |
| concluido | Concluído | Concluído | verde |
| cancelado | Cancelado | Cancelado | cinza apagado |

### Prazo (`apps/web/lib/prazo.ts`) — definido pela TI (ADR 0009, mudança do dono em 2026-10-07)
- **Vencido** (vermelho): "Venceu há 3 h". **Vence em < 1 h** (laranja/âmbar): "Vence em 50 min".
  **No prazo** (verde): "Hoje, 11:30" · "Amanhã, 17:00" · "13/10, 09:00".
  **Sem prazo** (cinza): "Sem prazo" — o chamado nasce assim; a TI define quando quiser.
- Barra fina abaixo do prazo = fração do tempo já consumido (abertura → prazo).

## Portal do solicitante (celular primeiro)

**Casca:** cabeçalho branco com "DOMMA" (espaçado, negrito) / "Central de Chamados" e avatar com iniciais (menu: nome, Sair).
**Menu inferior** fixo no celular: Abrir chamado · Meus chamados (contador laranja = chamados aguardando resposta).
No computador (pedido do dono, 2026-10-05) o portal usa a largura da tela (até ~1150 px): o menu vai para o cabeçalho;
categorias em 3–4 colunas; "Meus chamados" em 2 colunas; passo 2 com o formulário à esquerda e um painel fixo à direita
(assunto e previsão; o botão **"Enviar chamado"** fica no fim do formulário (ajuste do Renato, 2026-10-08)); chamado com o chat à esquerda e um painel à direita (andamento, técnico, previsão,
detalhes do pedido sempre abertos, cancelar). Login, primeiro acesso e confirmação seguem centralizados.

0. **Primeiro acesso** (`/primeiro-acesso`): **"Olá, Ana!"**, "Antes de começar, conte em que setor você trabalha.",
   só o campo Departamento (sem telefone) (ajuste do Renato, 2026-10-08). Lista de setores do RH: P-041.
1. **Abrir chamado — Passo 1 de 3** (`/`)
   - Aviso âmbar no topo se houver chamado aguardando resposta: ícone de balão, "O técnico está esperando sua resposta",
     "Chamado #41 · título", link "Responder".
   - "Passo 1 de 3", título "Com o que você precisa de ajuda?", apoio "Escolha o assunto." (sem "Na dúvida, use Outros" (ajuste do Renato, 2026-10-08))
   - **Sem busca de assunto** (pedido do dono, 2026-10-08): são só 4 assuntos.
   - Grade (3 colunas no computador, 1 no celular): ícone + **nome curto** — Solicitações de acesso e Permissões ·
     Infraestrutura · Microsoft; "Outros pedidos para a TI" ocupa a linha inteira, no fim.
2. **Passo 2 de 3**
   - Topo: "‹ Voltar" e "Passo 2 de 3". Selo com a categoria (sem "Trocar assunto": o Voltar já faz isso — dono, 2026-10-08).
   - Título "Conte o que está acontecendo". "Resumo do problema *" com ajuda abaixo ("Uma frase curta. Ex.: …").
   - Campos dinâmicos: `selecao` vira **cartões de opção (rádio)**; texto e texto longo como campos normais.
   - "Fotos e arquivos (opcional)": área tracejada com câmera, "Tirar foto ou anexar arquivo",
     "No computador: cole um print com Ctrl+V"; lista de arquivos com miniatura, nome, tamanho e remover (×).
   - Botão **"Enviar chamado"** no **fim do formulário**, abaixo do último campo (ajuste do Renato, 2026-10-08). No computador, o resumo
     lateral diz "Previsão de conclusão: **Aguardando análise da TI**" (não há previsão automática — ADR 0009).
   - Opções de "Qual sistema?" **sem cores** no formulário (ajuste do Renato, 2026-10-08); as cores ficam só na área da TI.
3. **Passo 3 de 3 — confirmação**
   - Círculo verde com ✓, "Pronto! Seu chamado é o", **#42** grande em azul, título do chamado.
   - Cartão: "Previsão de conclusão · **Aguardando análise da TI**" e "Você vai receber avisos no **Teams** quando o técnico iniciar o atendimento ou responder."
   - Botões no rodapé: [Acompanhar meu chamado] (azul) e [Abrir outro chamado] (contorno).
4. **Meus chamados** (`/meus-chamados`)
   - Seletor "Em andamento (4) | Encerrados".
   - Cartão: "#41" (mono, cinza) · à direita a informação mais útil ("• Nova mensagem", "Previsão: hoje, 11:30",
     "Com Rafael Lima"); título; selo de status; à direita "há 12 min" / "ontem".
   - Cartão aguardando resposta tem borda âmbar.
5. **Chamado** (`/meus-chamados/41`)
   - "‹ Meus chamados", "Chamado #41" (mono), título, barra de progresso de 3 passos (concluído = ✓ verde; atual = ponto laranja).
   - Aviso âmbar: "Rafael está esperando sua resposta. Responda abaixo para ele continuar."
   - "Técnico: **Rafael Lima**" · "Previsão: **hoje, 14:00**" (sem prazo: "Previsão: **aguardando análise da TI**").
     Na conversa, pílula "Previsão de conclusão: 08/10/2026 18:00" (ou "alterada para …: motivo"). Link "Ver detalhes do pedido" (abre respostas do formulário e arquivos).
   - Chat: separador "Hoje"; mensagens do solicitante em bolha azul à direita; da TI em bolha branca à esquerda com
     "Rafael Lima · TI · 09:52"; eventos do sistema em pílula cinza centralizada ("Rafael Lima iniciou o atendimento · 09:40");
     anexos como miniatura.
   - Rodapé: clipe, campo "Escreva sua resposta...", botão redondo azul de enviar.

## Área técnica (computador primeiro)

**Casca:** barra escura `barra`: "DOMMA Atendimento TI", busca "Buscar #número ou título",
avatar + nome + "3 em atendimento". No celular: barra escura com busca abaixo.

6. **Quadro** (`/atendimento`)
   **Revisão do dono (2026-10-07)** — cartões estavam "confundíveis": a data solta não dizia que era prazo, todos os
   cartões eram iguais em qualquer coluna e o responsável era só uma bolinha "RL". Mudou:
   **Terceira revisão (2026-10-07)** — a cor do cartão passou a ser a do **STATUS**; o prazo só colore o retângulo dele.
   **Revisão de 2026-10-08** (ADR 0014): sem faixa "Próximo da fila", sem legenda de cor do status, sem "Iniciar" no
   cartão, colunas na ordem abaixo e **todas da mesma largura**.
   - **Filtros** (na URL): **Status** (só a coluna escolhida) · **Pessoa atendendo** (Qualquer pessoa · Eu · Ninguém ainda ·
     cada técnico) · Categoria · **Sistema** ("Qualquer sistema" + os sistemas de "Qual sistema?"; o escolhido mostra o
     quadradinho da cor) · Prazo. **Legenda**: só a dos retângulos de prazo.
   - **Seis colunas** da mesma largura, em raias com fundo próprio; a bolinha do título tem a cor do status:
     **Novos** (laranja) · **Em atendimento** (amarelo forte) · **Aguardando usuário** (azul royal; apoio "Vai para cá
     sozinho após 2 h úteis sem resposta do solicitante") · **Concluídos** (verde) · **Transferidos** (roxo) ·
     **Cancelados** (cinza). Abaixo de ~1280 px, rolagem lateral.
   - **Cartão**: faixa grossa à esquerda (fundo branco) na **cor do status** (muda junto com o status; tokens `laranja`,
     `roxo`, `amarelo`, `royal`, `sucesso`, `apagado`); etiqueta **"ID 36"** em **caixa clarinha neutra** (`superficie-2`, texto escuro — dono, 2026-10-09: o número é referência, as cores fortes ficam para status, prazo e prioridade);
     em cima a **prioridade** ("⚠ Prioridade alta" vermelho · "Prioridade média" amarelo · "Prioridade baixa" cinza), "NOVO" (só em Novos, nas primeiras 24 h depois de aberto) e
     "Transferido para você · por Thiago"; **título em destaque**; "solicitante · categoria"; o que importa
     na coluna (Em atendimento e Aguardando → **bolinha com as iniciais** de quem atende, o nome no passar do mouse; Aguardando → "⌛ Esperando **Ana** há 2h"); **retângulo do prazo**
     (🔴 "Venceu há 3 h" · 🟠 "Vence em 49 min" · 🟡 "Sem prazo" · neutro "Prazo: amanhã, 14:00"); ao lado do prazo, **■ sistema** (Sienge, CVCRM...; "Não se aplica" não
     aparece no cartão); 💬 mensagens novas. **Sem botão Iniciar** (inicia-se dentro do chamado ou arrastando).
   - Cartão encerrado (Concluídos/Cancelados): "ID 30", título, "Concluído em 05/10 às 14:30" (sem o nome) ou
     "Cancelado em 03/10 às 10:00" + o motivo. Só leitura.
   - Arrastar: Novos/Transferidos → Em atendimento (**iniciar**), Em atendimento/Aguardando → Transferidos
     (**transferir**: técnico + motivo), → Concluídos (confirma) e → Cancelados (motivo). Para Aguardando usuário e de
     volta para Novos **não vale** (ADR 0014).
   - **Sistema** (categoria de acessos): selo com o nome na cor do sistema (Sienge vermelho · CVCRM verde claro ·
     Construpoint vermelho claro · Construmanager vermelho escuro · Docusign azul escuro · Prevision roxo · Metadados azul
     claro · Não se aplica cinza; tokens `sis-*`, `lib/sistemas.ts`). Só na área da TI: o formulário não tem cores (ajuste do Renato, 2026-10-08).
   - **Fundo do cartão branco**, só com a faixa grossa na cor do status (teste do dono, 2026-10-07).
   - **Prioridade alta**: o cartão sobe para o topo da coluna e mostra o selo vermelho **"⚠ Prioridade alta"** (ADR 0012).
7. **Atendimento** (`/atendimento/41`) — **reorganizada a pedido do dono (2026-10-07)**: antes a direita tinha 5 cartões
   empilhados, a descrição e o print se repetiam e as ações tinham tamanhos diferentes.
   - **Cabeçalho-resumo** (cartão no topo): "‹ Quadro", "#41 título" + selo de status e, à direita, as **ações**:
     **Iniciar**, ou **Marcar como concluído** (verde) · **Transferir** (contorno) · **Cancelar chamado** (texto
     vermelho), todas à vista — sem "⋯ Mais ações" (ADR 0014). Abaixo, quatro blocos: **SOLICITANTE**
     (avatar, nome, departamento, e-mail e **"Falar no Teams"**), **RESPONSÁVEL** (+ "Aberto em"), **PRAZO** (colorido,
     link **Definir prazo** / **Alterar prazo** — a janela tem atalhos Hoje 18h · Amanhã 12h · Amanhã 18h · Em 3 dias
     úteis, campo de data e hora e, ao alterar, o motivo), **PRIORIDADE** (botões Alta vermelho · Média amarelo ·
     Baixa cinza; só TI) e **CATEGORIA**. **Não iniciado** (novo/transferido): faixa laranja "Chamado ainda não
     iniciado…", prazo e prioridade travados, conversa e relato com "Inicie o chamado para…" — só Iniciar ou Cancelar.
   - Esquerda — conversa **ocupando a altura da tela** (só as mensagens rolam; o campo de escrever fica sempre à
     vista). Eventos do sistema em **texto pequeno e cinza** (sem pílula); só o separador de dia fica em pílula.
     Duas abas (**mudança do dono, 2026-10-06**, no lugar do seletor "Responder à Ana | Nota interna",
     para os analistas não confundirem resposta com anotação):
     - **Conversa com a Ana** — só a conversa com o solicitante: eventos do sistema em pílula, respostas do técnico
       em bolha azul à direita; campo "Escreva para a Ana... (Ctrl+V cola prints)", clipe, Enviar.
       Botão **Respostas prontas** (ícone de balão com linhas, ao lado do clipe — só a TI, só na conversa): abre a lista
       (título + texto); escolher coloca o texto no campo, com `{nome}` trocado pelo primeiro nome do solicitante. A TI
       revisa e envia — **nada sai sozinho**. A lista vem do banco (`respostas_prontas`).
     - **Relato técnico** (com contador) — diário só da TI: faixa âmbar "🔒 Só a TI vê o relato técnico";
       anotações em cartão com borda âmbar à esquerda, autor e data/hora (não se editam nem se apagam), prints com
       Ctrl+V; transferências e devoluções à fila com o motivo. Campo "Anote o que foi verificado ou feito...",
       botão "Adicionar ao relato". Encerrado → só consulta. Por baixo continuam sendo as notas internas
       (`mensagens.interna`), protegidas pelo RLS.
   - Direita (estreita): **PEDIDO** só com as respostas que não estão na conversa (ex.: "Quem está sem conexão",
     "Onde você está"; a descrição e os arquivos já são a 1ª mensagem) e **HISTÓRICO (n)** recolhido (clique abre).
   - **Implementação:** em "Novos", os vencidos vêm primeiro, depois os "Transferido para você", depois o resto
     (com prazo pelo mais próximo; sem prazo pelo mais antigo — `compararPrazo`);
     arrastar com **mouse, dedo (segurar ~0,25 s) ou teclado** (espaço + setas) — ADR 0010; ao levar até a borda a tela
     rola sozinha, devagar; o quadro é a visão padrão de `/atendimento`.
8. **Quadro no celular** — *implementação (2026-10-06):* as colunas ficam sempre lado a lado (kanban) e desliza-se para o lado;
   as pílulas viram atalho para pular até a coluna. Vale para qualquer tela abaixo de ~1024 px (janela estreita, zoom).
   Mockup original: "Próximo da fila" + "Pegar o próximo" (saiu em 2026-10-08); colunas viram pílulas roláveis (Novos 8 · Em atendimento 3 · Aguardando 2) + "Filtros".
9. **Atendimento no celular** (*2026-10-07*): o mesmo cabeçalho-resumo, compacto — botões **Concluir · Transferir ·
   Cancelar chamado**; solicitante na linha toda e prazo/responsável lado a lado; abas **Conversa · Detalhes · Histórico**.
10. **Dashboard** (`/atendimento/dashboard`, *2026-10-08 — ADR 0013*): botão **"📊 Dashboard"** na barra escura, ao lado da
    busca (no celular, ao lado da busca na segunda linha; destacado quando a página está aberta). Título "Dashboard",
    "De 09/09/2026 a 08/10/2026 · tempos em horas úteis", seletor **7 dias · 30 dias · Este mês · Mês passado ·
    Escolher datas** (padrão 30 dias; no celular rola de lado). Quatro seções:
    - **Resumo**: 7 cartões — Abertos agora · Vencidos agora (vermelho se > 0) · Abertos no período · Concluídos no
      período · Tempo médio até iniciar · Tempo médio até concluir · Concluídos no prazo (% e "7 de 9 com prazo").
    - **Volume**: barras de "Chamados abertos por dia" e três rankings com barra (por categoria, sistema, departamento).
    - **Equipe**: tabela por técnico — concluídos, em atendimento agora, tempo médio até concluir, transferiu, recebeu.
    - **Prazo e espera**: % no prazo por categoria (barra verde sobre vermelho-claro), concluídos sem prazo, em
      atendimento sem prazo (âmbar se > 0), tempo médio aguardando o usuário e os últimos cancelamentos com motivo.
11. **Pesquisa de satisfação** (*2026-10-09 — ADR 0015*):
    - **Solicitante, chamado concluído:** acima de "Este chamado foi encerrado.", **"Como foi o atendimento?"** com 5
      estrelas grandes (amarelo; o nome da nota aparece embaixo: Péssimo · Ruim · Regular · Bom · Ótimo). Depois de
      escolher: campo "Quer deixar um comentário? (opcional)" — com 1 ou 2 estrelas vira **"Conte o que podemos
      melhorar \*"** — e **"Enviar avaliação"**. Enviada: "Sua avaliação" + estrelas + texto.
    - **Meus chamados:** concluído sem nota → "★ Avalie o atendimento" no canto do cartão; aba "Encerrados (1 para avaliar)".
    - **TI, chamado concluído:** bloco **Avaliação** à direita (estrelas, texto, quem avaliou e quando, ou "O solicitante
      ainda não avaliou").
    - **Dashboard:** cartão **Satisfação média** (★ 4,1 · n avaliações · % dos concluídos) com "Ver todas as avaliações";
      coluna **Nota média** (★ 4,5 (n)) na tabela da Equipe.
    - **Avaliações** (`/atendimento/avaliacoes`): "‹ Dashboard", média e total, filtros Período · Técnico · Nota, cartões
      em 2 colunas com estrelas, "#30 título", comentário ("Sem comentário."), "avaliador · atendido por … · data".

## Fora do mockup (manter simples, no mesmo estilo)
Login, primeiro acesso, sem acesso, 404, erro inesperado, modais (transferir, cancelar, concluir), "Ver encerrados".
