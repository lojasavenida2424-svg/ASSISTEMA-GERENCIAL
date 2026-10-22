> **GUIA ANTIGO:** aplica-se somente à sincronização V1.9. Para a versão atual, siga `LEIA-PRIMEIRO-ESTOQUE-V22.md` na raiz.

# ESTOQUE AV — V1.9 | Cadastro corrigido e sincronização multi-dispositivo

## 1. Erro corrigido

Em **Produtos > Cadastrar produto**, os campos começam vazios. O simples ato de digitar um código não copia descrição, cor, tamanho ou preço de outro cadastro. Os dados são retornados ao formulário **somente quando o operador usa o leitor contextual e confirma**, ou ao editar explicitamente um produto existente.

## 2. Habilitar compartilhamento online com Supabase

O Estoque original salva dados no navegador e **não** é compartilhado entre dispositivos. A V1.9 inclui um modo online que usa o projeto Supabase presente no Gerencial, **desde que se configure o banco e o usuário**.

1. Faça **Configurações > Backup e dados > Exportar backup** no dispositivo com dados atuais, antes de conectar.
2. Abra Supabase Dashboard do projeto usado pelo Gerencial, vá a **SQL Editor** e execute `docs/ESTOQUE-AV-SUPABASE-INSTALACAO.sql`.
3. No painel **Authentication > Users**, crie usuários com e-mail e senha de Supabase Auth (diferentes dos usuários locais do Estoque, e possivelmente diferentes do login do Gerencial).
4. Copie o UUID (`id`) de cada usuário autenticado e adicione permissão pelo SQL Editor. Exemplo:

   ```sql
   insert into public.estoque_av_members(workspace_id,user_id,role)
   values ('avenida','UUID-DO-USUARIO','editor');
   ```

   Para o responsável pela implantação, use a role `admin`.
5. Hospede o pacote atualizado (preferencialmente HTTPS). Acesse **SISTEMA AV > ESTOQUE AV > Configurações > Sincronização > Conectar Supabase**, informe e-mail e senha de Supabase Auth.
6. Repita a conexão nos outros aparelhos autorizados. Os mesmos dados aparecerão após a autenticação.

**Atenção:** a página local não pode, por si só, criar tabelas e autorizar usuários no projeto Supabase. Sem os passos acima, a V1.9 ainda usa armazenamento local, indicado na interface. Não interprete o ZIP como uma migração já executada em seu banco.

## 3. Importação dos registros antigos

A nuvem começa vazia, por segurança. A primeira conexão carrega os dados do servidor e mantém uma cópia local anterior em `estoque_av_v1_antes_nuvem_v19`. Se houver registros antigos, importe-os deliberadamente usando **Configurações > Backup e dados > Restaurar backup** e escolha o arquivo JSON exportado **do aparelho que possui os dados mais recentes**. Uma restauração online substitui os dados do ambiente compartilhado; não restaure backups diferentes de vários aparelhos sequencialmente sem consolidá-los antes.

## 4. Conflitos e salvamento

- O backend grava um documento JSON versionado com **CAS (compare-and-swap)** em uma função RPC; duas alterações concorrentes não podem gravar a mesma versão. Em conflito, o cliente atualiza o documento, reaplica a ação e verifica integridade (incluindo referências/códigos duplicados e saldos não negativos), ou informa a falha.
- **Nunca** salva silenciosamente um lançamento somente no navegador quando o modo online está ligado e o servidor estiver indisponível.
- A interface verifica atualizações do servidor periodicamente (aproximadamente 14 segundos) e ao voltar para a aba.
- As contas locais da aba **Usuários** ainda são apenas locais: a autorização real de acesso ao armazenamento remoto vem dos usuários e das permissões RLS no Supabase.
- O modelo é adequado para equipes pequenas. Para alta simultaneidade e fotos volumosas, evoluir para tabelas operacionais normalizadas e Supabase Storage.

## 5. Preservação da integração

O arquivo de entrada do Gerencial e o link `estoque/index.html` não foram alterados. Outros módulos, incluindo RESULTADOS e Operacional, permanecem com seus arquivos originais. O pacote contém a árvore inteira do Gerencial e a nova versão do Estoque.
