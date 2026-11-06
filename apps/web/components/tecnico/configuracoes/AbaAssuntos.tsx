"use client";

import { Pencil, Plus } from "lucide-react";
import { useState } from "react";
import { AreaTexto } from "@/components/ui/AreaTexto";
import { Botao } from "@/components/ui/Botao";
import { Campo } from "@/components/ui/Campo";
import { IconeCategoria } from "@/components/ui/IconeCategoria";
import { Modal } from "@/components/ui/Modal";
import { useDados } from "@/lib/dados/provedor";
import type { AssuntoConfig, DadosAssunto, DadosConfiguracoes } from "@/lib/dados/tipos";
import { ICONES_ASSUNTO, ROTULO_ICONE } from "@/lib/dominio/configuracoes";
import { Quadro, SeloDesativado, SetasOrdem, mover, useGravar } from "./comum";

const VAZIO: DadosAssunto = { nome: "", nomeCurto: "", descricao: "", icone: "ellipsis" };

/** Aba "Assuntos": os cartões da tela inicial do "Abrir chamado". */
export function AbaAssuntos({ dados }: { dados: DadosConfiguracoes }) {
  const fonte = useDados();
  const { gravar, salvando } = useGravar();
  const [editando, setEditando] = useState<AssuntoConfig | "novo" | null>(null);
  const assuntos = dados.assuntos;

  return (
    <Quadro
      titulo={`Assuntos · ${assuntos.filter((a) => a.ativo).length} na tela inicial`}
      acao={
        <Botao variante="contorno" onClick={() => setEditando("novo")}>
          <Plus aria-hidden="true" className="size-4" /> Novo assunto
        </Botao>
      }
    >
      <p className="text-sm text-texto-suave">
        Desativar tira o assunto da tela inicial; os chamados que já foram abertos nele continuam
        normais. Um assunto novo já vem com a pergunta &quot;Descreva o que está acontecendo&quot;.
      </p>
      <ul className="flex flex-col gap-2">
        {assuntos.map((a, i) => (
          <li
            key={a.id}
            className={`flex flex-wrap items-center gap-3 rounded-xl border border-borda p-3 ${a.ativo ? "" : "bg-superficie-2"}`}
          >
            <SetasOrdem
              nome={a.nomeCurto}
              primeiro={i === 0}
              ultimo={i === assuntos.length - 1}
              desabilitado={salvando}
              aoMover={(d) =>
                void gravar(
                  () => fonte.ordenarAssuntos(mover(assuntos, i, d).map((x) => x.id)),
                  "Ordem salva.",
                )
              }
            />
            <IconeCategoria icone={a.icone} />
            <div className="flex min-w-0 flex-1 flex-col">
              <span className="flex flex-wrap items-center gap-2 font-semibold">
                {a.nomeCurto} {a.ativo ? null : <SeloDesativado />}
              </span>
              <span className="text-sm text-texto-suave">{a.descricao || "Sem descrição"}</span>
            </div>
            <div className="flex gap-2">
              <Botao variante="contorno" onClick={() => setEditando(a)}>
                <Pencil aria-hidden="true" className="size-4" /> Editar
              </Botao>
              <Botao
                variante={a.ativo ? "perigo" : "fantasma"}
                disabled={salvando}
                onClick={() =>
                  void gravar(
                    () => fonte.editarAssunto(a.id, { ativo: !a.ativo }),
                    a.ativo ? "Assunto desativado." : "Assunto reativado.",
                  )
                }
              >
                {a.ativo ? "Desativar" : "Reativar"}
              </Botao>
            </div>
          </li>
        ))}
      </ul>
      {editando ? (
        <FormAssunto
          inicial={editando === "novo" ? null : editando}
          aoFechar={() => setEditando(null)}
        />
      ) : null}
    </Quadro>
  );
}

function FormAssunto({
  inicial,
  aoFechar,
}: {
  inicial: AssuntoConfig | null;
  aoFechar: () => void;
}) {
  const fonte = useDados();
  const { gravar, salvando, errosCampos } = useGravar();
  const [form, setForm] = useState<DadosAssunto>(
    inicial
      ? {
          nome: inicial.nome,
          nomeCurto: inicial.nomeCurto,
          descricao: inicial.descricao,
          icone: inicial.icone,
        }
      : VAZIO,
  );
  const campo = (k: keyof DadosAssunto) => (v: string) => setForm((f) => ({ ...f, [k]: v }));

  async function salvar() {
    const ok = await gravar(
      () => (inicial ? fonte.editarAssunto(inicial.id, form) : fonte.criarAssunto(form)),
      inicial ? "Assunto salvo." : "Assunto criado. Ele já aparece na tela inicial.",
    );
    if (ok) aoFechar();
  }

  return (
    <Modal aberto titulo={inicial ? "Editar assunto" : "Novo assunto"} aoFechar={aoFechar}>
      <form
        className="flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          void salvar();
        }}
      >
        <Campo
          rotulo="Nome na tela inicial"
          required
          maxLength={40}
          value={form.nomeCurto}
          onChange={(e) => campo("nomeCurto")(e.target.value)}
          erro={errosCampos.nomeCurto}
          ajuda='O que o colaborador vê no cartão. Ex.: "Outros pedidos para a TI".'
        />
        <Campo
          rotulo="Nome completo"
          required
          maxLength={120}
          value={form.nome}
          onChange={(e) => campo("nome")(e.target.value)}
          erro={errosCampos.nome}
          ajuda="Aparece para a TI no quadro, nos filtros e no Excel."
        />
        <AreaTexto
          rotulo="Descrição"
          maxLength={300}
          rows={2}
          value={form.descricao}
          onChange={(e) => campo("descricao")(e.target.value)}
        />
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1.5 font-semibold">Ícone</legend>
          <div className="flex flex-wrap gap-2">
            {ICONES_ASSUNTO.map((icone) => (
              <label
                key={icone}
                className={`cursor-pointer rounded-xl border-2 p-0.5 has-[:focus-visible]:outline has-[:focus-visible]:outline-2 ${form.icone === icone ? "border-primaria" : "border-transparent"}`}
              >
                <input
                  type="radio"
                  name="icone"
                  value={icone}
                  checked={form.icone === icone}
                  onChange={() => campo("icone")(icone)}
                  className="sr-only"
                  aria-label={ROTULO_ICONE[icone]}
                />
                <span title={ROTULO_ICONE[icone]}>
                  <IconeCategoria icone={icone} />
                </span>
              </label>
            ))}
          </div>
        </fieldset>
        <div className="flex justify-end gap-2">
          <Botao variante="contorno" onClick={aoFechar}>
            Cancelar
          </Botao>
          <Botao type="submit" carregando={salvando}>
            {inicial ? "Salvar" : "Criar assunto"}
          </Botao>
        </div>
      </form>
    </Modal>
  );
}
