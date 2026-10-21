# ESTOQUE AV — Recuperação compatível V2.1.2

Objetivo: restaurar acesso e sincronização da V2.0, sem novo script SQL nem nova função Edge.

O pacote foi reconstruído a partir do ZIP original **V2.0-SYNC-LOGIN-PRESERVADO(2)**, conservando os arquivos do Gerencial e Supabase originais. Só **estoque/index.html** foi modificado com correções autônomas de perdas, anexo malicioso, estorno, acesso às telas de lojas/backup e exportação CSV.

## Acesso
- A tela de login do Estoque, seus identificadores `estoque_av_local_accounts_v1`, `estoque_av_session_v1` e o hash das senhas são **idênticos aos originais da V2.0**.
- Essas contas são mantidas em `localStorage` do navegador, vinculado ao **mesmo endereço (origem)**. Abrir o sistema em outra URL/domínio ou via outro arquivo local **não transfere** os usuários automaticamente.
- Entre pelo **mesmo navegador, perfil e endereço publicado** onde o cadastro do Estoque existia.
- Não limpe cache/dados do site, cookies ou armazenamento local. Isso pode apagar contas locais.
- A atualização do ZIP não modifica automaticamente o projeto Supabase.

## Publicação
1. Guarde uma cópia dos arquivos publicados e exporte backups existentes.
2. Substitua os arquivos no **mesmo repositório, caminho e endereço** que a V2.0 usava; evite criar novo domínio.
3. Atualize a página forçadamente sem limpar os dados do site.
4. Entre no ESTOQUE AV com a conta LOCAL já cadastrada naquele navegador.

## Atenção à configuração Supabase
Esta versão usa a Edge Function `estoque-av-sync` e o schema **anteriores**; não contém a migração V2.1. Se a migração SQL ou as funções V2.1 foram publicadas **manual**mente no Supabase, somente substituir ZIP não desfaz alterações no servidor. Evite rodar SQL de reversão sem uma análise do estado atual e backup.

## Correções incluídas sem migrar banco
- Perda exige produto reconhecido e estoque suficiente; baixa imediata e proteção de duplicidade curta.
- Foto de perda aceita exclusivamente JPEG/PNG/WebP em data URL Base64 de tamanho limitado.
- Tentativas de estorno, editar loja e restaurar backup exigem papel de administrador **local** (observação: isso NÃO é autorização segura no servidor).
- Exportação CSV neutraliza injeção de fórmulas.

## Limites
A versão mantém o comportamento de segurança do servidor **V2.0**, inclusive suas limitações. Ela privilegia restauração de compatibilidade operacional; correções de autenticação/controle de permissões no servidor requerem projeto dedicado e migração testada com banco de homologação.
