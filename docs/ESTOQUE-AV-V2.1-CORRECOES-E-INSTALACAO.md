# Instalação atual do ESTOQUE AV

Este guia substitui as instruções antigas da ponte V2.1. Siga `LEIA-PRIMEIRO-ESTOQUE-V22.md` na raiz do pacote. A tela de migração de contas foi removida; as contas locais e os logins existentes são preservados.

A sincronização atual usa a tabela e a configuração Supabase já utilizadas pelo Gerencial. Não publique uma Edge Function para o Estoque. Se a instalação anterior já tiver dados em `estoque_av_cloud`, consulte o procedimento opcional em `docs/ESTOQUE-AV-MOVER-DADOS-PONTE-PARA-GERENCIAL.sql` antes de atualizar.
