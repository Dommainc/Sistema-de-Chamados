import { Dica, Passos } from "@/components/comum/Guia";

/**
 * Como instalar o app "Portal de Chamados" no Teams e o que ele traz (pedido do dono, 2026-11-11). Usado no guia
 * do colaborador (/ajuda) e no "Como abrir um chamado" da TI (/atendimento/ajuda/abrir).
 */
export function GuiaAppTeams({ paraTi = false }: { paraTi?: boolean }) {
  return (
    <>
      <p className="text-lg">
        O app <strong>Portal de Chamados</strong> manda os avisos da Central direto no seu Teams, no
        computador e no celular. Você não precisa ficar entrando na Central para saber se alguém
        respondeu.
      </p>
      <p className="text-lg font-semibold">O que você ganha:</p>
      <ul className="flex list-disc flex-col gap-2 pl-6 text-lg">
        <li>
          Aviso na hora quando a TI <strong>começa a atender</strong>, <strong>responde</strong> ou{" "}
          <strong>conclui</strong> o seu chamado, e quando define a previsão.
        </li>
        <li>
          <strong>Lembrete</strong> quando a TI está esperando a sua resposta, antes de o chamado
          ser concluído sozinho.
        </li>
        <li>
          Botão <strong>Abrir chamado</strong> em cada aviso: um clique e você cai direto na
          conversa.
        </li>
        {paraTi ? (
          <li>
            Para a TI: aviso de cada <strong>chamado novo</strong>, de chamado{" "}
            <strong>transferido para você</strong> e das respostas dos solicitantes.
          </li>
        ) : null}
      </ul>
      <p className="text-lg font-semibold">Como instalar (uma vez só):</p>
      <Passos>
        <li>
          Abra o <strong>Teams</strong> e clique em <strong>Aplicativos</strong>, na barra da
          esquerda (no celular: <strong>Mais</strong> → <strong>Aplicativos</strong>).
        </li>
        <li>
          Entre em <strong>Criado para sua organização</strong> (ou procure por{" "}
          <strong>Portal de Chamados</strong> na busca).
        </li>
        <li>
          Clique em <strong>Portal de Chamados</strong> → <strong>Adicionar</strong>.
        </li>
        <li>Pronto: o app aparece nos seus chats e os próximos avisos já chegam por ele.</li>
      </Passos>
      <Dica>
        se o app já aparece nos seus chats, a TI instalou para você e não precisa fazer nada. Os
        avisos são só de ida: para falar com a TI, use o chat do chamado na Central (mensagens
        escritas no Teams não chegam à TI).
      </Dica>
    </>
  );
}
