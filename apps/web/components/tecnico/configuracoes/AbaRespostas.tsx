"use client";

import { Pencil, Plus } from "lucide-react";
import { useState } from "react";
import { AreaTexto } from "@/components/ui/AreaTexto";
import { Botao } from "@/components/ui/Botao";
import { Campo } from "@/components/ui/Campo";
import { Modal } from "@/components/ui/Modal";
import { useDados } from "@/lib/dados/provedor";
import type {
  DadosConfiguracoes,
  DadosRespostaPronta,
  RespostaProntaConfig,
} from "@/lib/dados/tipos";
import { Quadro, SeloDesativado, SetasOrdem, mover, useGravar } from "./comum";

/** Aba "Respostas prontas": os textos do botão "Respostas prontas" do chat da TI. */
export function AbaRespostas({ dados }: { dados: DadosConfiguracoes }) {
  const fonte = useDados();
  const { gravar, salvando } = useGravar();
  const [editando, setEditando] = useState<RespostaProntaConfig | "nova" | null>(null);
  const respostas = dados.respostas;

  return (
    <Quadro
      titulo={`Respostas prontas · ${respostas.filter((r) => r.ativo).length} no chat`}
      acao={
        <Botao variante="contorno" onClick={() => setEditando("nova")}>
          <Plus aria-hidden="true" className="size-4" /> Nova resposta
        </Botao>
      }
    >
      <p className="text-sm text-texto-suave">
        Use <strong>{"{nome}"}</strong> no texto para entrar o primeiro nome do solicitante
        (&quot;Oi, {"{nome}"}!&quot; vira &quot;Oi, Ana!&quot;).
      </p>
      <ul className="flex flex-col gap-2">
        {respostas.map((r, i) => (
          <li
            key={r.id}
            className={`flex flex-wrap items-start gap-3 rounded-xl border border-borda p-3 ${r.ativo ? "" : "bg-superficie-2"}`}
          >
            <SetasOrdem
              nome={r.titulo}
              primeiro={i === 0}
              ultimo={i === respostas.length - 1}
              desabilitado={salvando}
              aoMover={(d) =>
                void gravar(
                  () => fonte.ordenarRespostasProntas(mover(respostas, i, d).map((x) => x.id)),
                  "Ordem salva.",
                )
              }
            />
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="flex flex-wrap items-center gap-2 font-semibold">
                {r.titulo} {r.ativo ? null : <SeloDesativado />}
              </span>
              <span className="text-sm break-words text-texto-suave">{r.texto}</span>
            </div>
            <div className="flex gap-2">
              <Botao variante="contorno" onClick={() => setEditando(r)}>
                <Pencil aria-hidden="true" className="size-4" /> Editar
              </Botao>
              <Botao
                variante={r.ativo ? "perigo" : "fantasma"}
                disabled={salvando}
                onClick={() =>
                  void gravar(
                    () => fonte.editarRespostaPronta(r.id, { ativo: !r.ativo }),
                    r.ativo ? "Resposta desativada." : "Resposta reativada.",
                  )
                }
              >
                {r.ativo ? "Desativar" : "Reativar"}
              </Botao>
            </div>
          </li>
        ))}
      </ul>
      {editando ? (
        <FormResposta
          inicial={editando === "nova" ? null : editando}
          aoFechar={() => setEditando(null)}
        />
      ) : null}
    </Quadro>
  );
}

function FormResposta({
  inicial,
  aoFechar,
}: {
  inicial: RespostaProntaConfig | null;
  aoFechar: () => void;
}) {
  const fonte = useDados();
  const { gravar, salvando, errosCampos } = useGravar();
  const [form, setForm] = useState<DadosRespostaPronta>({
    titulo: inicial?.titulo ?? "",
    texto: inicial?.texto ?? "",
  });

  async function salvar() {
    const ok = await gravar(
      () =>
        inicial ? fonte.editarRespostaPronta(inicial.id, form) : fonte.criarRespostaPronta(form),
      inicial ? "Resposta salva." : "Resposta criada. Ela já aparece no chat.",
    );
    if (ok) aoFechar();
  }

  return (
    <Modal
      aberto
      titulo={inicial ? "Editar resposta pronta" : "Nova resposta pronta"}
      aoFechar={aoFechar}
    >
      <form
        className="flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          void salvar();
        }}
      >
        <Campo
          rotulo="Título"
          required
          maxLength={60}
          value={form.titulo}
          onChange={(e) => setForm((f) => ({ ...f, titulo: e.target.value }))}
          erro={errosCampos.titulo}
          ajuda='Curto, para achar na lista. Ex.: "Pedir print".'
        />
        <AreaTexto
          rotulo="Texto"
          required
          maxLength={2000}
          rows={5}
          value={form.texto}
          onChange={(e) => setForm((f) => ({ ...f, texto: e.target.value }))}
          erro={errosCampos.texto}
        />
        <div className="flex justify-end gap-2">
          <Botao variante="contorno" onClick={aoFechar}>
            Cancelar
          </Botao>
          <Botao type="submit" carregando={salvando}>
            {inicial ? "Salvar" : "Criar resposta"}
          </Botao>
        </div>
      </form>
    </Modal>
  );
}
