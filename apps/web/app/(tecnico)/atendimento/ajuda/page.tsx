import type { Metadata } from "next";
import { Dica, Figura, Guia, Indice, Passos, SecaoGuia } from "@/components/comum/Guia";

export const metadata: Metadata = { title: "Ajuda da TI" };

const SECOES = [
  { id: "acesso", titulo: "Quem é da TI na Central" },
  { id: "quadro", titulo: "O quadro" },
  { id: "atender", titulo: "Atender um chamado" },
  { id: "conversa", titulo: "Conversa e notas internas" },
  { id: "automacoes", titulo: "O que a Central faz sozinha" },
  { id: "dashboard", titulo: "Dashboard, relatório e avaliações" },
  { id: "teams", titulo: "Teams e resumo mensal" },
];

/** Guia da equipe de TI (também vira docs/guia/guia-ti.pdf). */
export default function PaginaAjudaTi() {
  return (
    <Guia
      titulo="Guia da TI"
      subtitulo="Como atender pela Central de Chamados: do quadro à conclusão, com os números para a gestão."
    >
      <Indice itens={SECOES} />

      <SecaoGuia id="acesso" titulo="Quem é da TI na Central">
        <p className="text-lg">
          A Central sabe quem é da TI pelo grupo <strong>Central-Chamados-TI</strong> do Microsoft
          (Entra). A cada login ela confere o grupo: quem está nele entra na área da TI; quem não
          está entra como solicitante. Não precisa mudar nada no cadastro da pessoa.
        </p>
        <p className="text-lg font-semibold">Para incluir alguém na TI:</p>
        <Passos>
          <li>
            Acesse <strong>entra.microsoft.com</strong> → <strong>Grupos</strong> →{" "}
            <strong>Todos os grupos</strong> → procure <strong>Central-Chamados-TI</strong>.
          </li>
          <li>
            Em <strong>Membros</strong>, clique em <strong>Adicionar membros</strong> e escolha a
            pessoa.
          </li>
          <li>
            Peça para a pessoa <strong>sair e entrar de novo</strong> na Central: o acesso muda no
            próximo login.
          </li>
        </Passos>
        <p className="text-lg">
          <strong>Para tirar alguém:</strong> remova a pessoa do grupo. No próximo login ela volta a
          ser solicitante, e o histórico dos chamados que ela atendeu continua guardado.
        </p>
        <Dica>
          tem que ser esse grupo específico (ser administrador do Microsoft 365 ou estar em outro
          grupo não dá acesso) e a pessoa precisa ser <strong>membro</strong>; quem é só
          proprietário não conta. A Central não tem tela para trocar o papel de ninguém, de
          propósito.
        </Dica>
      </SecaoGuia>

      <SecaoGuia id="quadro" titulo="O quadro">
        <p className="text-lg">
          O quadro mostra os chamados por situação: <strong>Novos</strong>,{" "}
          <strong>Transferidos</strong>, <strong>Em atendimento</strong>,{" "}
          <strong>Aguardando solicitante</strong>, <strong>Concluídos</strong> e{" "}
          <strong>Cancelados</strong> (Concluídos e Cancelados mostram os dos últimos 7 dias; os
          mais antigos aparecem na busca e no relatório). Em cima, o resumo (em aberto, atrasados e
          aguardando) e os filtros: responsável, categoria, sistema, prioridade e{" "}
          <strong>Só os meus</strong>.
        </p>
        <Figura arquivo="computador-07-quadro.png" legenda="Quadro de atendimento" />
        <Dica>
          na busca, digite o número (ex.: 42) para abrir o chamado direto, ou parte do título ou do
          nome do solicitante. Chamado com prioridade <strong>Alta</strong> sobe para o topo da
          coluna; atrasado aparece como &quot;Atrasado 35min&quot; no rodapé do cartão.
        </Dica>
      </SecaoGuia>

      <SecaoGuia id="atender" titulo="Atender um chamado">
        <Passos>
          <li>
            Abra o chamado e clique em <strong>Iniciar</strong> (ou arraste o cartão de Novos para
            Em atendimento). Você vira o responsável.
          </li>
          <li>
            Depois de iniciar, defina a <strong>prioridade</strong> (Alta, Média ou Baixa) e, se
            quiser, o <strong>prazo</strong>. O solicitante vê a previsão; mudar o prazo pede o
            motivo.
          </li>
          <li>
            Para passar para um colega, use <strong>Transferir</strong> (com o motivo). O colega
            precisa iniciar de novo.
          </li>
          <li>
            Resolvido: <strong>Marcar como concluído</strong>. Não precisa da resposta do
            solicitante. Pedido errado ou duplicado: <strong>Cancelar chamado</strong> (com o
            motivo).
          </li>
        </Passos>
        <Figura arquivo="computador-08-atendimento.png" legenda="Tela de atendimento" />
        <p className="text-lg">
          No painel ao lado ficam o pedido e os <strong>outros chamados da mesma pessoa</strong>{" "}
          (para ver se o problema é recorrente). Quando o solicitante usa &quot;O problema
          voltou&quot;, aparece <strong>&quot;↻ continuação do #N&quot;</strong> com o link do
          anterior.
        </p>
      </SecaoGuia>

      <SecaoGuia id="conversa" titulo="Conversa e notas internas">
        <p className="text-lg">
          Tudo fica numa linha do tempo só: as mensagens com o solicitante (✓ = enviada, ✓✓ azul =
          ele já leu), as <strong>notas internas</strong> em amarelo, com o cadeado, e o que
          aconteceu no chamado (início, transferência com o motivo, prazo).
        </p>
        <p className="text-lg">
          Em cima do campo, escolha <strong>Responder</strong> (o solicitante recebe e é avisado no
          Teams) ou <strong>Nota interna</strong> (só a TI vê: anote o que foi verificado e o que
          foi feito).
        </p>
        <Figura arquivo="computador-08b-nota-interna.png" legenda="Nota interna: só a TI vê" />
        <Figura
          arquivo="computador-08c-respostas-prontas.png"
          legenda="Respostas prontas: o nome do solicitante entra sozinho"
        />
        <Dica>cole prints com Ctrl+V direto no chat (até 5 arquivos por mensagem).</Dica>
      </SecaoGuia>

      <SecaoGuia id="automacoes" titulo="O que a Central faz sozinha">
        <p className="text-lg">
          Tudo em horas úteis (segunda a sexta, 8h às 20h), contando da última mensagem da TI:
        </p>
        <ul className="flex flex-col gap-2 text-lg">
          <li>
            <strong>2 h</strong> sem resposta: o chamado vai para{" "}
            <strong>Aguardando solicitante</strong>.
          </li>
          <li>
            <strong>12 h</strong>: lembrete no Teams para o solicitante.
          </li>
          <li>
            <strong>24 h</strong>: aviso automático no chat do chamado.
          </li>
          <li>
            <strong>48 h</strong>: o chamado é <strong>concluído automaticamente</strong>.
          </li>
        </ul>
        <p className="text-lg">
          Quando o solicitante responde, a contagem zera e o chamado volta para Em atendimento.
        </p>
      </SecaoGuia>

      <SecaoGuia id="dashboard" titulo="Dashboard, relatório e avaliações">
        <p className="text-lg">
          No botão <strong>Dashboard</strong>: números do período (7 dias, 30 dias, mês…), volume
          por categoria, sistema e departamento, desempenho de cada técnico e prazos.{" "}
          <strong>Baixar relatório (Excel)</strong> gera um arquivo com o resumo, todos os chamados
          e uma aba para cada situação.
        </p>
        <Figura arquivo="computador-10-dashboard.png" legenda="Dashboard" />
        <p className="text-lg">
          Em <strong>Ver todas as avaliações</strong> ficam as notas e os comentários dos
          solicitantes.
        </p>
      </SecaoGuia>

      <SecaoGuia id="teams" titulo="Teams e resumo mensal">
        <p className="text-lg">
          Com o app <strong>Portal de Chamados</strong> no Teams, você recebe os avisos de chamado
          novo, de transferência e das respostas dos solicitantes. No 1º dia útil de cada mês, às
          8h, a gestão recebe o <strong>resumo da TI</strong> do mês anterior.
        </p>
      </SecaoGuia>
    </Guia>
  );
}
