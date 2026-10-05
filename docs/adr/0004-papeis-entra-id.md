# ADR 0004 — Papéis vindos de grupo do Entra ID

**Status:** aceito · **Data:** 2026-10-03

## Decisão
Dois papéis: `solicitante` (padrão) e `ti` (todos da TI com o mesmo acesso).
Quem está no grupo de segurança **`Central-Chamados-TI`** vira `ti`.
- O grupo é atribuído ao Enterprise App e o token emite só "grupos atribuídos ao aplicativo"
  (evita o limite de 200 grupos no token).
- A cada login a FastAPI lê o claim `groups` e atualiza `profiles.papel`.
- Sem claim ou claim inválido → `solicitante` + log (menor privilégio).
- O papel não é editável na Central; a tela "Equipe de TI" é só leitura.

## Motivos
Fonte única da verdade, revogação automática ao sair do grupo, auditoria no Entra,
sem problema de "primeiro admin".

## Consequências
- Remoção do grupo vale no próximo login/renovação de token (até ~1h).
- **Validar no início da implementação do login:** se o Supabase repassa o claim `groups`.
  Se não repassar, o plano B (leitura no Graph só no login) precisa de aprovação, pois é
  integração além das permitidas.
