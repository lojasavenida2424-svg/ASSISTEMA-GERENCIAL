-- ATENÇÃO: SCRIPT HISTÓRICO V1.9 — NÃO EXECUTAR NA INSTALAÇÃO V2.1.
-- A ponte atual V2.1 utiliza docs/ESTOQUE-AV-V2.0-BRIDGE-SEM-AUTH.sql e o guia ESTOQUE-AV-V2.1-CORRECOES-E-INSTALACAO.md.
-- ESTOQUE AV V1.9 | Supabase SQL Editor | executar uma vez no projeto do Gerencial.
-- IMPORTANTE: a sessão do Gerencial é própria do sistema e NÃO equivale ao Supabase Auth.
-- Crie usuários em Authentication > Users. Depois associe seus IDs nesta tabela:
-- INSERT INTO public.estoque_av_members(workspace_id,user_id,role)
-- VALUES ('avenida', 'COLE-UUID-DE-AUTH-USERS', 'admin');
-- Não habilite políticas com USING(true) para anon ou authenticated sem vínculo.

begin;
create table if not exists public.estoque_av_cloud (
  workspace_id text primary key,
  state jsonb not null,
  revision bigint not null default 0,
  updated_at timestamptz not null default now(),
  updated_by uuid
);
create table if not exists public.estoque_av_members (
  workspace_id text not null references public.estoque_av_cloud(workspace_id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check(role in ('admin','editor','viewer')),
  created_at timestamptz not null default now(),
  primary key (workspace_id,user_id)
);
insert into public.estoque_av_cloud(workspace_id,state,revision)
values ('avenida', jsonb_build_object(
  'version',1,
  'stores',jsonb_build_array(jsonb_build_object('id','store24','code','024','name','Loja 024','createdAt',now())),
  'products','[]'::jsonb,'ledger','[]'::jsonb,'transfers','[]'::jsonb,
  'losses','[]'::jsonb,'inventories','[]'::jsonb,'receipts','[]'::jsonb
),0)
on conflict (workspace_id) do nothing;

alter table public.estoque_av_cloud enable row level security;
alter table public.estoque_av_members enable row level security;
revoke all on public.estoque_av_cloud from public, anon, authenticated;
revoke all on public.estoque_av_members from public, anon, authenticated;
grant select on public.estoque_av_cloud, public.estoque_av_members to authenticated;

drop policy if exists "Estoque: usuários consultam seu vínculo" on public.estoque_av_members;
create policy "Estoque: usuários consultam seu vínculo" on public.estoque_av_members
  for select to authenticated using(user_id=(select auth.uid()));
drop policy if exists "Estoque: membros consultam o ambiente" on public.estoque_av_cloud;
create policy "Estoque: membros consultam o ambiente" on public.estoque_av_cloud
  for select to authenticated using (
    exists(select 1 from public.estoque_av_members as m
           where m.workspace_id=estoque_av_cloud.workspace_id and m.user_id=(select auth.uid()))
  );

create or replace function public.estoque_av_commit(
  p_workspace text,
  p_expected_revision bigint,
  p_payload jsonb
) returns bigint
language plpgsql security definer
set search_path = pg_catalog, public
as $$
declare v_role text;v_revision bigint;v_new bigint;
begin
  if auth.uid() is null then raise exception 'SESSAO_OBRIGATORIA' using errcode='28000';end if;
  select m.role into v_role from public.estoque_av_members m
   where m.workspace_id=p_workspace and m.user_id=auth.uid();
  if v_role is null or v_role not in ('admin','editor') then
    raise exception 'ACESSO_NEGADO: usuário sem permissão de escrita' using errcode='42501';
  end if;
  if jsonb_typeof(p_payload) <> 'object'
     or (p_payload->>'version') <> '1'
     or exists (select 1 from unnest(array['stores','products','ledger','transfers','losses','inventories','receipts']) f
                 where jsonb_typeof(p_payload->f) is distinct from 'array') then
    raise exception 'ESTRUTURA_ESTOQUE_INVALIDA' using errcode='22023';
  end if;
  if pg_column_size(p_payload)>12000000 then
    raise exception 'DADOS_MUITO_GRANDES: compactar fotografias' using errcode='22023';
  end if;
  -- Bloqueia a linha e impede sobrescrita silenciosa por outro dispositivo.
  select c.revision into v_revision from public.estoque_av_cloud c
    where c.workspace_id=p_workspace for update;
  if v_revision is null then raise exception 'AMBIENTE_NAO_ENCONTRADO' using errcode='22023';end if;
  if v_revision <> p_expected_revision then raise exception 'CONFLITO_DE_VERSAO' using errcode='P0001';end if;
  update public.estoque_av_cloud
    set state=p_payload,revision=revision+1,updated_at=now(),updated_by=auth.uid()
    where workspace_id=p_workspace
    returning revision into v_new;
  return v_new;
end;
$$;
revoke all on function public.estoque_av_commit(text,bigint,jsonb) from public,anon;
grant execute on function public.estoque_av_commit(text,bigint,jsonb) to authenticated;
commit;

-- Instruções após executar:
-- 1. Supabase Dashboard > Authentication > Users > Add user (defina e-mail e senha).
-- 2. Copie UUID de Authentication > Users.
-- 3. Execute INSERT com workspace_id 'avenida', o UUID e role 'admin' ou 'editor'.
-- 4. Repita por colaborador que terá acesso ao banco; contas locais do Estoque não bastam.
-- 5. Hospede o sistema em HTTPS. Abra Estoque > Configurações > Sincronização.
-- 6. NÃO distribua service_role. Chave pública anon no frontend é normal, RLS é obrigatória.
