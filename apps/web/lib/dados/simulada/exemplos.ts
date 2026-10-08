// Dados de exemplo da versão simulada (ADR 0006), espelhando o mockup (docs/ui-ux.md).
// Categorias e campos são cópia de supabase/seed.sql — o seed é a fonte da verdade.
// Prazos aqui são definidos à mão por chamado (para mostrar vencido / vence em breve / no prazo);
// o banco calcula em horas úteis.

import type {
  Anexo,
  CampoForm,
  Categoria,
  Chamado,
  CorPaleta,
  EventoHistorico,
  Leitura,
  Mensagem,
  RespostaPronta,
  StatusChamado,
  TipoCampo,
} from "@/lib/dominio/tipos";
import { adicionarHorasUteis } from "@/lib/dominio/horario-util";
import { EXPEDIENTE_SIMULADO } from "./feriados";
import { OUTROS_PERFIS_EXEMPLO, USUARIOS_SIMULADOS } from "./usuarios";

const [ANA, BRUNO, RAFAEL, THIAGO] = USUARIOS_SIMULADOS.map((u) => u.id);
const [CARLA, JOAO, MARINA, LUCAS, DIEGO, PAULA] = OUTROS_PERFIS_EXEMPLO.map((u) => u.id);

type LinhaCategoria = [
  nome: string,
  nomeCurto: string,
  icone: string,
  descricao: string,
  sla: number,
  ordem: number,
];

const LINHAS_CATEGORIAS: LinhaCategoria[] = [
  // Unificações do dono (2026-10-07): "Acesso, senha e bloqueio" + "Sistemas da empresa" e
  // "Internet, rede ou VPN" + "Infraestrutura".
  [
    "Solicitações de acesso e Permissões",
    "Solicitações de acesso e Permissões",
    "key-round",
    "Novo acesso, permissão ou desbloqueio nos sistemas da empresa",
    2,
    10,
  ],
  [
    "Internet / Infraestrutura",
    "Internet / Infraestrutura",
    "wifi",
    "Internet, Wi-Fi, VPN, câmeras e pontos de rede",
    2,
    20,
  ],
  // "E-mail / Outlook" e "Teams" unificados em "Microsoft" (pedido do dono, 2026-10-07).
  ["Microsoft", "Microsoft", "grid-2x2", "E-mail, Outlook, Teams, Word, Excel e OneDrive", 4, 30],
  [
    "Computador ou notebook",
    "Computador ou notebook",
    "laptop",
    "Lento, travando, não liga ou com defeito",
    8,
    50,
  ],
  [
    "Impressora / scanner",
    "Impressora / scanner",
    "printer",
    "Não imprime, papel preso, scanner",
    8,
    60,
  ],
  [
    "Celular corporativo",
    "Celular corporativo",
    "smartphone",
    "Configuração, defeito ou troca",
    8,
    70,
  ],
  [
    "Instalação de software",
    "Instalar programa",
    "download",
    "Instalar ou atualizar um programa",
    16,
    90,
  ],
  [
    "Novo colaborador",
    "Novo colaborador",
    "user-plus",
    "Preparar acessos e equipamento para quem vai entrar",
    24,
    100,
  ],
  ["Desligamento", "Desligamento", "user-minus", "Bloquear acessos e recolher equipamento", 4, 110],
  [
    "Compra ou solicitação de equipamento",
    "Pedir equipamento",
    "package",
    "Pedir mouse, monitor, headset, notebook...",
    40,
    120,
  ],
  ["Outros", "Outros pedidos para a TI", "ellipsis", "Qualquer outro pedido para a TI", 16, 900],
];

export const CATEGORIAS: readonly Categoria[] = LINHAS_CATEGORIAS.map(
  ([nome, nomeCurto, icone, descricao, slaHoras, ordem], i) => ({
    id: i + 1,
    nome,
    nomeCurto,
    icone,
    descricao,
    slaHoras,
    ordem,
  }),
);

function categoria(nome: string): Categoria {
  const c = CATEGORIAS.find((x) => x.nome === nome);
  if (!c) throw new Error(`Categoria de exemplo inexistente: ${nome}`);
  return c;
}

type LinhaCampo = [string, string, string, TipoCampo, boolean, string[], string | null, number];

