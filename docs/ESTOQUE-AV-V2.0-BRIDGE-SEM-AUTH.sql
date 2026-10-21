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

-- Trilha para restauros extraordinarios. Preserva o estado anterior para auditoria/rollback.
create table if not exists public.estoque_av_bridge_restores (
  id bigserial primary key,
  workspace_id text not null,
  operacao_id uuid not null unique,
  operador text not null,
  revisao_anterior bigint not null,
  estado_anterior jsonb not null,
  gravado_em timestamptz not null default now()
);
alter table public.estoque_av_bridge_restores enable row level security;
revoke all on public.estoque_av_bridge_restores from public,anon,authenticated;

-- Revoga o procedimento de V1.9 quando ja existir: nunca deixar duas rotas de escrita.
DO $revoke_legacy$
BEGIN
  IF to_regprocedure('public.estoque_av_commit(text,bigint,jsonb)') IS NOT NULL THEN
    EXECUTE 'REVOKE ALL ON FUNCTION public.estoque_av_commit(text,bigint,jsonb) FROM PUBLIC, anon, authenticated';
  END IF;
END;
$revoke_legacy$;

-- Invalida a assinatura antiga sem eliminar os dados.
drop function if exists public.estoque_av_bridge_commit(text,bigint,jsonb,uuid,text);

