-- Aplicar SOMENTE depois de publicar a Edge Function estoque-av-sync desta versao.
-- A política RESTRICTIVE nega leitura E escrita da linha de credenciais
-- aos papeis publicos, mesmo que outras politicas sejam permissivas.
-- Requer tabela public.assistencia_gerencial com coluna id.
BEGIN;
ALTER TABLE public.assistencia_gerencial ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Gerencial - proteger credenciais globais" ON public.assistencia_gerencial;
CREATE POLICY "Gerencial - proteger credenciais globais"
  ON public.assistencia_gerencial AS RESTRICTIVE FOR ALL
  TO anon, authenticated
  USING (id <> 'config_global_v1')
  WITH CHECK (id <> 'config_global_v1');
COMMIT;
-- Conferir como anon/authenticated, sem service_role:
-- SELECT * FROM public.assistencia_gerencial WHERE id='config_global_v1';
-- Deve retornar 0 linhas. A Edge Function usa apenas service_role.
