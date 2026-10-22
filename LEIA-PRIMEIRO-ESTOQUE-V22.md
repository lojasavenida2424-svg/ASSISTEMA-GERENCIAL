# ESTOQUE AV — sincronização alinhada ao Gerencial

A revisão 2.2.1 corrige a conexão no aplicativo instalado: a sincronização inicia após o login local do Estoque, sem depender da sessão de outra janela. Esta atualização remove a tela e a função de migração de contas. Ela mantém os logins já existentes e usa, para sincronizar o estoque, o mesmo projeto, chave pública e tabela Supabase que o Gerencial já utiliza. O Estoque grava em uma linha própria (`estoque_av_compartilhado_v1`) da tabela `assistencia_gerencial`.

## Atualização

1. No Estoque, exporte um backup em **Configurações → Backup e dados**. Não limpe os dados do navegador e mantenha a mesma origem/endereço publicado.
2. Publique o conteúdo completo do pacote atualizado no endereço atual.
3. Abra o Estoque e entre com a conta local já cadastrada nele. Em **Configurações → Sincronização**, verifique o status. A sincronização inicia após o login, inclusive no aplicativo do Estoque aberto separadamente. Não é preciso abrir o Gerencial junto, criar contas, publicar Edge Function ou instalar SQL para a nova sincronização.
4. Se a nuvem ainda não tiver estoque compartilhado, o Estoque mantém os dados locais. Use **Enviar backup local** para escolher e confirmar qual aparelho tem os registros corretos que devem iniciar a nuvem.

As contas locais do Estoque continuam no armazenamento do navegador. O login do Gerencial continua usando os cadastros e senhas que já existem. Não execute `docs/SEGURANCA-GERENCIAL-CREDENCIAIS-RLS.sql`, pois esse SQL não é compatível com o login preservado nesta recuperação.

## Se a instalação anterior já usava a ponte do Estoque

A instalação antiga guardava os registros na tabela `estoque_av_cloud`. Esses dados não são apagados nem alterados por esta atualização. Para copiá-los uma vez à linha nova usada pelo Gerencial, revise e execute `docs/ESTOQUE-AV-MOVER-DADOS-PONTE-PARA-GERENCIAL.sql` no SQL Editor do mesmo projeto Supabase, antes de abrir a nova versão. O script não sobrescreve uma linha nova já existente.

Se você nunca publicou `estoque-av-sync`, não precisa executar esse script nem os arquivos `ESTOQUE-AV-V2.0-BRIDGE-SEM-AUTH.sql`/`ESTOQUE-AV-SUPABASE-INSTALACAO.sql`.

## Observações

A sincronização usa o mesmo projeto, chave pública e tabela do Gerencial. O acesso começa após o login local do Estoque, sem depender de uma sessão aberta em outra janela. Se o projeto Supabase tiver políticas RLS que bloqueiem o acesso público já usado pelo Gerencial, a conexão informará o erro. A validação local confirma o fluxo do código e o tratamento de conflitos; não foi feito acesso nem alteração no banco Supabase de produção.
