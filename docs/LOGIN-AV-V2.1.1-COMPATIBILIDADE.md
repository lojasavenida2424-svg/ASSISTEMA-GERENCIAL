# Compatibilidade do login nesta recuperação

Esta versão preserva o login original do Gerencial e as contas locais já existentes no Estoque. A tela e a função de migração de contas foram removidas.

Não aplique o SQL de bloqueio de credenciais junto com esta versão: ele impediria o acesso do Gerencial. Para atualizar e sincronizar o Estoque, siga `LEIA-PRIMEIRO-ESTOQUE-V22.md`.

A autenticação segura do Gerencial exige uma migração separada e homologada, que não faz parte deste pacote.
