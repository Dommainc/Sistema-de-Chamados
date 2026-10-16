-- =============================================================================
-- 0025 — Tela clara ou escura (pedido do dono, 2026-10-15)
--
-- Cada pessoa escolhe o tema no botão ☀/🌙; a escolha fica no PERFIL para valer em qualquer
-- computador ou celular (no login o site copia para um cookie, para abrir já na cor certa).
-- Padrão: claro. Gravado só pela API (PATCH /me/tema), como o resto do perfil.
-- =============================================================================

alter table public.profiles
  add column tema text not null default 'claro'
  constraint profiles_tema_valido check (tema in ('claro', 'escuro'));

comment on column public.profiles.tema is
  'Tela clara ou escura escolhida pela pessoa (botão ☀/🌙). Padrão: claro.';
