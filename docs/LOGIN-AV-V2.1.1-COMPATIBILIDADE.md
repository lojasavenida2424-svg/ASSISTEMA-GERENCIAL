# Compatibilidade do login nesta recuperação

O hotfix V2.1.1 descrito em versões anteriores não está ativo neste pacote. Esta versão preserva o login original do Gerencial para manter os cadastros e senhas já existentes.

Não aplique o SQL de bloqueio de credenciais junto com esta versão: ele impediria o acesso do Gerencial. Para atualizar a sincronização do Estoque, siga `LEIA-PRIMEIRO-RECUPERACAO-V212.md`.

A autenticação segura do Gerencial exige uma migração separada e homologada, que não faz parte deste pacote de recuperação.
