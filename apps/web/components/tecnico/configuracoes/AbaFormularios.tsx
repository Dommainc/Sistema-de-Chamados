"use client";

import { Lock, Plus, Trash2, Undo2 } from "lucide-react";
import { useMemo, useState } from "react";
import { Botao } from "@/components/ui/Botao";
import { useDados } from "@/lib/dados/provedor";
import type { CampoOpcoesConfig, DadosConfiguracoes, OpcaoEditada } from "@/lib/dados/tipos";
import {
  MAX_NOME_OPCAO,
  compararOpcoes,
  mudancaVazia,
  resumoMudanca,
} from "@/lib/dominio/configuracoes";
import { CORES_PALETA, type CorPaleta } from "@/lib/dominio/tipos";
import { classesDaCor } from "@/lib/sistemas";
import { Quadro, SetasOrdem, mover, nomeDaCor, useGravar } from "./comum";

/** Linha editável: `chave` fixa para o React não trocar os campos de lugar ao reordenar. */
interface Linha extends OpcaoEditada {
  chave: number;
}

let proximaChave = 1;

function linhasDe(campo: CampoOpcoesConfig): Linha[] {
  return campo.opcoes.map((nome) => ({
    chave: proximaChave++,
    nome,
    cor: campo.cores[nome] ?? null,
    antigo: nome,
  }));
}

/** Aba "Formulários": escolhe a pergunta e edita a lista de opções dela. */
export function AbaFormularios({ dados }: { dados: DadosConfiguracoes }) {
  const [campoId, setCampoId] = useState<number | null>(dados.campos[0]?.id ?? null);
  const campo = dados.campos.find((c) => c.id === campoId) ?? dados.campos[0];
  const nomeAssunto = (id: number) => dados.assuntos.find((a) => a.id === id)?.nomeCurto ?? "";

  if (!campo) return <p className="text-texto-suave">Nenhuma pergunta de opções cadastrada.</p>;

  return (
    <div className="flex flex-col gap-4">
      <label className="flex w-full max-w-xl flex-col gap-1.5">
        <span className="font-semibold">Pergunta</span>
        <select
          value={campo.id}
          onChange={(e) => setCampoId(Number(e.target.value))}
          className="min-h-12 w-full rounded-xl border border-borda bg-superficie px-3"
        >
          {dados.campos.map((c) => (
            <option key={c.id} value={c.id}>
              {c.label} — {nomeAssunto(c.categoriaId)} ({c.opcoes.length})
            </option>
          ))}
        </select>
      </label>
      {/* key: trocar de pergunta (ou salvar) recomeça a edição a partir do que está no banco. */}
      <EditorOpcoes key={`${campo.id}:${campo.opcoes.join("|")}`} campo={campo} />
    </div>
  );
}

