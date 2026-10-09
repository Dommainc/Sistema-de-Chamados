/**
 * Marca da DOMMA (logo das montanhas, `public/logo-domma.png`) + subtítulo da área (pedido do dono, 2026-10-09).
 * A imagem é branca com fundo transparente; ela entra como MÁSCARA e a cor vem dos tokens: branca na barra escura
 * da TI e azul da marca nas páginas claras do solicitante (senão sumiria no fundo branco).
 */
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
  const corMarca = tema === "escuro" ? "bg-sobre-barra" : "bg-primaria";
  const corSub = tema === "escuro" ? "text-sobre-barra-suave" : "text-texto-suave";
  return (
    <span className={`flex ${emLinha ? "items-center gap-3" : "flex-col gap-1 leading-tight"}`}>
      <span
        role="img"
        aria-label="DOMMA"
        className={`block h-7 w-[76px] shrink-0 [mask-image:url(/logo-domma.png)] [mask-position:left_center] [mask-repeat:no-repeat] [mask-size:contain] ${corMarca}`}
      />
      <span className={`text-sm ${corSub}`}>{subtitulo}</span>
    </span>
  );
}
