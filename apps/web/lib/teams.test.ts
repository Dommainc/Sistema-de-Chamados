import { describe, expect, it } from "vitest";
import { linkChatTeams } from "./teams";

describe("linkChatTeams", () => {
  it("abre o chat do Teams com o e-mail da pessoa", () => {
    expect(linkChatTeams("ana.souza@dommainc.com.br")).toBe(
      "https://teams.microsoft.com/l/chat/0/0?users=ana.souza%40dommainc.com.br",
    );
  });
});
