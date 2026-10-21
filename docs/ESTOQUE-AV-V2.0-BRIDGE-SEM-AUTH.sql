-- ESTOQUE AV V2.0 - Ponte segura com o login JA EXISTENTE do Gerencial.
-- Execute no SQL Editor do mesmo projeto Supabase usado pelo Gerencial.
-- Nao cria usuarios Supabase Auth. Nao altera a tela ou o login do Gerencial.
-- Depende de estoque_av_cloud (ja instalado nas etapas anteriores).
-- Nao apaga registros da tabela de estoque.

begin;

create table if not exists public.estoque_av_bridge_sessions (
  token_hash text primary key check (length(token_hash) = 64),
  workspace_id text not null references public.estoque_av_cloud(workspace_id) on delete cascade,
  operador text not null,
  credencial_versao integer not null default 1,
  criado_em timestamptz not null default now(),
  expira_em timestamptz not null
);
create index if not exists estoque_av_bridge_sessions_expira_idx
  on public.estoque_av_bridge_sessions(expira_em);

create table if not exists public.estoque_av_bridge_attempts (
  chave text primary key,
  tentativas integer not null default 0,
  janela_inicio timestamptz not null default now(),
  bloqueado_ate timestamptz
);

create table if not exists public.estoque_av_bridge_operations (
  operacao_id uuid primary key,
  workspace_id text not null references public.estoque_av_cloud(workspace_id) on delete cascade,
  operador text not null,
  revisao_resultado bigint not null,
  gravado_em timestamptz not null default now()
);
create index if not exists estoque_av_bridge_operations_workspace_idx
 on public.estoque_av_bridge_operations(workspace_id,gravado_em desc);

alter table public.estoque_av_bridge_sessions enable row level security;
alter table public.estoque_av_bridge_attempts enable row level security;
alter table public.estoque_av_bridge_operations enable row level security;
revoke all on public.estoque_av_bridge_sessions from public,anon,authenticated;
revoke all on public.estoque_av_bridge_attempts from public,anon,authenticated;
revoke all on public.estoque_av_bridge_operations from public,anon,authenticated;

-- Grava o documento inteiro de forma atomica, com CAS e chave de idempotencia.
-- Somente Edge Function com service_role deve invocar este procedimento.
create or replace function public.estoque_av_bridge_commit(
  p_workspace text,
  p_expected_revision bigint,
  p_payload jsonb,
  p_operation_id uuid,
  p_operador text
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $estoque_bridge$
declare
  v_current bigint;
  v_existing bigint;
  v_next bigint;
begin
  if p_workspace is null or p_expected_revision is null or p_payload is null or
     p_operation_id is null or p_operador is null or p_operador !~ '^[0-9]{1,10}$' then
    raise exception 'PARAMETROS_INVALIDOS' using errcode = '22023';
  end if;
  select o.revisao_resultado into v_existing
    from public.estoque_av_bridge_operations o
    where o.operacao_id = p_operation_id;
  if found then
    return jsonb_build_object('revision',v_existing,'replayed',true);
  end if;

  select revision into v_current from public.estoque_av_cloud
    where workspace_id=p_workspace for update;
  if not found then
    raise exception 'AMBIENTE_INEXISTENTE' using errcode = 'P0002';
  end if;
  -- Revalidar depois do bloqueio, para impedir corridas de idempotencia.
  select o.revisao_resultado into v_existing
    from public.estoque_av_bridge_operations o
    where o.operacao_id = p_operation_id;
  if found then
    return jsonb_build_object('revision',v_existing,'replayed',true);
  end if;
  if v_current <> p_expected_revision then
    raise exception 'CONFLITO_DE_VERSAO' using errcode = '40001';
  end if;
  if jsonb_typeof(p_payload) <> 'object' or
     jsonb_typeof(p_payload->'stores') <> 'array' or
     jsonb_typeof(p_payload->'products') <> 'array' or
     jsonb_typeof(p_payload->'ledger') <> 'array' or
     jsonb_typeof(p_payload->'transfers') <> 'array' or
     jsonb_typeof(p_payload->'losses') <> 'array' or
     jsonb_typeof(p_payload->'inventories') <> 'array' or
     jsonb_typeof(p_payload->'receipts') <> 'array' then
    raise exception 'ESTADO_INVALIDO' using errcode = '22023';
  end if;
  if pg_column_size(p_payload) > 6 * 1024 * 1024 then
    raise exception 'LIMITE_DE_DADOS' using errcode = '54000';
  end if;
  v_next = v_current + 1;
  update public.estoque_av_cloud
     set state = p_payload, revision=v_next, updated_at=now(), updated_by=null
   where workspace_id=p_workspace;
  insert into public.estoque_av_bridge_operations(operacao_id,workspace_id,operador,revisao_resultado)
    values (p_operation_id,p_workspace,p_operador,v_next);
  return jsonb_build_object('revision',v_next,'replayed',false);
end;
$estoque_bridge$;

revoke all on function public.estoque_av_bridge_commit(text,bigint,jsonb,uuid,text)
 from public,anon,authenticated;
grant execute on function public.estoque_av_bridge_commit(text,bigint,jsonb,uuid,text) to service_role;

commit;

-- Conferencia somente leitura (rodar separadamente se o editor nao exibir resultados):
select
 to_regclass('public.estoque_av_cloud') is not null as estoque,
 to_regclass('public.estoque_av_bridge_sessions') is not null as sessoes,
 to_regclass('public.estoque_av_bridge_operations') is not null as operacoes,
 to_regprocedure('public.estoque_av_bridge_commit(text,bigint,jsonb,uuid,text)') is not null as funcao;
