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
| Coluna "Resolvidos · Falta o solicitante confirmar" / "Fecha sozinho em 2 dias úteis" | Não existe. Quadro: Novos · Em atendimento · Aguardando usuário (+ "Ver encerrados") |
| Botão "Marcar como resolvido" / "Resolver" | **"Marcar como concluído"** (desktop) / **"Concluir"** (celular) |
| Painel do técnico: "Contato: Ramal" | **"Telefone"** (o primeiro acesso pede telefone/celular) |
| Destaque "perto de vencer" | **Menos de 1 h** para o prazo (mockup) — substitui os "20% do SLA" da 1A-3 |

## Fundamentos

### Cores (tokens em `apps/web/app/globals.css`)
| Token | Uso | Valor |
|---|---|---|
| `fundo` | Fundo das páginas (bege claro) | `#F2F0EB` |
| `superficie` | Cartões, cabeçalho do portal | `#FFFFFF` |
| `borda` | Bordas de cartões e campos | `#DCD8CF` |
| `texto` / `texto-suave` | Texto principal / secundário | `#1A1C20` / `#5E626A` |
| `primaria` (+ `forte`, `suave`) | Azul-marinho: botões principais, links, bolha do autor | `#1F4E8C` / `#173D6E` / `#E7EDF5` |
| `barra` | Barra superior da área técnica e botão "Assumir" | `#16181C` |
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

### Prazo (`apps/web/lib/prazo.ts`)
- **Vencido** (vermelho): "Venceu há 3 h". **Vence em < 1 h** (laranja/âmbar): "Vence em 50 min".
  **No prazo** (verde): "Hoje, 11:30" · "Amanhã, 17:00" · "13/10, 09:00".
- Barra fina abaixo do prazo = fração do tempo já consumido (abertura → prazo).

## Portal do solicitante (celular primeiro)

**Casca:** cabeçalho branco com "DOMMA" (espaçado, negrito) / "Central de Chamados" e avatar com iniciais (menu: nome, Sair).
**Menu inferior** fixo no celular: Abrir chamado · Meus chamados (contador laranja = chamados aguardando resposta).
No computador o menu vai para o cabeçalho e o conteúdo fica centralizado (largura de celular grande).

1. **Abrir chamado — Passo 1 de 3** (`/`)
   - Aviso âmbar no topo se houver chamado aguardando resposta: ícone de balão, "O técnico está esperando sua resposta",
     "Chamado #41 · título", link "Responder".
   - "Passo 1 de 3", título "Com o que você precisa de ajuda?", apoio "Escolha o assunto. Na dúvida, use **Outros**."
   - Busca "Buscar assunto (ex.: senha, impressora)" filtrando as categorias.
   - Grade de 2 colunas: ícone + **nome curto** da categoria. "Outros pedidos para a TI" ocupa a linha inteira, no fim.
2. **Passo 2 de 3**
   - Topo: "‹ Voltar" e "Passo 2 de 3". Selo com a categoria + link "Trocar assunto".
   - Título "Conte o que está acontecendo". "Resumo do problema *" com ajuda abaixo ("Uma frase curta. Ex.: …").
   - Campos dinâmicos: `selecao` vira **cartões de opção (rádio)**; texto e texto longo como campos normais.
   - "Fotos e arquivos (opcional)": área tracejada com câmera, "Tirar foto ou anexar arquivo",
     "No computador: cole um print com Ctrl+V"; lista de arquivos com miniatura, nome, tamanho e remover (×).
   - Rodapé fixo: "🕒 Previsão de atendimento: **hoje, até 11:30**" + botão principal de enviar.
3. **Passo 3 de 3 — confirmação**
   - Círculo verde com ✓, "Pronto! Seu chamado é o", **#42** grande em azul, título do chamado.
   - Cartão: "Previsão de atendimento · Hoje, até 11:30" e "Você vai receber avisos no **Teams** quando o técnico assumir ou responder."
   - Botões no rodapé: [Acompanhar meu chamado] (azul) e [Abrir outro pedido] (contorno).
