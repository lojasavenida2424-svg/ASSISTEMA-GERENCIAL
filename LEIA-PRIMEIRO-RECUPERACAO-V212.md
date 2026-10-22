# ESTOQUE AV — pacote corrigido V2.1.2

Esta versão corrige a gravação no Supabase e protege lançamentos quando a conexão cai durante uma operação. O login existente do Gerencial e as contas locais do Estoque são preservados.

## Antes de atualizar

- Publique os arquivos no mesmo endereço usado atualmente. As contas e preferências locais dependem do mesmo navegador, perfil e endereço.
- Faça backup do banco Supabase e dos arquivos publicados.
- Não limpe os dados do site nem o armazenamento do navegador.
- Não execute `docs/SEGURANCA-GERENCIAL-CREDENCIAIS-RLS.sql`. O Gerencial desta versão ainda usa o acesso legado à configuração; essa política bloquearia o login.

## Atualização da sincronização

O HTML e a função Edge precisam usar a mesma versão da gravação. Se a migração V2.1 com a função de sete parâmetros já foi aplicada, basta publicar a função incluída neste pacote. Caso contrário, e se `public.estoque_av_cloud` já existir, execute `docs/ESTOQUE-AV-V2.0-BRIDGE-SEM-AUTH.sql` uma vez e publique a função `estoque-av-sync` com a opção `--no-verify-jwt`. O SQL cria ou atualiza objetos da ponte e não apaga os registros do estoque.

Se `public.estoque_av_cloud` ainda não existir, siga primeiro o guia de instalação da V2.0. Não execute a migração contra outro projeto Supabase.

Depois, publique os arquivos do pacote no endereço original e teste uma entrada, uma perda, um estorno autorizado e uma atualização em dois dispositivos. Não crie outro usuário nem redefina senhas para instalar esta versão.

## Compatibilidade e limites

O login Gerencial continua usando as credenciais já cadastradas. As contas locais do Estoque permanecem vinculadas ao armazenamento do navegador. A migração de autenticação do Gerencial e a política RLS de credenciais não fazem parte desta recuperação.

O pacote não altera o Supabase por conta própria. Nenhuma migração ou função foi publicada no servidor durante a preparação deste arquivo. A autenticação legada ainda depende das permissões do projeto Supabase atual.

O ZIP contém código-fonte, imagens, documentação e SQL; não inclui instaladores ou executáveis. A integridade do arquivo foi verificada, mas isso não substitui a análise do antivírus do seu computador.
