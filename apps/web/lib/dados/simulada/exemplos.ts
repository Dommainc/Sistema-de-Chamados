// Dados de exemplo da versão simulada (ADR 0006), espelhando o mockup (docs/ui-ux.md).
// Categorias e campos são cópia de supabase/seed.sql — o seed é a fonte da verdade.
// Prazos aqui são definidos à mão por chamado (para mostrar vencido / vence em breve / no prazo);
// o banco calcula em horas úteis.

import type { CampoForm, Categoria, Chamado, StatusChamado, TipoCampo } from "@/lib/dominio/tipos";
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
  [
    "Acesso, senha e bloqueio de conta",
    "Acesso, senha e bloqueio",
    "key-round",
    "Não consigo entrar, esqueci a senha, conta bloqueada",
    2,
    10,
  ],
  [
    "Internet, rede ou VPN",
    "Internet, rede ou VPN",
    "wifi",
    "Sem internet, Wi-Fi ou VPN fora do ar",
    2,
    20,
  ],
  [
    "E-mail / Outlook",
    "E-mail / Outlook",
    "mail",
    "Problemas para enviar, receber ou configurar e-mail",
    4,
    30,
  ],
  ["Teams", "Teams", "message-square", "Chamadas, reuniões, chats e equipes", 4, 40],
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
    "Sistemas da empresa",
    "Sistemas da empresa",
    "layout-grid",
    "Erro ou dúvida em sistemas internos",
    8,
    80,
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
    "Acesso, senha e bloqueio de conta",
    "acesso_a",
    "Qual acesso?",
    "selecao",
    true,
    ["Computador / conta Microsoft", "E-mail", "Sistemas da empresa", "Wi-Fi", "Outro"],
    null,
    10,
  ],
  [
    "Internet, rede ou VPN",
    "alcance",
    "Quem está sem conexão?",
    "selecao",
    true,
    ["Só eu", "Algumas pessoas do setor", "O escritório ou a obra inteira"],
    null,
    10,
  ],
  [
    "Internet, rede ou VPN",
    "local",
    "Onde você está?",
    "texto",
    true,
    [],
    "Ex.: escritório central, obra X, home office",
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
  prazoEm: number;
  descricao: string;
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
    categoria: "Acesso, senha e bloqueio de conta",
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
    categoria: "Internet, rede ou VPN",
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
    prazoEm: 6 * H,
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
    categoria: "Acesso, senha e bloqueio de conta",
    solicitante: JOAO,
    responsavel: null,
    status: "pendente",
    abertoHa: 160,
    atualizadoHa: 160,
    prazoEm: -40,
    descricao: "Errei a senha três vezes e bloqueou.",
  },
  {
    id: 41,
    titulo: "Outlook não sincroniza",
    categoria: "E-mail / Outlook",
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
    categoria: "Internet, rede ou VPN",
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
    categoria: "Teams",
    solicitante: CARLA,
    responsavel: null,
    status: "pendente",
    abertoHa: 30,
    atualizadoHa: 30,
    prazoEm: 3 * H + 30,
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
    prazoEm: 7 * H,
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
      prioridade: "media",
      respostasForm: { descricao: e.descricao },
      prazoSla: minutos(e.prazoEm),
      criadoEm: minutos(-e.abertoHa),
      atualizadoEm,
      concluidoEm: e.status === "concluido" ? atualizadoEm : null,
      canceladoEm: e.status === "cancelado" ? atualizadoEm : null,
      motivoCancelamento: e.motivoCancelamento ?? null,
    };
  });
}
