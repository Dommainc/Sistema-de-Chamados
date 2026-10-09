# Banco de dados

Postgres no Supabase (`sa-east-1`). Tudo é criado pelas migrations em `supabase/migrations/` (0001–0021) e testado
por `supabase/tests/database/` (pgTAP). **Nunca editar uma migration já commitada**: sempre criar uma nova.
Situação: validado a cada push no job `banco` do CI (Supabase local e descartável: migrations do zero + pgTAP + integração da API). Projetos da nuvem aguardam a assinatura (`pendencias.md` P-022).

## Desenho

```mermaid
erDiagram
  areas ||--o{ categorias : tem
  categorias ||--o{ campos_form : "formulário"
  categorias ||--o{ chamados : classifica
  areas ||--o{ chamados : atende
  profiles ||--o{ chamados : "abre (solicitante)"
  profiles ||--o{ chamados : "atende (responsável)"
  chamados ||--o{ historico : registra
  chamados ||--o{ transferencias : registra
  chamados ||--o{ mensagens : conversa
  chamados ||--o{ anexos : arquivos
  mensagens ||--o{ anexos : "anexa"
  chamados ||--o{ notificacoes : avisa
  profiles ||--o{ notificacoes : recebe
  chamados ||--o{ chamado_leituras : "lido por"
  profiles ||--o{ chamado_leituras : "leu"
  profiles ||--o| teams_conversas : "conversa do bot"
  profiles ||--o{ bot_respostas_automaticas : "escreveu ao bot"
```

## Tabelas

### Configuração
| Tabela | O que guarda | Pontos importantes |
|---|---|---|
| `configuracoes` | Parâmetros: fuso, expediente (08–20), limites de anexo, texto da resposta do bot | `publico = true` → qualquer usuário logado lê; o resto só a TI |
| `feriados` | Dias sem expediente (2026–2027 no seed: nacionais, RJ e Rio) | `ativo = false` em vez de apagar. **Cadastrar 2028 antes do fim de 2027** (P-008) |
| `areas` | Áreas que atendem (Fase 1: só TI) | — |
| `categorias` | Assuntos, `nome_curto` e `icone` do portal | **4 no seed** (reorganização do dono, 2026-10-08): "Solicitações de acesso e Permissões" (com "Qual sistema?"), "Infraestrutura" ("O que é?": Notebook · Impressora / Scanner · Celular Corporativo · Internet · Câmeras; "Onde fica?"), "Microsoft" e "Outros". Saíram Instalar programa, Novo colaborador, Desligamento, Pedir equipamento e as categorias de computador, impressora e celular (viraram opções de Infraestrutura). Depois do go-live, mudar categoria = **migration nova** (o seed só roda na instalação). `sla_horas` **sem uso** desde a 0019 (prazo é da TI — ADR 0009) |
| `campos_form` | Campos do formulário dinâmico por categoria (texto, texto longo, número, data, seleção, múltipla, sim/não) | `chave` estável (as respostas são guardadas por ela). `cores` (0022): cor de cada opção, da **paleta fixa** (vermelho, vermelho-claro, vermelho-escuro, verde-claro, azul-claro, azul-escuro, roxo, cinza) — os sistemas de "Qual sistema?". **Sistema novo** = opção em `opcoes` + cor em `cores`, só SQL |
| `respostas_prontas` | Respostas prontas do chat (0023): título, texto (`{nome}` = primeiro nome do solicitante), ordem, ativo | Lista única da TI, mantida por SQL. Só a TI lê; ninguém grava pela aplicação |

### Pessoas
| Tabela | O que guarda | Pontos importantes |
|---|---|---|
| `profiles` | Nome, e-mail, departamento, telefone, papel (`solicitante`/`ti`), `ativo` | Criado sozinho no 1º login — **ativo só se o e-mail for `@dommainc.com.br`** (`configuracoes.dominios_permitidos`, migration 0018). Inativo não lê nem faz nada. O usuário só edita departamento e telefone; o papel vem do Entra |
| `perfis_publicos` (view) | Só nome, departamento, papel e ativo de todos | Para mostrar o nome do técnico/solicitante sem expor contato |
| `chamados_quadro` (view) | Quadro da TI: abertos + encerrados dos últimos 7 dias, com `transferido_por` e `nao_lidas` (do usuário logado) | `security_invoker`: o RLS de quem consulta vale dentro dela. Uma consulta em vez de uma por chamado |
| `chamados_encerrados` (view) | Concluídos e cancelados com `encerrado_em` | Para paginar "Ver encerrados" (`order=encerrado_em.desc` + Range) |

### Chamados
| Tabela | O que guarda | Pontos importantes |
|---|---|---|
| `chamados` | Número (`id` 1, 2, 3...), título, categoria, solicitante, responsável, status, respostas do formulário, prazo, datas | `prazo_sla` nasce **vazio**: um técnico define e altera com motivo (ADR 0009). Regras: ver [status.md](status.md). **Nunca é apagado**; encerrado é só leitura |
| `historico` | Linha do tempo (criado, assumido, status, transferido, devolvido, prazo definido, concluído, cancelado) | Só inserção. `publico = false` → só a TI vê (ex.: motivo de transferência) |
| `transferencias` | De quem, para quem, motivo | Só inserção; só a TI lê |
| `mensagens` | Chat | Só inserção. `interna = true` → nota interna (só TI escreve e lê). Encerrado não aceita mensagem |
| `anexos` | Nome, tipo, tamanho, origem (`upload`/`colado`), caminho no Storage | Só inserção. Anexo de nota interna é invisível ao solicitante (inclusive no Storage) |
| `chamado_leituras` | Até quando cada pessoa leu a conversa | Para o selo "• Nova mensagem". Gravada só pela API |
| `avaliacoes` | Pesquisa de satisfação (0024): nota 1–5 e texto, uma por chamado concluído | Só o solicitante, só concluído (trigger); texto obrigatório com nota ≤ 2; não muda nem é apagada. Gravada só pela API (ADR 0015) |

