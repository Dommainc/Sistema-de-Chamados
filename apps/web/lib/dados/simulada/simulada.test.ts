import { beforeEach, describe, expect, it } from "vitest";
import { ErroApp } from "@/lib/erros/catalogo";
import { _reiniciarParaTestes, estadoInicial, gravarEstado } from "./armazenamento";
import { CAMPOS_FORM, CATEGORIAS } from "./exemplos";
import { criarFonteSimulada } from "./index";
import { USUARIOS_SIMULADOS } from "./usuarios";

const [ANA, BRUNO, TECNICO] = USUARIOS_SIMULADOS;

beforeEach(() => {
  localStorage.clear();
  _reiniciarParaTestes();
  gravarEstado(estadoInicial(new Date("2026-10-06T15:00:00Z")));
});

describe("dados de exemplo", () => {
  it("toda categoria tem nome curto e ícone (docs/ui-ux.md)", () => {
    for (const c of CATEGORIAS) {
      expect(c.nomeCurto.length).toBeGreaterThan(1);
      expect(c.icone).toMatch(/^[a-z][a-z0-9-]+$/);
    }
  });

  it("têm as 13 categorias do seed com campo descrição (menos Novo colaborador e Desligamento)", () => {
    expect(CATEGORIAS).toHaveLength(13); // Microsoft (une E-mail/Outlook e Teams) + Infraestrutura
    const comDescricao = new Set(
      CAMPOS_FORM.filter((c) => c.chave === "descricao").map((c) => c.categoriaId),
    );
    expect(comDescricao.size).toBe(11);
  });

  it("chamados com responsável seguem as regras do banco (ADR 0005)", async () => {
    const todos = await criarFonteSimulada(TECNICO.id).listarChamados({ escopo: "todos" });
    for (const c of todos) {
      if (c.status === "pendente") expect(c.responsavelId).toBeNull();
      if (["em_andamento", "aguardando_usuario", "transferido"].includes(c.status)) {
        expect(c.responsavelId).not.toBeNull();
      }
    }
  });
});

describe("visibilidade (equivalente ao RLS)", () => {
  it("solicitante só vê os próprios chamados, em qualquer escopo", async () => {
    const fonte = criarFonteSimulada(ANA.id);
    for (const escopo of ["meus", "fila", "meus_atendimentos", "todos"] as const) {
      const lista = await fonte.listarChamados({ escopo });
      expect(lista.length).toBeGreaterThan(0);
      expect(lista.every((c) => c.solicitanteId === ANA.id)).toBe(true);
    }
  });

  it("TI vê todos os chamados", async () => {
    const todos = await criarFonteSimulada(TECNICO.id).listarChamados({ escopo: "todos" });
    const solicitantes = new Set(todos.map((c) => c.solicitanteId));
    expect(solicitantes.has(ANA.id)).toBe(true);
    expect(solicitantes.has(BRUNO.id)).toBe(true);
    expect(solicitantes.size).toBeGreaterThan(2);
  });

  it("fila da TI = só pendentes", async () => {
    const fila = await criarFonteSimulada(TECNICO.id).listarChamados({ escopo: "fila" });
    expect(fila.length).toBeGreaterThan(0);
    expect(fila.every((c) => c.status === "pendente")).toBe(true);
  });

  it("solicitante recebe SEM_PERMISSAO para chamado de outro e para número inexistente", async () => {
    const doBruno = (await criarFonteSimulada(BRUNO.id).listarChamados({ escopo: "meus" }))[0];
    const fonteAna = criarFonteSimulada(ANA.id);
    await expect(fonteAna.obterChamado(doBruno.id)).rejects.toMatchObject({
      codigo: "SEM_PERMISSAO",
    });
    await expect(fonteAna.obterChamado(9999)).rejects.toMatchObject({ codigo: "SEM_PERMISSAO" });
  });

  it("TI recebe CHAMADO_NAO_ENCONTRADO para número inexistente", async () => {
    await expect(criarFonteSimulada(TECNICO.id).obterChamado(9999)).rejects.toMatchObject({
      codigo: "CHAMADO_NAO_ENCONTRADO",
    });
  });
});

describe("perfil e primeiro acesso", () => {
  it("Ana começa sem departamento e o cadastro fica salvo", async () => {
    const fonte = criarFonteSimulada(ANA.id);
    expect((await fonte.obterMeuPerfil()).departamento).toBeNull();
    await fonte.atualizarMeuPerfil({ departamento: "  Engenharia ", telefone: "" });
    const perfil = await fonte.obterMeuPerfil();
    expect(perfil.departamento).toBe("Engenharia");
    expect(perfil.telefone).toBeNull();
  });

  it("departamento vazio dá CAMPO_OBRIGATORIO com erro no campo", async () => {
    const erro = await criarFonteSimulada(ANA.id)
      .atualizarMeuPerfil({ departamento: " ", telefone: null })
      .catch((e: unknown) => e);
    expect(erro).toBeInstanceOf(ErroApp);
    expect((erro as ErroApp).codigo).toBe("CAMPO_OBRIGATORIO");
    expect((erro as ErroApp).campos[0].campo).toBe("departamento");
  });

  it("atualizar o perfil não muda o papel", async () => {
    const fonte = criarFonteSimulada(ANA.id);
    await fonte.atualizarMeuPerfil({ departamento: "Obras", telefone: null });
    expect((await fonte.obterMeuPerfil()).papel).toBe("solicitante");
  });

  it("perfis públicos não expõem e-mail nem telefone", async () => {
    const perfis = await criarFonteSimulada(ANA.id).listarPerfisPublicos();
    for (const p of perfis) {
      expect(p).not.toHaveProperty("email");
      expect(p).not.toHaveProperty("telefone");
    }
  });
});

describe("contadores e avisos de mudança", () => {
  it("conta fila e meus atendimentos do técnico", async () => {
    const contadores = await criarFonteSimulada(TECNICO.id).obterContadores();
    expect(contadores.fila).toBe(7);
    expect(contadores.meusAtendimentos).toBe(3); // como no mockup: "3 em atendimento"
  });

  it("avisa quem está ouvindo quando os dados mudam", async () => {
    const fonte = criarFonteSimulada(ANA.id);
    let avisos = 0;
    const cancelar = fonte.aoMudar(() => avisos++);
    await fonte.atualizarMeuPerfil({ departamento: "Obras", telefone: null });
    cancelar();
    await fonte.atualizarMeuPerfil({ departamento: "Financeiro", telefone: null });
    expect(avisos).toBe(1);
  });
});