const CAMPOS_ESPECIFICOS: LinhaCampo[] = [
  [
    "Microsoft",
    "programa",
    "Qual programa?",
    "selecao",
    true,
    [
      "E-mail / Outlook",
      "Teams",
      "Word, Excel ou PowerPoint",
      "OneDrive",
      "Redefinição de senha",
      "Outro",
    ],
    null,
    10,
  ],
  [
    "Solicitações de acesso e Permissões",
    "sistema",
    "Qual sistema?",
    "selecao",
    true,
    [
      "Sienge",
      "CVCRM",
      "Construpoint",
      "Construmanager",
      "Docusign",
      "Prevision",
      "Metadados",
      "Não se aplica",
    ],
    null,
    10,
  ],
  [
    "Internet / Infraestrutura",
    "item",
    "O que é?",
    "selecao",
    true,
    ["Internet / Wi-Fi", "VPN", "Câmeras", "Cabeamento / ponto de rede"],
    null,
    5,
  ],
  [
    "Internet / Infraestrutura",
    "alcance",
    "Quem é afetado?",
    "selecao",
    false,
    ["Só eu", "Algumas pessoas do setor", "O escritório ou a obra inteira"],
    null,
    10,
  ],
  [
    "Internet / Infraestrutura",
    "local",
    "Onde fica?",
    "texto",
    true,
    [],
    "Ex.: escritório central, obra X, portaria, home office",
    20,
  ],
  [
    "Computador ou notebook",
    "patrimonio",
    "Número de patrimônio",
    "texto",
    false,
    [],
    "Etiqueta colada no equipamento, se houver",
    10,
  ],
  [
    "Impressora / scanner",
    "local",
    "Onde fica a impressora?",
    "texto",
    true,
    [],
    "Ex.: 3º andar, sala do financeiro",
    10,
  ],
  ["Instalação de software", "software", "Qual programa?", "texto", true, [], null, 10],
  [
    "Instalação de software",
    "justificativa",
    "Para que você precisa dele?",
    "texto_longo",
    true,
    [],
    null,
    20,
  ],
  [
    "Compra ou solicitação de equipamento",
    "item",
    "O que você precisa?",
    "texto",
    true,
    [],
    null,
    10,
  ],
  [
    "Compra ou solicitação de equipamento",
    "justificativa",
    "Por que precisa?",
    "texto_longo",
    true,
    [],
    null,
    20,
  ],
  [
    "Novo colaborador",
    "nome_colaborador",
    "Nome completo de quem vai entrar",
    "texto",
    true,
    [],
    null,
    10,
  ],
  ["Novo colaborador", "data_inicio", "Data de início", "data", true, [], null, 20],
  ["Novo colaborador", "cargo", "Cargo", "texto", true, [], null, 30],
  ["Novo colaborador", "departamento", "Departamento", "texto", true, [], null, 40],
  [
    "Novo colaborador",
    "equipamento",
    "Precisa de equipamento?",
    "selecao",
    true,
    ["Notebook", "Desktop", "Não precisa"],
    null,
    50,
  ],
  [
    "Novo colaborador",
    "observacoes",
    "Observações",
    "texto_longo",
    false,
    [],
    "Sistemas específicos, pastas compartilhadas, celular...",
    60,
  ],
  [
    "Desligamento",
    "nome_colaborador",
    "Nome completo de quem está saindo",
    "texto",
    true,
    [],
    null,
    10,
  ],
  ["Desligamento", "data_desligamento", "Último dia de trabalho", "data", true, [], null, 20],
  [
    "Desligamento",
    "observacoes",
    "Observações",
    "texto_longo",
    false,
    [],
    "Ex.: redirecionar e-mails para o gestor",
    30,
  ],
];

const SEM_DESCRICAO = ["Novo colaborador", "Desligamento"];

/** Cores dos sistemas (no banco: campos_form.cores do campo "sistema" — seed.sql). */
const CORES_SISTEMAS: Record<string, CorPaleta> = {
  Sienge: "vermelho",
  CVCRM: "verde-claro",
  Construpoint: "vermelho-claro",
  Construmanager: "vermelho-escuro",
  Docusign: "azul-escuro",
  Prevision: "roxo",
  Metadados: "azul-claro",
  "Não se aplica": "cinza",
};

