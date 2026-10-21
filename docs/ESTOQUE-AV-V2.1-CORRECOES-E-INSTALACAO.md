# Sistema Gerencial AV + Estoque AV — V2.1 (pacote de correções)

**Gerado em 21/10/2026.** Base: `ASSISTEMA-GERENCIAL-ESTOQUE-AV-V2_0-SYNC-LOGIN-PRESERVADO(2).zip`. Os arquivos HTML, os módulos e o layout existentes foram mantidos. Não há qualquer comando no pacote que remova dados de produção automaticamente.

## IMPORTANTE — instalar na ordem correta

**O HTML atualizado exige que a Edge Function nova esteja em execução.** Se for publicado antes dela, o Gerencial não conseguirá validar o login. Faça backup de GitHub, Supabase e Estoque AV e execute primeiro em homologação:

1. Confira o projeto Supabase. O código atual utiliza `euyrhkusnasgiueefldg`; **não altere o banco de outro projeto sem confirmar**.
2. Confirme que `public.estoque_av_cloud` e `public.assistencia_gerencial` já existem e têm backup exportado. O SQL abaixo não cria a tabela global antiga.
3. Execute `docs/ESTOQUE-AV-V2.0-BRIDGE-SEM-AUTH.sql` no Supabase SQL Editor. Este arquivo foi atualizado para assinatura V2.1, garante CAS, restauração auditada, registros append-only, revoga a rota legada e cria/restaura a função RPC. **A função antiga de cinco parâmetros é substituída.**
4. Publique `supabase/functions/estoque-av-sync/index.ts` como função `estoque-av-sync` no mesmo projeto, **Verify JWT desligado para esta função somente**. A validação própria de credenciais e token é feita na função. O ambiente Supabase precisa fornecer `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY`, jamais dentro do HTML.
5. Teste o endpoint da nova função em homologação: `public_config` deve retornar configuração com o marcador `__CREDENCIAL_PROTEGIDA__` em vez de senhas; `gerencial_auth` deve rejeitar senha incorreta e aceitar uma senha real válida. Teste também `load`, `commit` e `operation_status` com dados sintéticos. Não exponha tokens ou senhas nos logs.
6. **Somente depois de publicar e validar a Edge Function**, execute `docs/SEGURANCA-GERENCIAL-CREDENCIAIS-RLS.sql`. Essa política restritiva impede que papéis `anon` e `authenticated` leiam e escrevam a linha global com senhas. Garanta que o retorno direto à linha `config_global_v1` para esses papéis esteja vazio, e que outras linhas continuem acessíveis conforme as regras anteriores.
7. Publique os arquivos HTML e assets do ZIP. Faça logout e novo login no Gerencial. Confira operador 133, outro operador autorizado e o acesso ao Estoque em dois dispositivos. Confirme gravação, proteção contra duplicidade, leitura remota e restauração administrativa.
8. **Troque senhas legadas previsíveis**, sobretudo `operador + 24`. A migração evita a leitura pública, mas não substitui automaticamente credenciais antigas usadas por colaboradores.

## Correções implementadas no código