4. **Meus chamados** (`/meus-chamados`)
   - Seletor "Em andamento (4) | Encerrados".
   - Cartão: "#41" (mono, cinza) · à direita a informação mais útil ("• Nova mensagem", "Previsão: hoje, 11:30",
     "Com Rafael Lima"); título; selo de status; à direita "há 12 min" / "ontem".
   - Cartão aguardando resposta tem borda âmbar.
5. **Chamado** (`/meus-chamados/41`)
   - "‹ Meus chamados", "Chamado #41" (mono), título, barra de progresso de 3 passos (concluído = ✓ verde; atual = ponto laranja).
   - Aviso âmbar: "Rafael está esperando sua resposta. Responda abaixo para ele continuar."
   - "Técnico: **Rafael Lima**" · "Previsão: **hoje, 14:00**". Link "Ver detalhes do pedido" (abre respostas do formulário e arquivos).
   - Chat: separador "Hoje"; mensagens do solicitante em bolha azul à direita; da TI em bolha branca à esquerda com
     "Rafael Lima · TI · 09:52"; eventos do sistema em pílula cinza centralizada ("Rafael Lima assumiu o chamado · 09:40");
     anexos como miniatura.
   - Rodapé: clipe, campo "Escreva sua resposta...", botão redondo azul de enviar.

## Área técnica (computador primeiro)

**Casca:** barra escura `barra`: "DOMMA Atendimento TI", alternância **Quadro | Lista**, busca "Buscar #número ou título",
avatar + nome + "3 em atendimento". No celular: barra escura com busca abaixo.

6. **Quadro** (`/atendimento`)
   - Faixa "PRÓXIMO DA FILA": "#36 título · solicitante, departamento", selo de prazo, botão **"Pegar o próximo →"**.
   - Filtros: Todos · Só os meus · Sem responsável | Todas as categorias | Qualquer prazo. Legenda: Vencido · Vence em menos de 1h · No prazo.
   - Colunas com contador e barra colorida pela proporção de prazos:
     **Novos** ("Arraste para assumir"; seções "PRAZO VENCIDO · 2" e "NA FILA · 6"; "Ver mais 3"),
     **Em atendimento** ("TI cuidando"), **Aguardando usuário** ("Bola com o solicitante"). "Ver encerrados" ao final.
   - Cartão: canhoto "Nº 36" (cor pelo prazo: vermelho, laranja-claro, verde-claro), selos opcionais ("NOVO",
     "Transferido para você · por Thiago"), título, "solicitante · categoria (nome curto)", prazo + barra, botão escuro
     **Assumir** (nos novos) ou avatar do responsável e contador de mensagens (nos demais).
7. **Atendimento** (`/atendimento/41`)
   - "← Voltar para o quadro", "#41 título" + selo de status.
   - Esquerda — chat: eventos do sistema em pílula; **nota interna** com fundo âmbar, borda tracejada e
     "🔒 Nota interna · só a TI vê"; respostas do técnico em bolha azul à direita.
     Compositor com seletor **Responder à Ana | Nota interna**, campo "Escreva para a Ana... (Ctrl+V cola prints)", clipe, Enviar.
   - Direita — cartões: **AÇÕES** (Marcar como concluído · Transferir · Retomar atendimento · Cancelar chamado em link vermelho),
     **PRAZO** (previsão + barra, responsável, categoria), **SOLICITANTE** (nome, departamento, telefone, e-mail),
     **PEDIDO** (descrição + anexos), **HISTÓRICO** (lista com horário).
8. **Quadro no celular**: "Próximo da fila" + "Pegar o próximo"; colunas viram pílulas roláveis (Novos 8 · Em atendimento 3 · Aguardando 2) + "Filtros".
9. **Atendimento no celular**: cabeçalho escuro com "‹ Quadro" e "⋯", canhoto Nº, título, status, prazo;
   botões Concluir · Transferir · Retomar; abas **Conversa · Detalhes · Histórico**; cartão do solicitante com botão de e-mail.

## Fora do mockup (manter simples, no mesmo estilo)
Login, primeiro acesso, sem acesso, 404, erro inesperado, modais (transferir, cancelar, concluir), "Ver encerrados".
