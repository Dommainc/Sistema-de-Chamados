// Dados de exemplo da versão simulada (ADR 0006).
// Categorias e campos são cópia de supabase/seed.sql — o seed é a fonte da verdade.
// Prazos aqui usam horas corridas (simplificação); o banco calcula em horas úteis.

import type { CampoForm, Categoria, Chamado, StatusChamado, TipoCampo } from "@/lib/dominio/tipos";
import { USUARIOS_SIMULADOS } from "./usuarios";

const [ANA, BRUNO, TECNICO] = USUARIOS_SIMULADOS.map((u) => u.id);

export const CATEGORIAS: readonly Categoria[] = [
  [
    "Acesso, senha e bloqueio de conta",
    "Não consigo entrar, esqueci a senha, conta bloqueada",
    2,
    10,
  ],
  ["Internet, rede ou VPN", "Sem internet, Wi-Fi ou VPN fora do ar", 2, 20],
  ["E-mail / Outlook", "Problemas para enviar, receber ou configurar e-mail", 4, 30],
  ["Teams", "Chamadas, reuniões, chats e equipes", 4, 40],
  ["Computador ou notebook", "Lento, travando, não liga ou com defeito", 8, 50],
  ["Impressora / scanner", "Não imprime, papel preso, scanner", 8, 60],
  ["Celular corporativo", "Configuração, defeito ou troca", 8, 70],
  ["Sistemas da empresa", "Erro ou dúvida em sistemas internos", 8, 80],
  ["Instalação de software", "Instalar ou atualizar um programa", 16, 90],
  ["Novo colaborador", "Preparar acessos e equipamento para quem vai entrar", 24, 100],
  ["Desligamento", "Bloquear acessos e recolher equipamento", 4, 110],
  ["Compra ou solicitação de equipamento", "Pedir mouse, monitor, headset, notebook...", 40, 120],
  ["Outros", "Qualquer outro pedido para a TI", 16, 900],
].map(([nome, descricao, slaHoras, ordem], i) => ({
  id: i + 1,
  nome: nome as string,
  descricao: descricao as string,
  slaHoras: slaHoras as number,
  ordem: ordem as number,
}));

function categoriaId(nome: string): number {
  const c = CATEGORIAS.find((x) => x.nome === nome);
  if (!c) throw new Error(`Categoria de exemplo inexistente: ${nome}`);
  return c.id;
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
    ["Só eu", "Algumas pessoas do setor", "O escritório / obra inteira"],
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
].map(([categoria, chave, label, tipo, obrigatorio, opcoes, ajuda, ordem], i) => ({
  id: i + 1,
  categoriaId: categoriaId(categoria),
  chave,
  label,
  tipo,
  obrigatorio,
  opcoes,
  ajuda,
  ordem,
}));

interface ChamadoExemplo {
  titulo: string;
  categoria: string;
  solicitante: string;
  status: StatusChamado;
  /** Minutos atrás em que foi aberto. */
  abertoHa: number;
  /** Minutos atrás da última atualização. */
  atualizadoHa: number;
  descricao: string;
  motivoCancelamento?: string;
}