/** Respostas prontas do chat (cópia do seed.sql). */
export const RESPOSTAS_PRONTAS: readonly RespostaPronta[] = [
  ["Reiniciar", "Oi, {nome}! Pode reiniciar o computador e testar de novo? Me conta se resolveu."],
  [
    "Acesso remoto",
    "{nome}, vou acessar seu computador remotamente agora. Pode deixar ele ligado e desbloqueado?",
  ],
  [
    "Pedir print",
    "{nome}, consegue me mandar um print da tela com o erro? Pode colar aqui com Ctrl+V.",
  ],
  ["Testar agora", "Pronto, {nome}! Fiz o ajuste. Pode testar e me avisar se está tudo certo?"],
  ["Em análise", "{nome}, já estou vendo o seu chamado e te dou um retorno em breve."],
  [
    "Aguardando terceiro",
    "{nome}, dependemos do fornecedor para seguir. Assim que tiver novidade, te aviso por aqui.",
  ],
].map(([titulo, texto], i) => ({ id: i + 1, titulo, texto, ordem: (i + 1) * 10 }));

export const CAMPOS_FORM: readonly CampoForm[] = [
  ...CATEGORIAS.filter((c) => !SEM_DESCRICAO.includes(c.nome)).map((c): LinhaCampo => [
    c.nome,
    "descricao",
    "Descreva o que está acontecendo",
    "texto_longo",
    true,
    [],
    "Conte o que aconteceu e, se puder, cole um print da tela (Ctrl+V).",
    100,
  ]),
  ...CAMPOS_ESPECIFICOS,
].map(([nomeCategoria, chave, label, tipo, obrigatorio, opcoes, ajuda, ordem], i) => ({
  id: i + 1,
  categoriaId: categoria(nomeCategoria).id,
  chave,
  label,
  tipo,
  obrigatorio,
  opcoes,
  cores: chave === "sistema" ? CORES_SISTEMAS : {},
  ajuda,
  ordem,
}));

interface ChamadoExemplo {
  id: number;
  titulo: string;
  categoria: string;
  solicitante: string;
  responsavel: string | null;
  status: StatusChamado;
  /** Minutos atrás em que foi aberto. */
  abertoHa: number;
  /** Minutos atrás da última atualização. */
  atualizadoHa: number;
  /** Prazo em minutos a partir de agora (negativo = vencido). */
  /** Minutos até o prazo; ausente = a TI ainda não definiu (docs/adr/0009). */
  prazoEm?: number;
  descricao: string;
  /** Respostas extras do formulário (além da descrição). */
  respostas?: Record<string, string>;
  motivoCancelamento?: string;
}

const H = 60;
const DIA = 24 * H;

