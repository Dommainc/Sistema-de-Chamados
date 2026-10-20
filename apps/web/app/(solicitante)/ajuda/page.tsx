import type { Metadata } from "next";
import Link from "next/link";
import { Dica, Figura, Guia, Indice, Passos, SecaoGuia } from "@/components/comum/Guia";

export const metadata: Metadata = { title: "Ajuda" };

const SECOES = [
  { id: "entrar", titulo: "Entrar na Central" },
  { id: "abrir", titulo: "Abrir um chamado" },
  { id: "acompanhar", titulo: "Acompanhar e conversar" },
  { id: "status", titulo: "O que cada situação quer dizer" },
  { id: "concluido", titulo: "Quando terminar" },
  { id: "teams", titulo: "Avisos no Teams" },
];

/** Guia do colaborador (também vira docs/guia/guia-solicitante.pdf). */
export default function PaginaAjuda() {
  return (
    <Guia
      titulo="Como pedir ajuda para a TI"
      subtitulo="A Central de Chamados é o lugar para pedir qualquer coisa à TI da DOMMA e acompanhar até resolver."
    >
      <Indice itens={SECOES} />

      <SecaoGuia id="entrar" titulo="Entrar na Central">
        <p className="text-lg">
          Clique em <strong>Entrar com a conta Microsoft</strong> e use a mesma conta do e-mail e do
          Teams. Não precisa de senha nova. No primeiro acesso, a Central pergunta o seu
          departamento.
        </p>
        <Dica>dá para usar no celular também: abra o mesmo endereço no navegador do celular.</Dica>
      </SecaoGuia>

      <SecaoGuia id="abrir" titulo="Abrir um chamado">
        <Passos>
          <li>
            Na página inicial, escolha o <strong>assunto</strong> (Acessos e permissões,
            Infraestrutura, Microsoft ou Outros pedidos).
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
      </SecaoGuia>

      <SecaoGuia id="acompanhar" titulo="Acompanhar e conversar">
        <p className="text-lg">
          Em{" "}
          <Link href="/meus-chamados" className="font-semibold text-primaria underline">
            Meus chamados
          </Link>{" "}
          você vê todos os seus pedidos. Clique em um para ver a conversa com a TI. Quando o técnico
          responder, aparece <strong>&quot;Nova mensagem&quot;</strong>.
        </p>
        <Figura
          arquivo="computador-06-chamado-solicitante.png"
          legenda="A conversa com a TI fica dentro do chamado"
        />
        <Dica>
          se a TI pedir alguma informação, responda pelo chat do chamado. Assim fica tudo registrado
          no mesmo lugar.
        </Dica>
      </SecaoGuia>

      <SecaoGuia id="status" titulo="O que cada situação quer dizer">
        <ul className="flex flex-col gap-2 text-lg">
          <li>
            <strong>Recebido:</strong> a TI já recebeu e logo começa a atender.
          </li>
          <li>
            <strong>Em atendimento:</strong> um técnico está cuidando do seu pedido.
          </li>
          <li>
            <strong>Aguardando sua resposta:</strong> a TI precisa de algo de você. Responda no chat
            para continuar.
          </li>
          <li>
            <strong>Concluído:</strong> resolvido.
          </li>
          <li>
            <strong>Cancelado:</strong> a TI encerrou sem fazer (o motivo aparece no chamado).
          </li>
        </ul>
        <p className="text-lg">
          Se a TI te fizer uma pergunta e você não responder, a Central lembra você no Teams e,
          depois de <strong>48 horas úteis</strong> sem resposta, o chamado é concluído sozinho. A
          TI atende de segunda a sexta, das 8h às 20h.
        </p>
      </SecaoGuia>

      <SecaoGuia id="concluido" titulo="Quando terminar">
        <p className="text-lg">
          No chamado concluído, diga <strong>como foi o atendimento</strong> (de 1 a 5 estrelas).
          Leva 10 segundos e ajuda a TI a melhorar.
        </p>
        <Figura arquivo="computador-06b-avaliacao.png" legenda="Avaliação do atendimento" />
        <p className="text-lg">
          <strong>O problema voltou?</strong> No chamado concluído, clique em{" "}
          <strong>&quot;O problema voltou&quot;</strong>. Abre um chamado novo, já preenchido e
          ligado ao anterior, e a TI vê todo o histórico.
        </p>
      </SecaoGuia>

      <SecaoGuia id="teams" titulo="Avisos no Teams">
        <p className="text-lg">
          O app <strong>Portal de Chamados</strong> no Teams avisa você quando a TI começa a
          atender, responde ou conclui o seu chamado. É só clicar em <strong>Abrir chamado</strong>{" "}
          no aviso. Para conversar com a TI, use o chat do chamado na Central: mensagens escritas no
          Teams não chegam à TI.
        </p>
      </SecaoGuia>
    </Guia>
  );
}