### Avisos (Teams)
| Tabela | O que guarda | Pontos importantes |
|---|---|---|
| `notificacoes` | Fila de avisos (outbox): tipo, destinatário, payload, status `pendente`/`enviada`/`falhou`, tentativas | Gravada na mesma transação da ação; enviada depois ([ADR 0003](adr/0003-notificacoes-outbox.md)) |
| `teams_conversas` | Referência da conversa do bot com cada pessoa + último chamado avisado | Preenchida pelo bot |
| `bot_respostas_automaticas` | Log de quem escreveu ao bot | Para medir a frequência |

## Segurança (RLS)

RLS ligado em **todas** as tabelas; os acessos padrão do Supabase foram revogados (migration 0010), então
**toda tabela nova precisa de GRANT + policy explícitos + teste**.

| Tabela | Solicitante lê | TI lê | Quem grava |
|---|---|---|---|
| `chamados` | os próprios | todos | API (`central_api`) |
| `mensagens` | as não internas dos próprios chamados | todas | API |
| `anexos` | os dos próprios chamados, exceto de notas internas | todos | API |
| `historico` | os eventos públicos dos próprios chamados | todos | API |
| `transferencias`, `notificacoes`, `teams_conversas`, `bot_respostas_automaticas` | — | todos | API |
| `profiles` | o próprio | todos | o próprio (só departamento/telefone) e API |
| `chamado_leituras` | as próprias | as próprias | API |
| `avaliacoes` | as próprias | todas | API |
| `configuracoes` | as públicas | todas | API |
| `categorias`, `campos_form`, `areas` | as ativas | todas | API |
| `respostas_prontas` | — | as ativas | só SQL (migration) |
| `feriados` | todos | todos | API |

Travas que valem até para quem contornar a API (triggers): encerrado não muda (`CC001`), campos imutáveis
(`CC002`), nada é apagado (`CC003`), categoria inativa (`CC004`), nota interna só da TI (`CC005`),
anexo consistente com a mensagem (`CC006`). Funções novas no schema `app` nascem sem permissão de execução
pública (migration 0015).

## Migrations

| Nº | Arquivo | Conteúdo |
|---|---|---|
| 0001 | `..._base.sql` | Schema `app`, papel `central_api`, enums |
| 0002 | `..._configuracoes_feriados.sql` | Configurações, feriados, cálculo de horas úteis |
| 0003 | `..._areas_categorias_campos.sql` | Áreas, categorias, campos do formulário |
| 0004 | `..._profiles.sql` | Perfis + criação automática no 1º login |
| 0005 | `..._chamados.sql` | Chamados + travas |
| 0006 | `..._transferencias_historico.sql` | Transferências e histórico (só inserção) |
| 0007 | `..._mensagens_anexos.sql` | Chat e anexos |
| 0008 | `..._notificacoes_teams.sql` | Outbox e tabelas do bot |
| 0009 | `..._rls_funcoes.sql` | Funções auxiliares do RLS |
| 0010 | `..._rls_policies.sql` | RLS, grants, view `perfis_publicos` |
| 0011 | `..._storage.sql` | Bucket `anexos` (privado, 10 MB, tipos permitidos) |
| 0012 | `..._indices.sql` | Índices (fila, RLS, chat, busca por título) |
| 0013 | `..._realtime.sql` | Tabelas no Realtime |
| 0014 | `..._jobs.sql` | Fechamento automático (removido na 0015) |
| 0015 | `20261005120000_status_simplificados.sql` | 6 status (ADR 0005), `concluido_em`, sem fechamento automático |
| 0016 | `20261005150000_categorias_icone_nome_curto.sql` | Ícone e nome curto das categorias |
| 0017 | `20261005180000_chamado_leituras.sql` | Leitura da conversa (selo "Nova mensagem") |
| 0018 | `20261007090000_dominio_e_inativos.sql` | Só `@dommainc.com.br` fica ativo; solicitante inativo não lê mais nada (P-005, P-009) |
| 0019 | `20261007120000_prazo_definido_pela_ti.sql` | Chamado nasce sem prazo; quem define é a TI (ADR 0009) |
| 0020 | `20261007150000_views_quadro_e_encerrados.sql` | Views `chamados_quadro` e `chamados_encerrados` + índices (consultas leves com dados reais) |
| 0021 | `20261008090000_automacoes_inatividade.sql` | Automações por tempo (`app.processar_inatividade`, pg_cron 5 min): 2 h úteis → aguardando usuário; 24 h úteis → aviso no chat. `mensagens.autor_id` nulo = mensagem do sistema (ADR 0011) |
| 0022 | `20261008120000_cores_das_opcoes.sql` | `campos_form.cores`: cor de cada opção (paleta fixa, conferida por `app.cores_validas`) |
| 0023 | `20261008130000_respostas_prontas.sql` | Tabela `respostas_prontas` (só a TI lê) |
| 0024 | `20261009090000_avaliacoes.sql` | Tabela `avaliacoes` — pesquisa de satisfação (ADR 0015) |
