-- Rode esta consulta no SQL Editor de CADA projeto Supabase.
-- Somente leitura: nenhuma tabela, usuário ou policy será alterado.
-- Verifica exposição de tabelas e de storage de AV TV.
select n.nspname as schema_name, c.relname as tabela,
       c.relrowsecurity as rls_habilitada, c.relforcerowsecurity as rls_forcada
from pg_class c join pg_namespace n on n.oid=c.relnamespace
where c.relkind in ('r','p') and n.nspname='public'
  and c.relname in ('assistencia_gerencial','av_resultados','videos','playback_state')
order by n.nspname,c.relname;

select schemaname,tablename,policyname,permissive,roles,cmd,qual,with_check
from pg_policies
where schemaname in ('public','storage')
  and (tablename in ('assistencia_gerencial','av_resultados','videos','playback_state','objects'))
order by schemaname,tablename,policyname;

-- Atenção: uma policy que permita {anon} ler dados de operadores/senhas NÃO é controle por usuário.
-- Não aplique DENY indiscriminado antes de implantar autenticação server-side:
-- todos os módulos ainda usam sessões legadas e seriam bloqueados.
