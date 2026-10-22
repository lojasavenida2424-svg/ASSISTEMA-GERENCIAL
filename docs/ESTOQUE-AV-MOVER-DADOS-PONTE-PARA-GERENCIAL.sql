-- Opcional: copiar os dados da antiga ponte do Estoque para a linha dedicada
-- da tabela já usada pelo Gerencial. Execute somente no mesmo projeto Supabase.
-- Não sobrescreve a linha nova e não apaga dados da tabela antiga.
DO $copy_stock$
DECLARE
  v_rows integer := 0;
BEGIN
  IF to_regclass('public.estoque_av_cloud') IS NULL THEN
    RAISE NOTICE 'Tabela antiga public.estoque_av_cloud ausente; nada foi copiado.';
    RETURN;
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.assistencia_gerencial
    WHERE id = 'estoque_av_compartilhado_v1'
  ) THEN
    RAISE NOTICE 'A linha estoque_av_compartilhado_v1 já existe; ela foi preservada.';
    RETURN;
  END IF;

  EXECUTE $sql$
    INSERT INTO public.assistencia_gerencial (id, dados, updated_at)
    SELECT 'estoque_av_compartilhado_v1', state, now()
    FROM public.estoque_av_cloud
    WHERE workspace_id = 'avenida'
    ON CONFLICT (id) DO NOTHING
  $sql$;
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  RAISE NOTICE 'Linhas copiadas: %; os dados antigos foram mantidos.', v_rows;
END;
$copy_stock$;
