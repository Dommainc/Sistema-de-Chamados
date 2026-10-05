/** Marca "DOMMA" do mockup: letras espaçadas + subtítulo da área. */
export function Logo({
  subtitulo,
  tema = "claro",
  emLinha = false,
}: {
  subtitulo: string;
  tema?: "claro" | "escuro";
  /** true = subtítulo ao lado (barra técnica); false = abaixo (portal). */
  emLinha?: boolean;
}) {
  const corMarca = tema === "escuro" ? "text-sobre-barra" : "text-texto";
  const corSub = tema === "escuro" ? "text-sobre-barra-suave" : "text-texto-suave";
  return (
    <span className={`flex ${emLinha ? "items-baseline gap-3" : "flex-col leading-tight"}`}>
      <span className={`text-lg font-bold tracking-[0.2em] ${corMarca}`}>DOMMA</span>
      <span className={`text-sm ${corSub}`}>{subtitulo}</span>
    </span>
  );
}