// Números e situações do mockup (docs/ui-ux.md), com o fluxo do ADR 0005.
const CHAMADOS_EXEMPLO: ChamadoExemplo[] = [
  {
    id: 30,
    titulo: "Impressora do RH com papel preso",
    categoria: "Impressora / scanner",
    solicitante: MARINA,
    responsavel: THIAGO,
    status: "concluido",
    abertoHa: 3 * DIA,
    atualizadoHa: 2 * DIA,
    prazoEm: -2 * DIA,
    descricao: "Papel preso na bandeja 2.",
  },
  {
    id: 31,
    titulo: "Acesso à pasta de contratos",
    categoria: "Solicitações de acesso e Permissões",
    respostas: { sistema: "Não se aplica" },
    solicitante: PAULA,
    responsavel: THIAGO,
    status: "aguardando_usuario",
    abertoHa: 5 * H,
    atualizadoHa: 2 * H,
    prazoEm: 5 * H,
    descricao: "Preciso de acesso à pasta de contratos de 2026.",
  },
  {
    id: 32,
    titulo: "Headset novo para reuniões",
    categoria: "Compra ou solicitação de equipamento",
    solicitante: BRUNO,
    responsavel: null,
    status: "cancelado",
    abertoHa: 4 * DIA,
    atualizadoHa: 4 * DIA - 30,
    prazoEm: -1 * DIA,
    descricao: "O meu quebrou.",
    motivoCancelamento: "Achei um headset sobrando no setor.",
  },
  {
    id: 33,
    titulo: "VPN não conecta em casa",
    categoria: "Internet / Infraestrutura",
    respostas: { item: "VPN", local: "Home office" },
    solicitante: LUCAS,
    responsavel: THIAGO,
    status: "em_andamento",
    abertoHa: 20 * H,
    atualizadoHa: 3 * H,
    prazoEm: 23 * H,
    descricao: "A VPN dá erro de autenticação desde segunda.",
  },
  {
    id: 34,
    titulo: "Monitor piscando",
    categoria: "Computador ou notebook",
    solicitante: DIEGO,
    responsavel: null,
    status: "pendente",
    abertoHa: 2 * H,
    atualizadoHa: 2 * H,
    descricao: "O monitor da esquerda pisca de tempos em tempos.",
  },
  {
    id: 35,
    titulo: "Notebook muito lento",
    categoria: "Computador ou notebook",
    solicitante: ANA,
    responsavel: RAFAEL,
    status: "concluido",
    abertoHa: 4 * DIA,
    atualizadoHa: 3 * DIA,
    prazoEm: -3 * DIA,
    descricao: "Demora vários minutos para abrir qualquer planilha.",
  },
  {
    id: 36,
    titulo: "Impressora do 3º andar não imprime",
    categoria: "Impressora / scanner",
    solicitante: CARLA,
    responsavel: null,
    status: "pendente",
    abertoHa: 11 * H,
    atualizadoHa: 11 * H,
    prazoEm: -3 * H,
    descricao: "Mando imprimir e nada acontece.",
  },
  {
    id: 37,
    titulo: "Instalar Power BI",
    categoria: "Instalação de software",
    solicitante: BRUNO,
    responsavel: null,
    status: "pendente",
    abertoHa: 15 * H,
    atualizadoHa: 15 * H,
    prazoEm: 50,
    descricao: "Preciso montar os relatórios do mês.",
  },
  {
    id: 38,
    titulo: "Instalar AutoCAD no notebook",
    categoria: "Instalação de software",
    solicitante: ANA,
    responsavel: RAFAEL,
    status: "em_andamento",
    abertoHa: 26 * H,
    atualizadoHa: 20 * H,
    prazoEm: 6 * H,
    descricao: "Preciso do AutoCAD para revisar as plantas da obra.",
  },
  {
    id: 39,
    titulo: "Novo colaborador: Pedro Alves",
    categoria: "Novo colaborador",
    solicitante: MARINA,
    responsavel: RAFAEL,
    status: "transferido",
    abertoHa: 6 * H,
    atualizadoHa: 1 * H,
    prazoEm: 31 * H,
    descricao: "Pedro começa na segunda, no time de Engenharia.",
  },
  {
    id: 40,
    titulo: "Acesso ao sistema de medição bloqueado",
    categoria: "Solicitações de acesso e Permissões",
    respostas: { sistema: "Construmanager" },
    solicitante: JOAO,
    responsavel: null,
    status: "pendente",
    abertoHa: 160,
    atualizadoHa: 160,
    descricao: "Errei a senha três vezes e bloqueou.",
  },
  {
    id: 41,
    titulo: "Outlook não sincroniza",
    categoria: "Microsoft",
    respostas: { programa: "E-mail / Outlook" },
    solicitante: ANA,
    responsavel: RAFAEL,
    status: "aguardando_usuario",
    abertoHa: 2 * H,
    atualizadoHa: 12,
    prazoEm: 4 * H,
    descricao: "Desde ontem o Outlook não recebe e-mails novos. Já reiniciei o computador.",
  },
  {
    id: 42,
    titulo: "Sem internet na obra Recreio",
    categoria: "Internet / Infraestrutura",
    respostas: {
      item: "Internet / Wi-Fi",
      alcance: "O escritório ou a obra inteira",
      local: "Obra Recreio",
    },
    solicitante: ANA,
    responsavel: null,
    status: "pendente",
    abertoHa: 3,
    atualizadoHa: 3,
    prazoEm: 2 * H,
    descricao:
      "Desde as 8h ninguém no canteiro consegue acessar a internet. O roteador está com a luz vermelha piscando.",
  },
  {
    id: 43,
    titulo: "Teams sem áudio nas chamadas",
    categoria: "Microsoft",
    respostas: { programa: "Teams" },
    solicitante: CARLA,
    responsavel: null,
    status: "pendente",
    abertoHa: 30,
    atualizadoHa: 30,
    descricao: "Ninguém me escuta nas reuniões.",
  },
  {
    id: 44,
    titulo: "Segundo monitor para projetos",
    categoria: "Compra ou solicitação de equipamento",
    solicitante: DIEGO,
    responsavel: THIAGO,
    status: "em_andamento",
    abertoHa: 1 * DIA,
    atualizadoHa: 5 * H,
    prazoEm: 7 * DIA,
    descricao: "Um monitor de 27 polegadas para revisar projetos.",
  },
  {
    id: 45,
    titulo: "Celular corporativo sem sinal",
    categoria: "Celular corporativo",
    solicitante: JOAO,
    responsavel: null,
    status: "pendente",
    abertoHa: 10,
    atualizadoHa: 10,
    descricao: "Sem sinal desde hoje cedo, só no meu aparelho.",
  },
];

