// Catálogo central de erros (docs/escopo.md, seção 8). Espelho de apps/api/app/erros/catalogo.py.
// Nunca mostrar ao usuário mensagem crua de Supabase, fetch ou stack trace: tudo passa por aqui.

export const CATALOGO = {
  CAMPO_OBRIGATORIO: "Preencha o campo {campo} para continuar.",
  TEXTO_LONGO_DEMAIS: "O campo {campo} pode ter até {maximo} caracteres.",
  ANEXO_MUITO_GRANDE:
    "Esse arquivo tem mais de 10 MB. Tente um arquivo menor ou envie um print da tela.",
  ANEXO_TIPO_INVALIDO:
    "Esse tipo de arquivo não é aceito. Envie imagem, PDF ou documento do Office.",
  ANEXOS_DEMAIS: "Você pode enviar até 5 arquivos por vez. Remova algum para adicionar outro.",
  COLAR_SEM_IMAGEM: "Não encontramos uma imagem para colar. Copie o print e tente de novo.",
  UPLOAD_FALHOU: "Não conseguimos enviar o arquivo. Verifique sua conexão e tente novamente.",
  SESSAO_EXPIRADA: "Sua sessão expirou. Entre novamente com sua conta Microsoft.",
  SEM_PERMISSAO: "Você não tem acesso a este chamado. Se acha que isso é um erro, fale com a TI.",
  CHAMADO_NAO_ENCONTRADO: "Não encontramos o chamado #{numero}. Confira o número e tente de novo.",
  TRANSICAO_INVALIDA: "Não é possível mudar de {de} para {para}.",
  MOTIVO_OBRIGATORIO: "Informe o motivo para continuar.",
  CANCELAMENTO_NAO_PERMITIDO:
    "Quem cancela o chamado é a TI. Se não precisa mais, avise pelo chat.",
  CHAMADO_NAO_INICIADO: "Inicie o chamado para conversar com o solicitante.",
  PRAZO_INVALIDO: "Escolha uma data e hora no futuro para o prazo.",
  AVALIACAO_INDISPONIVEL: "Só dá para avaliar depois que o chamado for concluído.",
  AVALIACAO_JA_ENVIADA: "Você já avaliou este chamado.",
  CHAMADO_PROPRIO: "Este chamado é seu: peça para um colega da TI atender.",
  MENSAGEM_NAO_ENVIADA: "Sua mensagem não foi enviada. Toque para tentar de novo.",
  SEM_CONEXAO: "Sem conexão. As mensagens novas vão aparecer quando a conexão voltar.",
  ERRO_INESPERADO:
    "Algo deu errado do nosso lado. Tente novamente. Se continuar, informe o código {ref} para a TI.",
} as const;

export type CodigoErro = keyof typeof CATALOGO;

export function ehCodigoErro(valor: unknown): valor is CodigoErro {
  return typeof valor === "string" && valor in CATALOGO;
}

export type ParametrosErro = Partial<
  Record<"campo" | "maximo" | "numero" | "de" | "para" | "ref", string>
>;

export function mensagemErro(codigo: CodigoErro, parametros: ParametrosErro = {}): string {
  return CATALOGO[codigo].replace(/\{(\w+)\}/g, (_trecho, nome: string) => {
    const valor = parametros[nome as keyof ParametrosErro];
    return valor ?? "";
  });
}

/** Referência curta para erro inesperado: "ERR-7F3A". */
export function gerarRefErro(): string {
  const hex = Math.floor(Math.random() * 0x10000)
    .toString(16)
    .toUpperCase()
    .padStart(4, "0");
  return `ERR-${hex}`;
}

export interface ErroDeCampo {
  campo: string;
  mensagem: string;
}

/** Erro já traduzido pelo catálogo. É o único tipo de erro que as telas exibem. */
export class ErroApp extends Error {
  readonly codigo: CodigoErro;
  readonly campos: ErroDeCampo[];
  readonly ref: string | null;

  constructor(
    codigo: CodigoErro,
    parametros: ParametrosErro = {},
    /**
     * `mensagem`: texto que veio pronto da API (é o mesmo catálogo, já com {campo} preenchido). Nunca passe
     * aqui mensagem crua de Supabase, fetch ou stack trace.
     */
    opcoes: { campos?: ErroDeCampo[]; mensagem?: string } = {},
  ) {
    const ref = codigo === "ERRO_INESPERADO" ? (parametros.ref ?? gerarRefErro()) : null;
    super(opcoes.mensagem ?? mensagemErro(codigo, ref ? { ...parametros, ref } : parametros));
    this.name = "ErroApp";
    this.codigo = codigo;
    this.campos = opcoes.campos ?? [];
    this.ref = ref;
  }
}

/** Converte qualquer erro em ErroApp, sem nunca vazar a mensagem original para a tela. */
export function paraErroApp(erro: unknown): ErroApp {
  if (erro instanceof ErroApp) return erro;
  const convertido = new ErroApp("ERRO_INESPERADO");
  console.error(`[${convertido.ref}]`, erro);
  return convertido;
}

/** Título da tela quando um chamado não abre: acompanha o erro de verdade (não diz "não encontrado" à toa). */
export function tituloErroChamado(erro: unknown): string {
  const codigo = erro instanceof ErroApp ? erro.codigo : null;
  if (codigo === "CHAMADO_NAO_ENCONTRADO") return "Chamado não encontrado";
  if (codigo === "SEM_PERMISSAO") return "Sem acesso";
  if (codigo === "SEM_CONEXAO") return "Sem conexão";
  return "Não conseguimos abrir o chamado";
}
