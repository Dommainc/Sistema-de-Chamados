// Ações da área técnica na versão simulada: histórico + notificação pendente em cada uma,
// e solicitante sempre barrado (SEM_PERMISSAO). Exemplos: lib/dados/simulada/exemplos.ts.

import { beforeEach, describe, expect, it } from "vitest";
import type { AcaoChamado } from "@/lib/dominio/estados";
import { _reiniciarParaTestes, estadoInicial, gravarEstado, lerEstado } from "./armazenamento";
import { CATEGORIAS } from "./exemplos";
import { criarFonteSimulada } from "./index";
import { USUARIOS_SIMULADOS } from "./usuarios";

const [ANA, , RAFAEL, THIAGO] = USUARIOS_SIMULADOS;

beforeEach(() => {
  localStorage.clear();
  _reiniciarParaTestes();
  gravarEstado(estadoInicial());
});

const ultimoEvento = (chamadoId: number) =>
  lerEstado()
    .historico.filter((h) => h.chamadoId === chamadoId)
    .at(-1);
const notificacoesDe = (chamadoId: number) =>
  lerEstado().notificacoes.filter((n) => n.chamadoId === chamadoId);

describe("assumir", () => {
  it("pendente vira em andamento com o técnico como responsável; avisa o solicitante", async () => {
    const chamado = await criarFonteSimulada(RAFAEL.id).executarAcao(42, "assumir");
    expect(chamado).toMatchObject({ status: "em_andamento", responsavelId: RAFAEL.id });
    expect(ultimoEvento(42)).toMatchObject({ acao: "assumido", autorId: RAFAEL.id, publico: true });
    expect(notificacoesDe(42)).toMatchObject([
      { tipo: "chamado_assumido", destinatarioId: ANA.id, status: "pendente" },
    ]);
  });

  it("transferido só o técnico de destino assume", async () => {
    await expect(criarFonteSimulada(THIAGO.id).executarAcao(39, "assumir")).rejects.toMatchObject({
      codigo: "SEM_PERMISSAO",
    });
    expect((await criarFonteSimulada(RAFAEL.id).executarAcao(39, "assumir")).status).toBe(
      "em_andamento",
    );
  });
});

describe("transferir e devolver", () => {
  it("transferir grava o motivo só para a TI e avisa o destino e o solicitante", async () => {
    const chamado = await criarFonteSimulada(RAFAEL.id).executarAcao(38, "transferir", {
      destinoId: THIAGO.id,
      motivo: "Thiago cuida das licenças",
    });
    expect(chamado).toMatchObject({ status: "transferido", responsavelId: THIAGO.id });
    expect(ultimoEvento(38)).toMatchObject({
      acao: "transferido",
      publico: false,
      detalhe: { motivo: "Thiago cuida das licenças", para_responsavel_id: THIAGO.id },
    });
    expect(
      notificacoesDe(38)
        .map((n) => n.destinatarioId)
        .sort(),
    ).toEqual([ANA.id, THIAGO.id].sort());
  });

  it("transferir para quem não é da TI → CAMPO_OBRIGATORIO", async () => {
    await expect(
      criarFonteSimulada(RAFAEL.id).executarAcao(38, "transferir", {
        destinoId: ANA.id,
        motivo: "teste",
      }),
    ).rejects.toMatchObject({ codigo: "CAMPO_OBRIGATORIO" });
  });
});

describe("status e encerramento", () => {
  it("concluir direto de aguardando usuário, mesmo sem resposta do solicitante", async () => {
    const fonte = criarFonteSimulada(RAFAEL.id);
    const concluido = await fonte.executarAcao(41, "concluir");
    expect(concluido.status).toBe("concluido");
    expect(concluido.concluidoEm).not.toBeNull();
    expect(
      notificacoesDe(41).every((n) => n.tipo === "status_alterado" && n.destinatarioId === ANA.id),
    ).toBe(true);
  });

  it("TI cancela com motivo um chamado em atendimento", async () => {
    const chamado = await criarFonteSimulada(RAFAEL.id).executarAcao(38, "cancelar", {
      motivo: "Pedido duplicado",
    });
    expect(chamado).toMatchObject({ status: "cancelado", motivoCancelamento: "Pedido duplicado" });
  });

  it("concluído não aceita mais ações → TRANSICAO_INVALIDA", async () => {
    await expect(
      criarFonteSimulada(RAFAEL.id).executarAcao(35, "cancelar", { motivo: "teste" }),
    ).rejects.toMatchObject({ codigo: "TRANSICAO_INVALIDA" });
  });
});

describe("solicitante não faz ações da TI", () => {
  it("todas as ações da TI → SEM_PERMISSAO para a Ana, até no próprio chamado", async () => {
    const fonte = criarFonteSimulada(ANA.id);
    const acoes: AcaoChamado[] = ["assumir", "transferir", "concluir"];
    for (const acao of acoes) {
      await expect(
        fonte.executarAcao(41, acao, { motivo: "tentativa", destinoId: RAFAEL.id }),
      ).rejects.toMatchObject({ codigo: "SEM_PERMISSAO" });
    }
    await expect(fonte.proximoDaFila()).rejects.toMatchObject({ codigo: "SEM_PERMISSAO" });
  });

  it("chamado de outra pessoa → SEM_PERMISSAO (não revela que existe)", async () => {
    await expect(
      criarFonteSimulada(ANA.id).executarAcao(36, "cancelar", { motivo: "x y z" }),
    ).rejects.toMatchObject({
      codigo: "SEM_PERMISSAO",
    });
  });
});

