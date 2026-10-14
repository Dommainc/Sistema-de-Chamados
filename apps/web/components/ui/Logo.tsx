/**
 * Logo da DOMMA (montanhas, `public/logo-domma.png`), sem texto ao lado (pedido do dono, 2026-10-13): nos cabeçalhos
 * ela é o link para voltar ao início. A imagem é branca com fundo transparente; entra como MÁSCARA e a cor vem dos
 * tokens: branca na barra escura da TI e azul da marca nas páginas claras (senão sumiria no fundo branco).
 */
export function Logo({ tema = "claro" }: { tema?: "claro" | "escuro" }) {
  const cor = tema === "escuro" ? "bg-sobre-barra" : "bg-primaria";
  return (
    <span
      role="img"
      aria-label="DOMMA"
      className={`block h-8 w-[87px] shrink-0 [mask-image:url(/logo-domma.png)] [mask-position:left_center] [mask-repeat:no-repeat] [mask-size:contain] ${cor}`}
    />
  );
}
