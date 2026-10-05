-- =============================================================================
-- 0002 — Configurações gerais, feriados e cálculo de horário útil (SLA)
-- =============================================================================

create table public.configuracoes (
  chave          text primary key check (chave ~ '^[a-z][a-z0-9_]{2,63}$'),
  valor          jsonb not null,
  descricao      text,
  publico        boolean not null default false,  -- legível por qualquer usuário logado
  atualizado_em  timestamptz not null default now(),
  atualizado_por uuid
);
comment on table public.configuracoes is
  'Parâmetros editáveis pela TI (expediente, limites de anexo, fechamento automático...).';

create trigger configuracoes_atualizado_em
  before update on public.configuracoes
  for each row execute function app.definir_atualizado_em();

create table public.feriados (
  data      date primary key,
  nome      text not null,
  escopo    text not null check (escopo in ('nacional', 'estadual', 'municipal', 'ponto_facultativo')),
  ativo     boolean not null default true,  -- desative em vez de apagar, se a DOMMA trabalhar no dia
  criado_em timestamptz not null default now()
);
comment on table public.feriados is
  'Dias sem expediente. Usados no cálculo de prazo e no fechamento automático.';

-- -----------------------------------------------------------------------------
-- Leitura de configuração com valor padrão
-- -----------------------------------------------------------------------------
create or replace function app.config_texto(p_chave text, p_padrao text)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (select c.valor #>> '{}' from public.configuracoes c where c.chave = p_chave),
    p_padrao
  );
$$;

-- -----------------------------------------------------------------------------
-- É dia útil? (seg–sex, fora de feriado ativo)
-- -----------------------------------------------------------------------------
create or replace function app.eh_dia_util(p_dia date)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select extract(isodow from p_dia) < 6
     and not exists (
       select 1 from public.feriados f where f.data = p_dia and f.ativo
     );
$$;

-- -----------------------------------------------------------------------------
-- Soma N horas úteis a um instante, respeitando expediente e feriados.
-- Ex.: sexta 17:00 + 2h (expediente 08–18) => segunda 09:00.
-- -----------------------------------------------------------------------------
create or replace function app.adicionar_horas_uteis(p_inicio timestamptz, p_horas numeric)
returns timestamptz
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_tz        text     := app.config_texto('fuso_horario', 'America/Sao_Paulo');
  v_ini       time     := app.config_texto('expediente_inicio', '08:00')::time;
  v_fim       time     := app.config_texto('expediente_fim', '18:00')::time;
  v_local     timestamp := p_inicio at time zone v_tz;
  v_restante  interval := make_interval(secs => p_horas * 3600);
  v_dia       date;
  v_abre      timestamp;
  v_fecha     timestamp;
  v_disponivel interval;
  v_guarda    integer  := 0;
begin
  if p_inicio is null or p_horas is null or p_horas <= 0 then
    return p_inicio;
  end if;

  loop
    v_guarda := v_guarda + 1;
    if v_guarda > 3700 then
      raise exception 'adicionar_horas_uteis: sem dias úteis em 10 anos (verifique feriados/expediente)';
    end if;

    v_dia := v_local::date;

    if app.eh_dia_util(v_dia) then
      v_abre  := v_dia + v_ini;
      v_fecha := v_dia + v_fim;

      if v_local < v_abre then
        v_local := v_abre;
      end if;

      if v_local < v_fecha then
        v_disponivel := v_fecha - v_local;
        if v_restante <= v_disponivel then
          return (v_local + v_restante) at time zone v_tz;
        end if;
        v_restante := v_restante - v_disponivel;
      end if;
    end if;

    v_local := (v_dia + 1) + v_ini;
  end loop;
end;
$$;

-- -----------------------------------------------------------------------------
-- Soma N dias úteis mantendo o horário. Usado no fechamento automático.
-- -----------------------------------------------------------------------------
create or replace function app.adicionar_dias_uteis(p_inicio timestamptz, p_dias integer)
returns timestamptz
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_tz     text      := app.config_texto('fuso_horario', 'America/Sao_Paulo');
  v_local  timestamp := p_inicio at time zone v_tz;
  v_contados integer := 0;
  v_guarda integer   := 0;
begin
  if p_inicio is null or p_dias is null or p_dias <= 0 then
    return p_inicio;
  end if;

  while v_contados < p_dias loop
    v_guarda := v_guarda + 1;
    if v_guarda > 3700 then
      raise exception 'adicionar_dias_uteis: sem dias úteis em 10 anos';
    end if;
    v_local := v_local + interval '1 day';
    if app.eh_dia_util(v_local::date) then
      v_contados := v_contados + 1;
    end if;
  end loop;

  return v_local at time zone v_tz;
end;
$$;