/** Monta os chamados de exemplo com datas relativas a "agora". */
export function gerarChamadosExemplo(agora: Date): Chamado[] {
  const minutos = (min: number) => new Date(agora.getTime() + min * 60_000).toISOString();
  return CHAMADOS_EXEMPLO.map((e) => {
    const atualizadoEm = minutos(-e.atualizadoHa);
    return {
      id: e.id,
      titulo: e.titulo,
      categoriaId: categoria(e.categoria).id,
      solicitanteId: e.solicitante,
      responsavelId: e.responsavel,
      status: e.status,
      // Prioridade alta em dois exemplos (ADR 0012): #36 (novo, vencido) e #38 (em atendimento).
      prioridade: e.id === 36 || e.id === 38 ? "alta" : "media",
      respostasForm: { ...e.respostas, descricao: e.descricao },
      // Prazo futuro em horas úteis; vencidos e "vence em menos de 1 h" ficam exatos.
      prazoSla:
        e.prazoEm === undefined
          ? null
          : e.prazoEm >= 60
            ? adicionarHorasUteis(agora, e.prazoEm / 60, EXPEDIENTE_SIMULADO).toISOString()
            : minutos(e.prazoEm),
      criadoEm: minutos(-e.abertoHa),
      atualizadoEm,
      concluidoEm: e.status === "concluido" ? atualizadoEm : null,
      canceladoEm: e.status === "cancelado" ? atualizadoEm : null,
      motivoCancelamento: e.motivoCancelamento ?? null,
    };
  });
}

/** Linha do tempo básica dos exemplos: abertura e, se houver responsável, quem assumiu. */
export function gerarHistoricoExemplo(chamados: readonly Chamado[]): EventoHistorico[] {
  const eventos: Omit<EventoHistorico, "id">[] = [];
  for (const c of chamados) {
    eventos.push({
      chamadoId: c.id,
      autorId: c.solicitanteId,
      acao: "criado",
      de: null,
      para: "pendente",
      detalhe: {},
      publico: true,
      criadoEm: c.criadoEm,
    });
    if (c.responsavelId) {
      // Transferido: quem assumiu foi o técnico de origem (no exemplo, o Thiago).
      const quemAssumiu = c.status === "transferido" ? THIAGO : c.responsavelId;
      const assumidoEm = new Date(
        (new Date(c.criadoEm).getTime() + new Date(c.atualizadoEm).getTime()) / 2,
      ).toISOString();
      eventos.push({
        chamadoId: c.id,
        autorId: quemAssumiu,
        acao: "assumido",
        de: "pendente",
        para: "em_andamento",
        detalhe: {},
        publico: true,
        criadoEm: assumidoEm,
      });
    }
    if (c.prazoSla) {
      // Quem definiu o prazo: o responsável (ou, nos novos, o Rafael), logo depois da abertura.
      eventos.push({
        chamadoId: c.id,
        autorId: c.responsavelId ?? RAFAEL,
        acao: "prazo_definido",
        de: c.status,
        para: c.status,
        detalhe: { prazo: c.prazoSla },
        publico: true,
        criadoEm: new Date(new Date(c.criadoEm).getTime() + 60_000).toISOString(),
      });
    }
  }
  return eventos
    .sort((a, b) => a.criadoEm.localeCompare(b.criadoEm))
    .map((e, i) => ({ ...e, id: i + 1 }));
}

type EventoExtra = Omit<EventoHistorico, "id" | "criadoEm"> & { ha: number };
type MensagemExemplo = Omit<Mensagem, "id" | "criadoEm"> & { ha: number };

/**
 * Conversas de exemplo (minutos atrás). O #41 reproduz o chat do mockup (telas 5 e 7),
 * incluindo a nota interna que a Ana não pode ver e a resposta do Rafael ainda não lida por ela.
 */