- Login principal com validação de senha no servidor; carregamento de configuração com senhas mascaradas e rota de atualização administrativa autenticada. Sessões existentes permanecem locais no Gerencial e não são convertidas em contas Supabase Auth.
- RLS restritiva de proteção da linha de credenciais, em SQL separado para execução somente após o deploy da função.
- API do estoque com autenticação, identificação canônica de operador, bloqueios administrativos por token, escopo por loja e validações extras; escrita por RPC com CAS e histórico de movimentos imutável.
- Perdas passam a exigir correspondência única de produto e saldo suficiente na localização; baixa imediata. **Sem saldo ou referência, a gravação é bloqueada**, pois simular uma entrada ou descontar saldo negativo seria inventar dados. Perdas anteriores sem baixa continuam historicamente visíveis.
- Repetições de perda (mesma loja, referência, localização, motivo, quantidade e observação no intervalo de dois minutos) são barradas. Registros legitimamente distintos devem ser descritos de modo próprio.
- Operações com resultado incerto guardam o mesmo UUID/estado local e são consultadas/reconciliadas antes de aceitar novos commits. Em conflito não conciliável, o app bloqueia a operação até verificação, evitando repetição cega.
- Estorno de perda, edição de lojas e importação/restauração integral exigem administrador tanto na UI quanto nas validações de API/RPC; restaurações guardam snapshot anterior em tabela de auditoria.
- Imagens anexadas a perdas têm validação de MIME/base64/tamanho e escape seguro. Backups importados com fotos maliciosas são rejeitados.
- Fórmulas em CSV neutralizadas; código de barras de 12 dígitos cruzado com a referência de seis dígitos; preferências locais segmentadas por conta.
- Saldo de estoque indexado em memória, atualização remota sem download do JSON quando revisão inalterada, título do Gerencial corrigido e recarga automática adiada sempre que houver gravações pendentes, inclusive offline.
- A gravação local de estoque em hospedagem publicada sem sessão gerencial está bloqueada. Para migração pontual local, há opção de abrir o arquivo em `file://` ou desenvolvimento local com backups, mas isso **não é substituto** da nuvem em produção.
- Teste de regressão adicionado em `tests/estoque-av-v21-integridade.test.js`.

## Restrições e trabalho futuro (não declarar estes pontos como resolvidos)

- **Nenhum script do ZIP foi executado no banco real**, nem Edge Function foi publicada nesta entrega. É obrigatório fazer as etapas anteriores. Verificar RLS efetiva, múltiplas contas e concorrência em produção.
- **Recebimento de caminhões permanece agregado por categoria.** Não é correto aumentar saldo de SKU sem uma lista de produtos/referências e respectivas quantidades. Esse lançamento continuará separado do inventário por SKU até existir conferência de itens.
- **Fotografias permanecem no JSON** (até 450 KB individualmente). Migrar para Supabase Storage exigirá bucket, políticas e migração dos anexos antigos, não feita aqui.
- **HTML do Gerencial e Comunicação permanecem grandes** e há dependências CDN; a extração das mídias incorporadas e adoção de hashes SRI ainda exigem refatoração testada. Não foram modificados por risco de prejudicar telas aprovadas.
- **Alguns pop-ups nativos continuam** nos módulos Comunicação, Resultados e Permissões. A substituição requer tratar cada fluxo síncrono para evitar mudança na lógica. Não estão declarados como corrigidos.
- O modelo de sincronização do estoque ainda é um único JSON por workspace com limite de ~6 MB. A revisão evita download redundante ao usuário, mas a Edge Function ainda precisa consultar o registro completo para verificar a revisão. Alto volume exige normalização de tabelas e transações específicas.
- Em instalações com várias lojas, o operador 133 tem acesso global; outros operadores são restritos por `permissoes[operador].estoqueLojas` (IDs de loja). Sem configuração explícita, um operador só pode acessar o workspace que contenha exclusivamente `store24`. **Em caso de múltiplas lojas, admin deve configurar as lojas autorizadas no cadastro antes de liberar operadores.** Isso é um bloqueio seguro, não uma falha silenciosa.
- A autenticação legada conserva senhas no banco do servidor até migração posterior para hashes modernos. Com RLS aplicada, não são enviadas na configuração pública, mas rotação de senha e autenticação de produção são indispensáveis.

## Testes efetuados na entrega

- Verificação sintática dos blocos JS nas cinco páginas HTML principais: aprovada.
- Parsing TypeScript da função Edge: aprovado.
- Testes Node já incluídos (11) e novo teste V2.1: aprovados.
- Teste isolado no Chromium com HTML e armazenamento sintético (sem rede/produção): perda identificada debita 10 → 7; perda desconhecida não cria registro; lançamento repetido não é aceito; operador local não abre editar loja ou restaurar backup; imagem maliciosa não executa JS.
- **Não foi possível executar integração real com PostgreSQL, Supabase, login publicado, dois aparelhos reais ou fotos em Storage nesta sessão.** Portanto, a publicação requer homologação e backup.
