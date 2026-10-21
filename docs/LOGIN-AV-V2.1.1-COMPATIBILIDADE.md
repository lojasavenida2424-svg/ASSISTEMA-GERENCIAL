# Login Gerencial AV — hotfix V2.1.1 (21/10/2026)

## Origem do problema
A V2.1 do `index.html` alterou a consulta de usuários, antes feita na tabela `assistencia_gerencial`, para a rota `public_config` da Edge Function `estoque-av-sync`. Se os arquivos do GitHub foram atualizados sem publicar essa Edge Function (ou se outra configuração RLS foi aplicada antes), a pré-validação falha e o operador fica bloqueado mesmo estando cadastrado.

## O que este hotfix faz
- Tenta primeiro a API segura `public_config` V2.1.
- **Somente se a API responder `ACAO_DESCONHECIDA` (V2.0) ou HTTP 404 (ausência da função)**, utiliza a consulta legada ao Supabase — **se a RLS ainda autorizar**.
- O login no modo legado continua verificando a senha oficial que já existia na V2.0. **Não recria contas, nem redefine senhas**.
- A API V2.1 instalada continua sendo prioritária; outras falhas do servidor, permissões e rede **não** liberam fallback automático.
- Operador ausente e servidor não configurado agora mostram mensagens diferentes.
- A gravação de configurações no ambiente legado permanece na modalidade V2.0, somente até a migração.

## Atenção à segurança
A consulta legada, embora operacional, permite ao cliente receber as senhas em memória e **não oferece a proteção de credenciais do V2.1**. Utilize este hotfix apenas para restabelecer o acesso e conclua a migração da Edge Function + RLS, na ordem indicada no guia V2.1. Uma vez que o RLS já estiver protegendo a linha `config_global_v1`, o fallback antigo não funcionará; a solução é concluir o deploy da função V2.1, não tornar a linha pública novamente.

Se o Gerencial está apontando para outro projeto Supabase diferente daquele em que o cadastro foi criado, atualize a configuração do endpoint do projeto somente depois de verificar os dados existentes. Não execute SQL de recriação de usuários, nem rode scripts que apaguem ou repovoem tabelas para corrigir login.