function EditorOpcoes({ campo }: { campo: CampoOpcoesConfig }) {
  const fonte = useDados();
  const { gravar, salvando, errosCampos, limparErros } = useGravar();
  const [linhas, setLinhas] = useState<Linha[]>(() => linhasDe(campo));
  const [nova, setNova] = useState("");
  // Só os sistemas têm cor hoje; perguntas sem nenhuma cor não mostram o seletor.
  const temCores = Object.keys(campo.cores).length > 0;

  const mudanca = useMemo(() => compararOpcoes(campo.opcoes, campo.cores, linhas), [campo, linhas]);
  const alterado = !mudancaVazia(mudanca);

  function atualizar(chave: number, dados: Partial<Linha>) {
    limparErros();
    setLinhas((atual) => atual.map((l) => (l.chave === chave ? { ...l, ...dados } : l)));
  }

  function adicionar() {
    const nome = nova.trim();
    if (!nome) return;
    limparErros();
    setLinhas((atual) => [...atual, { chave: proximaChave++, nome, cor: null, antigo: null }]);
    setNova("");
  }

  function salvar() {
    void gravar(
      () =>
        fonte.salvarOpcoes(
          campo.id,
          linhas.map(({ nome, cor, antigo }) => ({ nome, cor, antigo })),
        ),
      "Lista salva. Os próximos chamados já usam as opções novas.",
    );
  }

  return (
    <Quadro titulo={`${campo.label} · ${linhas.length} opções`}>
      <p className="text-sm text-texto-suave">
        Renomear não muda os chamados antigos: eles continuam com o nome que foi escolhido na época.
      </p>
      <ol className="flex flex-col gap-2">
        {linhas.map((linha, i) => {
          const travada = linha.antigo !== null && campo.travadas.includes(linha.antigo);
          const erro = errosCampos[`opcoes.${i}`];
          const classes = classesDaCor(linha.cor);
          return (
            <li key={linha.chave} className="flex flex-col gap-1">
              {/* Celular: nome numa linha; cor e "Retirar" na linha de baixo. */}
              <div className="flex flex-wrap items-center gap-2 rounded-xl border border-borda p-2 sm:border-0 sm:p-0">
                <SetasOrdem
                  nome={linha.nome || "opção"}
                  primeiro={i === 0}
                  ultimo={i === linhas.length - 1}
                  aoMover={(d) => setLinhas((atual) => mover(atual, i, d))}
                />
                <input
                  value={linha.nome}
                  onChange={(e) => atualizar(linha.chave, { nome: e.target.value })}
                  maxLength={MAX_NOME_OPCAO}
                  aria-label={`Nome da opção ${i + 1}`}
                  aria-invalid={erro ? true : undefined}
                  className={`min-h-11 min-w-0 flex-1 basis-40 rounded-xl border bg-superficie px-3 ${erro ? "border-perigo" : "border-borda"}`}
                />
                {temCores ? (
                  <span className="flex items-center gap-2 pl-2 sm:pl-0">
                    <span
                      aria-hidden="true"
                      className={`size-5 shrink-0 rounded-full border border-borda ${classes?.fundo ?? "bg-superficie"}`}
                    />
                    <select
                      value={linha.cor ?? ""}
                      onChange={(e) =>
                        atualizar(linha.chave, {
                          cor: (e.target.value || null) as CorPaleta | null,
                        })
                      }
                      aria-label={`Cor de ${linha.nome || "opção"}`}
                      className="min-h-11 w-40 rounded-xl border border-borda bg-superficie px-2 text-sm"
                    >
                      <option value="">Sem cor</option>
                      {CORES_PALETA.map((cor) => (
                        <option key={cor} value={cor}>
                          {nomeDaCor(cor)}
                        </option>
                      ))}
                    </select>
                  </span>
                ) : null}
                {travada ? (
                  <span
                    className="ml-auto inline-flex min-h-11 w-32 items-center justify-center gap-1 text-sm text-texto-suave sm:ml-0"
                    title="Esta opção abre outra pergunta (o módulo) e não pode sair da lista."
                  >
                    <Lock aria-hidden="true" className="size-4" /> Abre o módulo
                  </span>
                ) : (
                  <Botao
                    variante="perigo"
                    className="ml-auto w-32 sm:ml-0"
                    aria-label={`Retirar ${linha.nome || "opção"}`}
                    onClick={() => {
                      limparErros();
                      setLinhas((atual) => atual.filter((l) => l.chave !== linha.chave));
                    }}
                  >
                    <Trash2 aria-hidden="true" className="size-4" /> Retirar
                  </Botao>
                )}
              </div>
              {erro ? (
                <p role="alert" className="text-sm font-medium text-perigo">
                  {erro}
                </p>
              ) : null}
            </li>
          );
        })}
      </ol>

      <form
        className="flex flex-wrap gap-2 border-t border-borda pt-3"
        onSubmit={(e) => {
          e.preventDefault();
          adicionar();
        }}
      >
        <input
          value={nova}
          onChange={(e) => setNova(e.target.value)}
          maxLength={MAX_NOME_OPCAO}
          placeholder="Nome da nova opção"
          aria-label="Nome da nova opção"
          className="min-h-11 min-w-0 flex-1 rounded-xl border border-borda bg-superficie px-3"
        />
        <Botao type="submit" variante="contorno" disabled={!nova.trim()}>
          <Plus aria-hidden="true" className="size-4" /> Adicionar
        </Botao>
      </form>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-superficie-2 p-3">
        <p className="min-w-0 text-sm" aria-live="polite">
          {alterado ? (
            <>
              <span className="font-semibold">O que vai mudar: </span>
              {resumoMudanca(mudanca)}
            </>
          ) : (
            <span className="text-texto-suave">Nenhuma mudança ainda.</span>
          )}
        </p>
        <div className="flex gap-2">
          <Botao
            variante="contorno"
            disabled={!alterado || salvando}
            onClick={() => {
              limparErros();
              setLinhas(linhasDe(campo));
            }}
          >
            <Undo2 aria-hidden="true" className="size-4" /> Desfazer
          </Botao>
          <Botao disabled={!alterado} carregando={salvando} onClick={salvar}>
            Salvar lista
          </Botao>
        </div>
      </div>
    </Quadro>
  );
}
