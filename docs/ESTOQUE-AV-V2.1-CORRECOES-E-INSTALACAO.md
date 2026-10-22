# Instalação do pacote corrigido V2.1.2

Use as instruções atuais em `LEIA-PRIMEIRO-RECUPERACAO-V212.md`.

Este pacote preserva o login Gerencial existente e usa a ponte `estoque-av-sync`. O código da interface e a Edge Function agora enviam a mesma assinatura de gravação de sete parâmetros; a sincronização de operações pendentes usa a tabela `estoque_av_bridge_operations` já criada pela migração da ponte.

Se a migração correspondente já foi aplicada, publique apenas a Edge Function desta versão. Caso contrário, faça backup, confirme que está no projeto Supabase correto e execute uma vez `docs/ESTOQUE-AV-V2.0-BRIDGE-SEM-AUTH.sql`; depois publique `estoque-av-sync` com `--no-verify-jwt`. O HTML deve ser publicado no mesmo endereço para preservar os dados locais.

Não aplique uma política RLS que bloqueie a linha `config_global_v1`: o login Gerencial deste pacote ainda consulta essa configuração pelo fluxo legado. O arquivo `SEGURANCA-GERENCIAL-CREDENCIAIS-RLS.sql` foi desativado por incompatibilidade.

O pacote foi validado localmente. A migração SQL, a função Edge e o login em produção precisam de homologação no projeto Supabase real.
