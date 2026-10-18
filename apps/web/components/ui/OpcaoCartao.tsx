/**
 * Opção em cartão (mockup, tela 2: "O que é?", "Qual sistema?").
 * `multipla` = caixa de seleção (várias respostas); senão, rádio.
 */
export function OpcaoCartao({
  nome,
  valor,
  rotulo,
  selecionado,
  aoSelecionar,
  multipla = false,
  compacto = false,
  id,
}: {
  nome: string;
  valor: string;
  rotulo: string;
  selecionado: boolean;
  aoSelecionar: (valor: string) => void;
  multipla?: boolean;
  /** Botão menor, para listas grandes em grade (ex.: os sistemas). */
  compacto?: boolean;
  id?: string;
}) {
  return (
    <label
      className={`flex cursor-pointer items-center rounded-xl border transition-colors ${
        compacto ? "min-h-11 gap-2 px-3 py-2 text-sm" : "min-h-14 gap-3 px-4 py-3"
      } ${
        selecionado
          ? "border-primaria bg-primaria-suave font-semibold ring-1 ring-primaria"
          : "border-borda bg-superficie hover:border-primaria"
      }`}
    >
      <input
        id={id}
        type={multipla ? "checkbox" : "radio"}
        name={nome}
        value={valor}
        checked={selecionado}
        onChange={() => aoSelecionar(valor)}
        className={`${compacto ? "size-5" : "size-6"} shrink-0 accent-primaria`}
      />
      <span>{rotulo}</span>
    </label>
  );
}