describe("fila e contadores", () => {
  it("próximo da fila = o pendente mais antigo (novos não têm prazo — ADR 0012)", async () => {
    const proximo = await criarFonteSimulada(RAFAEL.id).proximoDaFila();
    const pendentes = lerEstado()
      .chamados.filter((c) => c.status === "pendente")
      .sort((a, b) => a.criadoEm.localeCompare(b.criadoEm));
    expect(proximo?.id).toBe(pendentes[0].id);
  });

  it("contagem de mensagens não lidas por chamado (TI vê as dos outros)", async () => {
    const contagem = await criarFonteSimulada(RAFAEL.id).contarNaoLidas();
    expect(contagem[31]).toBe(1); // mensagem do Thiago no #31
    expect(contagem[41]).toBeUndefined(); // as do #41 são do próprio Rafael
  });

  it("abrir chamado avisa o solicitante e cada técnico ativo", async () => {
    const criado = await criarFonteSimulada(ANA.id).criarChamado({
      categoriaId: CATEGORIAS.find((c) => c.nome === "Outros")!.id,
      titulo: "Pedido novo",
      respostas: { descricao: "Detalhes" },
      anexos: [],
    });
    expect(
      notificacoesDe(criado.id)
        .map((n) => n.destinatarioId)
        .sort(),
    ).toEqual([ANA.id, RAFAEL.id, THIAGO.id].sort());
    expect(notificacoesDe(criado.id).every((n) => n.tipo === "chamado_aberto")).toBe(true);
  });

  it("mensagem da TI avisa o solicitante; nota interna não avisa ninguém", async () => {
    const fonte = criarFonteSimulada(RAFAEL.id);
    await fonte.enviarMensagem({ chamadoId: 38, conteudo: "Instalando agora", anexos: [] });
    await fonte.enviarMensagem({ chamadoId: 38, conteudo: "anotação", interna: true, anexos: [] });
    expect(notificacoesDe(38)).toMatchObject([{ tipo: "nova_mensagem", destinatarioId: ANA.id }]);
  });
});

describe("perfil completo (contato)", () => {
  it("TI lê o contato do solicitante; solicitante só o próprio", async () => {
    const contato = await criarFonteSimulada(RAFAEL.id).obterPerfilCompleto(ANA.id);
    expect(contato.email).toBe("ana@teste.local");
    await expect(criarFonteSimulada(ANA.id).obterPerfilCompleto(RAFAEL.id)).rejects.toMatchObject({
      codigo: "SEM_PERMISSAO",
    });
    expect((await criarFonteSimulada(ANA.id).obterPerfilCompleto(ANA.id)).id).toBe(ANA.id);
  });
});

describe("consultas do quadro e dos encerrados (views da migration 0020)", () => {
  it("quadro: uma consulta com abertos + encerrados recentes, quem transferiu e não lidas", async () => {
    const quadro = await criarFonteSimulada(RAFAEL.id).listarQuadro();
    const porId = new Map(quadro.map((c) => [c.id, c]));
    expect(porId.get(39)?.transferidoPorId).toBe(THIAGO.id); // #39 foi transferido pelo Thiago
    expect(porId.get(31)?.naoLidas).toBe(1); // mensagem do Thiago no #31 que o Rafael não leu
    expect(quadro.every((c) => c.status !== "cancelado" || c.id === 32)).toBe(true);
  });

  it("solicitante não vê quem transferiu (motivo/autor da transferência é só da TI)", async () => {
    const quadro = await criarFonteSimulada(ANA.id).listarQuadro();
    expect(quadro.every((c) => c.solicitanteId === ANA.id)).toBe(true);
    expect(quadro.every((c) => c.transferidoPorId === null)).toBe(true);
  });

  it("encerrados vêm paginados, do mais recente ao mais antigo", async () => {
    const estado = lerEstado();
    const base = estado.chamados.find((c) => c.status === "concluido")!;
    const extras = Array.from({ length: 25 }, (_, i) => ({
      ...base,
      id: 100 + i,
      titulo: `Antigo ${i}`,
      concluidoEm: new Date(Date.UTC(2026, 0, 1 + i)).toISOString(),
    }));
    gravarEstado({ ...estado, chamados: [...estado.chamados, ...extras] });

    const fonte = criarFonteSimulada(RAFAEL.id);
    const primeira = await fonte.listarEncerrados(1);
    expect(primeira.itens).toHaveLength(20);
    // Percorre todas as páginas (o histórico de exemplo do Dashboard também é encerrado).
    const todos = [...primeira.itens];
    for (let pagina = 2; todos.length < primeira.total; pagina++) {
      const proxima = await fonte.listarEncerrados(pagina);
      expect(proxima.total).toBe(primeira.total);
      expect(proxima.itens.length).toBeGreaterThan(0);
      todos.push(...proxima.itens);
    }
    expect(todos).toHaveLength(primeira.total);
    const datas = todos.map((c) => c.concluidoEm ?? c.canceladoEm!);
    expect(datas).toEqual([...datas].sort().reverse());
  });
});