-- Somente service_role pode chamar. Todos os dados anteriores sao imutaveis,
-- salvo os registros cujo ciclo de vida permita uma alteracao, e backups admin.
create or replace function public.estoque_av_bridge_commit(
  p_workspace text,
  p_expected_revision bigint,
  p_payload jsonb,
  p_operation_id uuid,
  p_operador text,
  p_admin boolean,
  p_intent text
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $estoque_bridge$
declare
  v_current bigint;
  v_existing bigint;
  v_next bigint;
  v_old jsonb;
  v_key text;
  v_row jsonb;
  v_prev jsonb;
  v_index integer;
  v_len integer;
begin
  if p_workspace is null or p_expected_revision is null or p_payload is null or
     p_operation_id is null or p_operador is null or p_operador !~ '^[0-9]{1,10}$' or
     p_admin is null or p_intent not in ('operation','stores','restore') then
    raise exception 'PARAMETROS_INVALIDOS' using errcode = '22023';
  end if;
  select o.revisao_resultado into v_existing
    from public.estoque_av_bridge_operations o
    where o.operacao_id = p_operation_id and o.operador = p_operador and o.workspace_id=p_workspace;
  if found then
    return jsonb_build_object('revision',v_existing,'replayed',true);
  end if;

  select revision,state into v_current,v_old from public.estoque_av_cloud
    where workspace_id=p_workspace for update;
  if not found then raise exception 'AMBIENTE_INEXISTENTE' using errcode='P0002'; end if;
  select o.revisao_resultado into v_existing
    from public.estoque_av_bridge_operations o
    where o.operacao_id=p_operation_id and o.operador=p_operador and o.workspace_id=p_workspace;
  if found then return jsonb_build_object('revision',v_existing,'replayed',true); end if;
  if v_current <> p_expected_revision then
    raise exception 'CONFLITO_DE_VERSAO' using errcode='40001';
  end if;
  if jsonb_typeof(p_payload) <> 'object' or
     (p_payload->>'version') <> '1' or
     exists (select 1 from unnest(array['stores','products','ledger','transfers','losses','inventories','receipts']) k
       where jsonb_typeof(p_payload->k) is distinct from 'array') then
    raise exception 'ESTADO_INVALIDO' using errcode='22023';
  end if;
  if pg_column_size(p_payload)>6*1024*1024 then
    raise exception 'LIMITE_DE_DADOS' using errcode='54000';
  end if;
  if p_intent in ('stores','restore') and not p_admin then
    raise exception 'NAO_AUTORIZADO' using errcode='42501';
  end if;

  if p_intent <> 'restore' then
    -- Nenhum lancamento historico pode ser apagado ou reescrito.
    foreach v_key in array array['ledger','stores','products','transfers','losses','inventories','receipts'] loop
      v_len=jsonb_array_length(v_old->v_key);
      if jsonb_array_length(p_payload->v_key)<v_len then
        raise exception 'DADOS_REMOVIDOS' using errcode='22023';
      end if;
      if v_key='ledger' or (not p_admin and v_key in ('stores','losses','receipts','products')) then
        for v_index in 0..v_len-1 loop
          if (v_old->v_key->v_index) is distinct from (p_payload->v_key->v_index) then
            raise exception 'HISTORICO_IMUTAVEL: %',v_key using errcode='22023';
          end if;
        end loop;
      end if;
      for v_index in v_len..jsonb_array_length(p_payload->v_key)-1 loop
        v_row=p_payload->v_key->v_index;
        if jsonb_typeof(v_row)<>'object' or coalesce(v_row->>'id','')='' then
          raise exception 'ESTADO_INVALIDO' using errcode='22023';
        end if;
        if v_key in ('ledger','transfers','losses','inventories','receipts') and
           (v_row ? 'actor') and v_row->>'actor'<>p_operador then
          raise exception 'AUTORIA_INVALIDA' using errcode='42501';
        end if;
        if v_key='ledger' and not p_admin and v_row->>'kind' in ('inventory','loss_reverse') then
          raise exception 'NAO_AUTORIZADO' using errcode='42501';
        end if;
        if v_key='losses' then
          if v_row->'stockDebited' is distinct from 'true'::jsonb or
             not exists(select 1 from jsonb_array_elements(p_payload->'ledger') m
               where m->>'kind'='loss' and m->>'linkId'=v_row->>'id'
                 and m->>'storeId'=v_row->>'storeId' and m->>'location'=v_row->>'location'
                 and m->>'productId'=v_row->>'productId'
                 and (m->>'delta')::integer=-((v_row->>'qty')::integer)) then
            raise exception 'PERDA_SEM_BAIXA' using errcode='22023';
          end if;
        end if;
      end loop;
    end loop;
    if p_intent='stores' and (p_payload->'stores')=(v_old->'stores') then
      raise exception 'OPERACAO_INVALIDA' using errcode='22023';
    end if;
    if p_intent<>'stores' and (p_payload->'stores') is distinct from (v_old->'stores') then
      raise exception 'NAO_AUTORIZADO' using errcode='42501';
    end if;
    -- Perdas antigas sao imutaveis: somente os campos de estorno podem mudar,
    -- mediante admin e movimento positivo correspondente na mesma transacao.
    for v_index in 0..jsonb_array_length(v_old->'losses')-1 loop
      v_prev=v_old->'losses'->v_index;
      v_row=p_payload->'losses'->v_index;
      if v_prev is distinct from v_row then
        if not p_admin or v_prev->>'id'<>v_row->>'id' or
           (v_prev - 'reversedAt' - 'reversedBy' - 'reverseNote')
              is distinct from (v_row - 'reversedAt' - 'reversedBy' - 'reverseNote') or
           (v_prev->>'reversedAt') is not null or
           (v_row->>'reversedAt') is null or
           (v_row->>'reversedBy')<>p_operador or
           not exists(select 1 from jsonb_array_elements(p_payload->'ledger') m
              where m->>'kind'='loss_reverse' and m->>'linkId'=v_row->>'id'
                and m->>'storeId'=v_row->>'storeId' and m->>'location'=v_row->>'location'
                and m->>'productId'=v_row->>'productId'
                and (m->>'delta')::integer=(v_row->>'qty')::integer) then
          raise exception 'HISTORICO_IMUTAVEL: perda' using errcode='22023';
        end if;
      end if;
    end loop;
    -- Transfers: identity, origin and quantity are immutable; only recorded
    -- confirmations can increase received/cancelled amounts.
    for v_index in 0..jsonb_array_length(v_old->'transfers')-1 loop
      v_prev=v_old->'transfers'->v_index;
      v_row=p_payload->'transfers'->v_index;
      if (v_prev - 'received' - 'cancelledQty' - 'confirmations')
           is distinct from (v_row - 'received' - 'cancelledQty' - 'confirmations') or
         (v_row->>'received')::integer<(v_prev->>'received')::integer or
         coalesce((v_row->>'cancelledQty')::integer,0)<coalesce((v_prev->>'cancelledQty')::integer,0) or
         jsonb_array_length(coalesce(v_row->'confirmations','[]'::jsonb))<jsonb_array_length(coalesce(v_prev->'confirmations','[]'::jsonb)) then
        raise exception 'HISTORICO_IMUTAVEL: transferencia' using errcode='22023';
      end if;
    end loop;
  else
    insert into public.estoque_av_bridge_restores(workspace_id,operacao_id,operador,revisao_anterior,estado_anterior)
      values (p_workspace,p_operation_id,p_operador,v_current,v_old);
  end if;

  v_next=v_current+1;
  update public.estoque_av_cloud
     set state=p_payload,revision=v_next,updated_at=now(),updated_by=null
   where workspace_id=p_workspace;
  insert into public.estoque_av_bridge_operations(operacao_id,workspace_id,operador,revisao_resultado)
    values(p_operation_id,p_workspace,p_operador,v_next);
  return jsonb_build_object('revision',v_next,'replayed',false);
end;
$estoque_bridge$;

revoke all on function public.estoque_av_bridge_commit(text,bigint,jsonb,uuid,text,boolean,text)
 from public,anon,authenticated;
grant execute on function public.estoque_av_bridge_commit(text,bigint,jsonb,uuid,text,boolean,text) to service_role;

commit;

-- Conferencia somente leitura (rodar separadamente se o editor nao exibir resultados):
select
 to_regclass('public.estoque_av_cloud') is not null as estoque,
 to_regclass('public.estoque_av_bridge_sessions') is not null as sessoes,
 to_regclass('public.estoque_av_bridge_operations') is not null as operacoes,
 to_regprocedure('public.estoque_av_bridge_commit(text,bigint,jsonb,uuid,text)') is not null as funcao;