const CHAMADOS_EXEMPLO: ChamadoExemplo[] = [
  {
    titulo: "Instalar o AutoCAD no meu notebook",
    categoria: "Instalação de software",
    solicitante: ANA,
    status: "concluido",
    abertoHa: 8 * 1440,
    atualizadoHa: 5 * 1440,
    descricao: "Preciso do AutoCAD para revisar as plantas da obra.",
  },
  {
    titulo: "Headset novo para reuniões",
    categoria: "Compra ou solicitação de equipamento",
    solicitante: BRUNO,
    status: "cancelado",
    abertoHa: 6 * 1440,
    atualizadoHa: 6 * 1440 - 30,
    descricao: "O meu quebrou.",
    motivoCancelamento: "Achei um headset sobrando no setor.",
  },
  {
    titulo: "Outlook pedindo senha toda hora",
    categoria: "E-mail / Outlook",
    solicitante: ANA,
    status: "aguardando_usuario",
    abertoHa: 26 * 60,
    atualizadoHa: 3 * 60,
    descricao: "Desde ontem o Outlook pede a senha várias vezes por dia.",
  },
  {
    titulo: "Acesso ao sistema financeiro",
    categoria: "Sistemas da empresa",
    solicitante: BRUNO,
    status: "transferido",
    abertoHa: 22 * 60,
    atualizadoHa: 5 * 60,
    descricao: "Preciso de acesso ao módulo de contas a pagar.",
  },
  {
    titulo: "Teams sem áudio nas chamadas",
    categoria: "Teams",
    solicitante: BRUNO,
    status: "em_andamento",
    abertoHa: 20 * 60,
    atualizadoHa: 2 * 60,
    descricao: "Ninguém me escuta nas reuniões.",
  },
  {
    titulo: "Sem internet no 3º andar",
    categoria: "Internet, rede ou VPN",
    solicitante: ANA,
    status: "em_andamento",
    abertoHa: 3 * 60,
    atualizadoHa: 40,
    descricao: "O Wi-Fi caiu para todo o andar.",
  },
  {
    titulo: "Notebook muito lento",
    categoria: "Computador ou notebook",
    solicitante: BRUNO,
    status: "pendente",
    abertoHa: 2 * 60,
    atualizadoHa: 2 * 60,
    descricao: "Demora vários minutos para abrir qualquer planilha.",
  },
  {
    titulo: "Trocar toner da impressora da sala de reunião",
    categoria: "Impressora / scanner",
    solicitante: TECNICO,
    status: "pendente",
    abertoHa: 70,
    atualizadoHa: 70,
    descricao: "Impressão saindo muito clara.",
  },
  {
    titulo: "Impressora não imprime",
    categoria: "Impressora / scanner",
    solicitante: ANA,
    status: "pendente",
    abertoHa: 40,
    atualizadoHa: 40,
    descricao: "Mando imprimir e nada acontece.",
  },
  {
    titulo: "VPN cai quando trabalho de casa",
    categoria: "Internet, rede ou VPN",
    solicitante: ANA,
    status: "pendente",
    abertoHa: 10,
    atualizadoHa: 10,
    descricao: "A VPN desconecta a cada 15 minutos.",
  },
];

const COM_RESPONSAVEL: StatusChamado[] = [
  "em_andamento",
  "aguardando_usuario",
  "transferido",
  "concluido",
];

/** Monta os chamados de exemplo com datas relativas a "agora" (números 1, 2, 3... por ordem de abertura). */
export function gerarChamadosExemplo(agora: Date): Chamado[] {
  const minutosAtras = (min: number) => new Date(agora.getTime() - min * 60_000).toISOString();
  return [...CHAMADOS_EXEMPLO]
    .sort((a, b) => b.abertoHa - a.abertoHa)
    .map((e, i) => {
      const categoria = CATEGORIAS.find((c) => c.nome === e.categoria)!;
      const criadoEm = minutosAtras(e.abertoHa);
      const atualizadoEm = minutosAtras(e.atualizadoHa);
      return {
        id: i + 1,
        titulo: e.titulo,
        categoriaId: categoria.id,
        solicitanteId: e.solicitante,
        responsavelId: COM_RESPONSAVEL.includes(e.status) ? TECNICO : null,
        status: e.status,
        prioridade: "media",
        respostasForm: { descricao: e.descricao },
        prazoSla: new Date(
          new Date(criadoEm).getTime() + categoria.slaHoras * 3_600_000,
        ).toISOString(),
        criadoEm,
        atualizadoEm,
        concluidoEm: e.status === "concluido" ? atualizadoEm : null,
        canceladoEm: e.status === "cancelado" ? atualizadoEm : null,
        motivoCancelamento: e.motivoCancelamento ?? null,
      };
    });
}
