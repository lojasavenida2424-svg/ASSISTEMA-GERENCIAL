> **ATENÇÃO — pacote V2.1:** este documento descreve a integração anterior. Para instalar o ZIP corrigido, leia PRIMEIRO `ESTOQUE-AV-V2.1-CORRECOES-E-INSTALACAO.md` e execute as migrações na ordem prescrita. Não publique somente o HTML.

# ESTOQUE AV V2.0 — sincronização usando o login atual do Gerencial

**ESTADO:** pacote de código preparado e teste funcional com servidor simulado aprovado. **Não está publicado no seu projeto Supabase**. Para compartilhar informações entre aparelhos em produção, execute os passos abaixo. **Não modifica as telas e o fluxo de login existentes. Não cadastra usuários no Supabase Authentication.**

## O que foi preparado

- `index.html` (Gerencial): após o login habitual bem-sucedido, solicita em segundo plano uma sessão temporária na função segura do Estoque, usando as credenciais que o Gerencial acabou de validar. O login principal continua funcionando mesmo se a função estiver indisponível.
- `estoque/index.html`: usa a sessão de sincronização emitida pela função. Carrega dados, grava somente após confirmação do servidor e atualiza alterações remotas. Preserva o login local já existente no Estoque. Se for aberto pelo Gerencial e a conexão estiver indisponível, evita gravar movimentos só localmente, para não perder a consistência.
- `supabase/functions/estoque-av-sync/index.ts`: função Edge que confere a senha **no servidor**, lê o cadastro de usuários **já utilizado pelo Gerencial**, verifica permissões e emite token temporário. NÃO expõe a chave `service_role` no navegador.
- `docs/ESTOQUE-AV-V2.0-BRIDGE-SEM-AUTH.sql`: tabelas auxiliares (sessões, tentativas de login, idempotência) e procedimento transacional com controle de versão. Mantém tabelas e registros anteriores intactos.

## Instalação indispensável no Supabase

**Antes de tudo:** faça backup dos arquivos do sistema em produção e exporte o backup JSON em **ESTOQUE AV > Configurações > Backup e dados** no navegador com os registros mais atualizados.

1. Confira se o projeto Supabase configurado no `index.html` do Gerencial é o correto. O pacote foi preparado para `euyrhkusnasgiueefldg`. Se seu Gerencial real estiver apontando para outro projeto, **não execute SQL no projeto errado nem publique os arquivos sem ajustar e validar o destino**.
2. Em **Supabase > SQL Editor**, no MESMO projeto, execute `docs/ESTOQUE-AV-V2.0-BRIDGE-SEM-AUTH.sql`. Ele exige a tabela existente `public.estoque_av_cloud` e NÃO apaga dados existentes.
3. Em **Supabase > Edge Functions**, crie uma função chamada exatamente `estoque-av-sync` e publique o conteúdo de `supabase/functions/estoque-av-sync/index.ts`. Desative **Verify JWT** para esta função; **a própria função exige um token de sessão especial assinado por aleatoriedade e armazenado por hash** para ler e gravar. Com Supabase CLI, alternativa: `supabase functions deploy estoque-av-sync --project-ref euyrhkusnasgiueefldg --no-verify-jwt`.
4. A função exige as variáveis de ambiente `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` (normalmente já fornecidas pelo ambiente das Edge Functions). **Nunca coloque `service_role` no HTML, no GitHub ou em mensagem.**
5. Publique o conteúdo do pacote completo no MESMO domínio e caminho usados pelo Gerencial (por exemplo, GitHub Pages/HTTPS). Abra o Gerencial normalmente, faça **logout e novo login** para gerar uma sessão de sincronização. Em **SISTEMA AV > ESTOQUE AV > Configurações > Sincronização**, verifique o status **Nuvem sincronizada**.
6. Em um segundo dispositivo, faça login no Gerencial, abra o Estoque e verifique o mesmo status. Faça um cadastro de teste e confira se ele aparece no outro dispositivo, depois remova o cadastro de teste se apropriado.

## Cuidados com o estoque já cadastrado

O primeiro acesso online baixa o estado presente na nuvem. O programa faz antes uma cópia automática do estoque local em `localStorage` com a chave `estoque_av_v1_antes_nuvem_v20`; **o backup JSON exportado é a proteção principal**. Se o banco remoto estiver realmente vazio (revisão zero), o botão **Migrar backup local** permite enviar a cópia local uma única vez. Para outros cenários, **não substitua o estado sem conferir qual banco contém os lançamentos mais recentes**.

## Regras de segurança e limitações

- A função consulta `public.assistencia_gerencial`, linha `config_global_v1`, coluna `dados.usuarios`. Sem esse cadastro, a sincronização não é habilitada.
- O código de operador `133` é tratado como administrador no Gerencial. Outros operadores só podem usar o Estoque quando não houver bloqueio nas permissões (`sistemaav`, `sistemaAvLinks.estoque`). A interface local do Estoque ainda utiliza contas locais como anteriormente.
- O token de sincronização dura no máximo 10 horas, não a sessão completa do Gerencial. Se expirar, será necessário sair e entrar novamente no Gerencial; isso não altera as credenciais e não cria contas Auth.
- O modelo salva o estado como um documento JSON único por workspace; tem limite de cerca de 6 MB por gravação. Não é adequado para milhares de fotos grandes nem um volume muito alto de transações. A função rejeita movimentações que causam saldo negativo e gravações concorrentes com revisão desatualizada.
- **Validação realizada:** verificação de sintaxe dos scripts; teste em navegador com API simulada de cadastro de produto, leitura da alteração em dispositivo móvel simulado, registro de perda e leitura da ocorrência. **Não foi executado teste no banco real nem foi feito deploy remoto.**

## Problemas comuns

- **Nuvem indisponível / função não publicada:** confira o nome da função, Verify JWT desligado e URL/projeto corretos.
- **Aguardando Gerencial:** abra o Estoque pelo Gerencial; faça logout/login no Gerencial após publicar a função.
- **CONFIG_GERENCIAL_INDISPONIVEL:** tabela de configuração do Gerencial inacessível, sem linha `config_global_v1` ou estrutura de usuários diferente da esperada.
- **CREDENCIAIS_OU_ACESSO_INVALIDOS:** senha no Gerencial difere da que foi recuperada no banco no momento da autenticação da ponte ou o operador não tem permissão.
- **CONFLITO_DE_VERSAO:** outro dispositivo gravou primeiro; o cliente recarrega o estado e tenta aplicar a operação novamente, com validações.

**A migração para Supabase Authentication permanece expressamente adiada, conforme solicitação do responsável.**
