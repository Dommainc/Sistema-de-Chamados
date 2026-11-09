import { Dica, Figura, Passos } from "@/components/comum/Guia";

/**
 * Passo a passo de "Abrir um chamado", igual para o colaborador (/ajuda) e para a TI quando ela mesma abre um
 * chamado (/atendimento/ajuda/abrir). Muda só onde começa.
 */
export function PassosAbrirChamado({ inicio }: { inicio: React.ReactNode }) {
  return (
    <>
      <Passos>
        <li>
          {inicio} escolha o <strong>assunto</strong> (Acessos e permissões, Infraestrutura,
          Microsoft ou Outros pedidos).
        </li>
        <li>
          Escreva um <strong>resumo curto</strong> (ex.: &quot;Impressora do 3º andar não
          imprime&quot;) e responda às perguntas. Em acessos, escolha o sistema; no Sienge e no
          CVCRM, escolha também o módulo (se não souber, marque &quot;Não sei&quot;).
        </li>
        <li>
          Conte o que está acontecendo e, se puder, <strong>cole um print</strong> da tela com{" "}
          <strong>Ctrl+V</strong>. Dá para enviar até 5 arquivos por vez.
        </li>
        <li>
          Clique em <strong>Enviar chamado</strong>. Pronto: você recebe o número do chamado (ex.:
          #42).
        </li>
      </Passos>
      <Figura arquivo="computador-02-abrir-passo1.png" legenda="Passo 1: escolha o assunto" />
      <Figura
        arquivo="computador-03b-abrir-acessos.png"
        legenda="Passo 2: em acessos, escolha o sistema (dá para buscar pelo nome)"
      />
      <Dica>
        um problema por chamado. Se forem duas coisas diferentes, abra dois chamados: cada uma vai
        para quem resolve.
      </Dica>
    </>
  );
}
