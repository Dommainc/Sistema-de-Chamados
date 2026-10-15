// @vitest-environment node
//
// Integração da camada `real` (CI, job `banco`): a mesma fonte de dados das telas contra o Supabase local e a FastAPI
// de verdade. Só roda com INTEGRACAO_REAL=1 (o CI liga; na máquina do dono não há Supabase local).

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";
import type { FonteDeDados, UsuarioSessao } from "@/lib/dados/tipos";
import { chamarApi } from "./api";
import { criarFonteReal } from "./index";

const ligado = process.env.INTEGRACAO_REAL === "1";
const URL_SUPABASE = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const CHAVE_ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

/** Entra como um usuário de teste do seed.dev.sql e devolve a fonte `real` dele. */
async function entrar(email: string): Promise<{ fonte: FonteDeDados; supabase: SupabaseClient }> {
  const supabase = createClient(URL_SUPABASE, CHAVE_ANON, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await supabase.auth.signInWithPassword({ email, password: "teste123" });
  if (error || !data.session) throw new Error(`login de ${email} falhou`);
  const perfil = await chamarApi<UsuarioSessao>("/auth/sincronizar", {
    metodo: "POST",
    token: data.session.access_token,
  });
  return {
    fonte: criarFonteReal({ id: perfil.id, nome: perfil.nome, papel: perfil.papel }, supabase),
    supabase,
  };
}

/** PNG de 1×1 (o Storage confere o tipo). */
function pngMinimo(): Blob {
  const bytes = Uint8Array.from(
    atob(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=",
    ),
    (c) => c.charCodeAt(0),
  );
  return new Blob([bytes], { type: "image/png" });
}

describe.runIf(ligado)("camada real contra o Supabase local e a API", () => {
  it("ciclo completo: abrir com print, iniciar, conversar, concluir e avaliar", async () => {
    const ana = await entrar("ana@teste.local");
    const rafael = await entrar("tec@teste.local");
    const bruno = await entrar("bruno@teste.local");

    // --- Ana abre um chamado com um print colado
    const categorias = await ana.fonte.listarCategorias();
    expect(categorias.map((c) => c.nome)).toContain("Outros");
    const outros = categorias.find((c) => c.nome === "Outros")!;
    const campos = await ana.fonte.listarCamposForm(outros.id);
    expect(campos.map((c) => c.chave)).toContain("descricao");
    const png = pngMinimo();
    const { id } = await ana.fonte.criarChamado({
      categoriaId: outros.id,
      titulo: "Teste da camada real",
      respostas: { descricao: "Aberto pelo teste de integração." },
      anexos: [
        {
          arquivo: png,
          nome: "print-20261015-090000.png",
          mime: "image/png",
          tamanho: png.size,
          origem: "colado",
        },
      ],
    });
    expect(await ana.fonte.obterChamado(id)).toMatchObject({ status: "pendente", prazoSla: null });
    expect((await ana.fonte.listarChamados({ escopo: "meus" })).map((c) => c.id)).toContain(id);
    await expect(bruno.fonte.obterChamado(id)).rejects.toMatchObject({ codigo: "SEM_PERMISSAO" });

    // --- Rafael vê no quadro, inicia, responde, define prioridade e prazo
    expect((await rafael.fonte.listarQuadro()).map((c) => c.id)).toContain(id);
    await expect(
      rafael.fonte.definirPrazo(id, new Date(Date.now() + 86_400_000).toISOString()),
    ).rejects.toMatchObject({
      codigo: "CHAMADO_NAO_INICIADO",
    });
    expect(await rafael.fonte.executarAcao(id, "assumir")).toMatchObject({
      status: "em_andamento",
    });
    await rafael.fonte.enviarMensagem({
      chamadoId: id,
      conteudo: "Oi, Ana! Já estou vendo.",
      anexos: [],
    });
    await rafael.fonte.enviarMensagem({
      chamadoId: id,
      conteudo: "Nota só da TI",
      interna: true,
      anexos: [],
    });
    expect((await rafael.fonte.definirPrioridade(id, "alta")).prioridade).toBe("alta");
    const prazo = new Date(Date.now() + 2 * 86_400_000).toISOString();
    expect((await rafael.fonte.definirPrazo(id, prazo)).prazoSla).not.toBeNull();

    // --- Ana: mensagem nova, sem a nota interna; o print está lá e abre
    expect(await ana.fonte.listarNaoLidos()).toContain(id);
    const conversaAna = await ana.fonte.listarMensagens(id);
    expect(conversaAna.map((m) => m.conteudo)).toContain("Oi, Ana! Já estou vendo.");
    expect(conversaAna.map((m) => m.conteudo)).not.toContain("Nota só da TI");
    await ana.fonte.marcarComoLido(id);
    expect(await ana.fonte.listarNaoLidos()).not.toContain(id);
    const anexos = await ana.fonte.listarAnexos(id);
    expect(anexos).toHaveLength(1);
    expect(anexos[0]).toMatchObject({ nome: "print-20261015-090000.png", origem: "colado" });
    expect(await ana.fonte.abrirAnexo(anexos[0].id)).toMatch(/^http/);
    await ana.fonte.enviarMensagem({ chamadoId: id, conteudo: "Obrigada!", anexos: [] });

    // --- Rafael conclui; Ana avalia uma vez
    expect(await rafael.fonte.executarAcao(id, "concluir")).toMatchObject({ status: "concluido" });
    await expect(ana.fonte.executarAcao(id, "cancelar", { motivo: "teste" })).rejects.toMatchObject(
      {
        codigo: "CANCELAMENTO_NAO_PERMITIDO",
      },
    );
    expect(await ana.fonte.avaliarChamado(id, 5, "Rápido")).toMatchObject({ nota: 5 });
    await expect(ana.fonte.avaliarChamado(id, 4)).rejects.toMatchObject({
      codigo: "AVALIACAO_JA_ENVIADA",
    });
    expect(await rafael.fonte.obterAvaliacao(id)).toMatchObject({ nota: 5, comentario: "Rápido" });

    // --- Histórico, encerrados e Dashboard
    const acoes = (await rafael.fonte.listarHistorico(id)).map((h) => h.acao);
    expect(acoes).toEqual(expect.arrayContaining(["criado", "assumido", "concluido", "avaliado"]));
    expect((await rafael.fonte.listarEncerrados(1)).itens.map((c) => c.id)).toContain(id);
    const agora = new Date();
    const dados = await rafael.fonte.listarDadosMetricas(
      new Date(agora.getTime() - 86_400_000).toISOString(),
      new Date(agora.getTime() + 86_400_000).toISOString(),
    );
    expect(dados.chamados.map((c) => c.id)).toContain(id);
    expect(dados.avaliacoes.map((a) => a.chamadoId)).toContain(id);
    expect(dados.expediente).toMatchObject({ inicio: "08:00", fim: "20:00" });
    await expect(
      ana.fonte.listarDadosMetricas(agora.toISOString(), agora.toISOString()),
    ).rejects.toMatchObject({ codigo: "SEM_PERMISSAO" });
  }, 60_000);

  it("leituras de apoio: perfis, sistemas com cor, respostas prontas só para a TI e contadores", async () => {
    const ana = await entrar("ana@teste.local");
    const rafael = await entrar("tec@teste.local");
    expect((await ana.fonte.obterMeuPerfil()).papel).toBe("solicitante");
    expect((await ana.fonte.listarPerfisPublicos()).map((p) => p.nome)).toContain("Rafael Lima");
    const sistemas = await ana.fonte.listarSistemas();
    expect(sistemas.find((s) => s.nome === "Sienge")?.cor).toBe("vermelho");
    expect((await rafael.fonte.listarRespostasProntas()).length).toBeGreaterThanOrEqual(14);
    expect(await ana.fonte.listarRespostasProntas()).toEqual([]);
    const contadores = await rafael.fonte.obterContadores();
    expect(contadores.fila).toBeGreaterThanOrEqual(0);
  }, 30_000);
});
