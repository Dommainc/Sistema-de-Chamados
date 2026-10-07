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
  id,
  marcador,
}: {
  nome: string;
  valor: string;
  rotulo: string;
  selecionado: boolean;
  aoSelecionar: (valor: string) => void;
  multipla?: boolean;
  id?: string;
  /** Classe de cor de um quadradinho ao lado do texto (ex.: cor do sistema — lib/sistemas.ts). */
  marcador?: string;
}) {
  return (
    <label
      className={`flex min-h-14 cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 transition-colors ${
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
        className="size-6 shrink-0 accent-primaria"
      />
      {marcador ? (
        <span aria-hidden="true" className={`size-4 shrink-0 rounded ${marcador}`} />
      ) : null}
      <span>{rotulo}</span>
    </label>
  );
}
