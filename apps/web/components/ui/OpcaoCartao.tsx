/** Opção de rádio em cartão (mockup, tela 2: "Quem está sem conexão?"). */
export function OpcaoCartao({
  nome,
  valor,
  rotulo,
  selecionado,
  aoSelecionar,
}: {
  nome: string;
  valor: string;
  rotulo: string;
  selecionado: boolean;
  aoSelecionar: (valor: string) => void;
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
        type="radio"
        name={nome}
        value={valor}
        checked={selecionado}
        onChange={() => aoSelecionar(valor)}
        className="size-6 accent-primaria"
      />
      <span>{rotulo}</span>
    </label>
  );
}