export function gerarConversasExemplo(agora: Date): {
  mensagens: Mensagem[];
  eventos: Omit<EventoHistorico, "id">[];
  leituras: Leitura[];
  anexos: Anexo[];
} {
  const em = (ha: number) => new Date(agora.getTime() - ha * 60_000).toISOString();

  const mensagens: MensagemExemplo[] = [
    {
      chamadoId: 41,
      autorId: RAFAEL,
      interna: true,
      ha: 20,
      conteudo:
        "Caixa da Ana com 49,8 GB de 50 GB. Se no navegador também não aparecer, arquivar itens anteriores a 2024.",
    },
    {
      chamadoId: 41,
      autorId: RAFAEL,
      interna: false,
      ha: 12,
      conteudo:
        "Bom dia, Ana! Consegue abrir o Outlook pelo navegador, em outlook.office.com, e me dizer se os e-mails novos aparecem lá?",
    },
    {
      chamadoId: 38,
      autorId: RAFAEL,
      interna: false,
      ha: 20 * H,
      conteudo: "Oi, Ana! Já pedi a licença do AutoCAD. Assim que liberar eu instalo remotamente.",
    },
    { chamadoId: 38, autorId: ANA, interna: false, ha: 19 * H, conteudo: "Combinado, obrigada!" },
    {
      chamadoId: 31,
      autorId: THIAGO,
      interna: false,
      ha: 2 * H,
      conteudo: "Paula, qual é o caminho exato da pasta? Pode mandar um print?",
    },
    {
      chamadoId: 33,
      autorId: THIAGO,
      interna: true,
      ha: 3 * H,
      conteudo: "Certificado da VPN dele venceu. Gerar outro e mandar por e-mail.",
    },
    {
      chamadoId: 35,
      autorId: RAFAEL,
      interna: false,
      ha: 3 * DIA + 30,
      conteudo: "Troquei o HD por um SSD. Deve ficar bem mais rápido agora.",
    },
  ];

  const eventos: EventoExtra[] = [
    {
      chamadoId: 41,
      autorId: RAFAEL,
      acao: "status_alterado",
      de: "em_andamento",
      para: "aguardando_usuario",
      detalhe: {},
      publico: true,
      ha: 12,
    },
    {
      chamadoId: 31,
      autorId: THIAGO,
      acao: "status_alterado",
      de: "em_andamento",
      para: "aguardando_usuario",
      detalhe: {},
      publico: true,
      ha: 2 * H,
    },
    {
      chamadoId: 39,
      autorId: THIAGO,
      acao: "transferido",
      de: "em_andamento",
      para: "transferido",
      detalhe: {
        para_responsavel_id: RAFAEL,
        motivo: "Rafael cuida das contas de novos colaboradores.",
      },
      publico: false,
      ha: 1 * H,
    },
    {
      chamadoId: 35,
      autorId: RAFAEL,
      acao: "concluido",
      de: "em_andamento",
      para: "concluido",
      detalhe: {},
      publico: true,
      ha: 3 * DIA,
    },
    {
      chamadoId: 30,
      autorId: THIAGO,
      acao: "concluido",
      de: "em_andamento",
      para: "concluido",
      detalhe: {},
      publico: true,
      ha: 2 * DIA,
    },
    {
      chamadoId: 32,
      autorId: BRUNO,
      acao: "cancelado",
      de: "pendente",
      para: "cancelado",
      detalhe: { motivo: "Achei um headset sobrando no setor." },
      publico: true,
      ha: 4 * DIA - 30,
    },
  ];

  // Ana leu tudo do #38 e do #35; a resposta do #41 ainda não ("• Nova mensagem").
  const leituras: Leitura[] = [
    { chamadoId: 38, profileId: ANA, lidoAte: em(19 * H) },
    { chamadoId: 35, profileId: ANA, lidoAte: em(3 * DIA) },
  ];

  // Print colado pela Ana na abertura do #41 (mockup). Sem arquivo real: a tela mostra só o nome.
  const anexos: Anexo[] = [
    {
      id: "exemplo-41-print",
      chamadoId: 41,
      mensagemId: null,
      nome: "print-20261005-084510.png",
      mime: "image/png",
      tamanho: 245_000,
      origem: "colado",
      enviadoPor: ANA,
      criadoEm: em(2 * H),
    },
  ];

  return {
    anexos,
    mensagens: mensagens
      .sort((a, b) => b.ha - a.ha)
      .map(({ ha, ...m }, i) => ({ ...m, id: i + 1, criadoEm: em(ha) })),
    eventos: eventos.map(({ ha, ...e }) => ({ ...e, criadoEm: em(ha) })),
    leituras,
  };
}
