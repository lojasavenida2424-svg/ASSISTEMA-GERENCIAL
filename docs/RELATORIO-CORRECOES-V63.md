# Assistência Gerencial AV — pacote de correções 2026-10-08

## Entregue neste ZIP

1. **Comunicação:** as telas consultam `gerencial_compartilhados_v1` para dados oficiais de funcionários, escalas e informações gerenciais. A versão antiga não grava mais esse registro: isso evita a sobrescrita de documentos, exclusões e acompanhamento por uma cópia desatualizada do Gerencial.
2. **Histórico do chat:** mensagens e grupos ficam em registro separado, `comunicacao_compartilhados_v2`, com importação única de `dados_compartilhados_v1` caso o novo registro não exista. A migração usa `insert`, sem sobrescrever linha criada por outra máquina. O registro legado não é apagado.
3. **Acessos:** Comunicação não recria usuários 139/144 como oficiais e não pode salvar configuração de permissões. Contas e permissões devem ser administradas no Gerencial. A falha de leitura da configuração não autoriza acesso com cache antigo.
4. **Integridade:** o login do Gerencial deixou de executar gravação de usuários/configuração apenas por abrir o sistema; a Comunicação não grava os dados gerenciais ao salvar uma conversa.
5. **Resultado:** a gravação da linha `dados_av_resultados_v1` usa comparação de `updated_at` e nova leitura em caso de disputa. A mesclagem de três vias preserva alterações independentes por propriedade ou por item com identidade estável. O processo mantém a cópia local se a sincronização falhar e tenta de novo.
6. **Senhas legadas:** o RESULTADOS não publica mais as antigas senhas predefinidas nem força a senha do 133 na normalização; para base nova, é necessário configurar o acesso manualmente. Senhas já persistidas no banco ou navegador não são removidas automaticamente; precisam ser alteradas.
7. **Operacional:** remove login pela matrícula ou padrão operador + 24 quando não existe senha cadastrada; exige senha atribuída no Gerencial.
8. **Referências:** corrigidos ícone do Estoque e registro do service worker de notificações na Comunicação.
9. **PWA:** manifesto do Resultados agora usa rotas relativas, cache atualizado para V63 e inclui nova biblioteca de mesclagem.
10. **Arquivo de Documentos:** ajuste pontual para quebra de linhas dentro dos campos; dimensões, arte e posição de etiquetas foram preservadas.

## O que ainda depende de configuração externa / trabalho complementar

**NÃO publique o sistema como se a autenticação estivesse protegida.** O login legado Gerencial/Operacional/Comunicação/Resultados valida senhas recebidas do navegador e o banco pode disponibilizar documentos sensíveis à chave pública. Remover o texto de senhas de alguns módulos **não** substitui Supabase Auth/RLS. A solução final requer:

- Criar e associar contas pessoais ao Supabase Auth; como existem **dois projetos Supabase**, definir estratégia de identidade em ambos.
- Migrar senhas existentes para autenticação no servidor, exigir redefinição de credenciais já expostas e remover `senha`/`password` dos JSONs acessíveis ao público após migração segura.
- Aplicar políticas Row Level Security (RLS) de **leitura e escrita por perfil** nas tabelas `assistencia_gerencial` e `av_resultados` (linha `dados_av_resultados_v1`), evitando políticas amplas `anon`.
- Mover operações administrativas do **AV TV** para conta autenticada com políticas de Storage e tabelas; sem isso o painel depende das permissões públicas.
- Fazer backup integral do banco e testar revogação de acessos, importações legadas, gravação simultânea em duas sessões e backup/restauração em ambiente de homologação.
- Refatorar duplicações e milhares de regras CSS históricas **somente depois de testes de regressão visuais**; não foram removidas em massa para não comprometer os documentos aprovados e menus.

## Implantação segura

1. Faça backup **da versão atual do repositório** e **de ambos os bancos Supabase**, antes de publicar qualquer arquivo.
2. No Supabase do Gerencial, confirme a existência de `gerencial_compartilhados_v1` em `assistencia_gerencial`; a Comunicação não irá recriá-la indevidamente.
3. Confirme permissões de leitura/escrita do registro `comunicacao_compartilhados_v2`; a rotina cria a linha na primeira abertura e importa chat legado **sem apagar o original**.
4. Envie todos os arquivos do ZIP juntos, inclusive `/shared/resultado-sync.js`; nunca envie só o HTML.
5. No Resultados, atualize a página após instalar o novo service worker. Verifique `Atualizado em tempo real`, salvamento de metas e novas alterações em outro computador.
6. Crie senhas individuais para quem depende de acesso padrão; após uma migração completa, rotacione todas as credenciais antigas.
7. Revise usuários 133, 139 e 144 e suas permissões oficiais; a Comunicação não deve alterar essa lista.

## Restrições e dados existentes

- Não foram acessados os bancos reais, o GitHub nem credenciais administrativas. **Não há confirmação de implantação ou teste multiusuário em ambiente real.**
- Nenhum registro remoto foi alterado por esta correção local.
- A linha `dados_compartilhados_v1` é preservada como arquivo legado. Não a apague sem conferência e cópia de segurança.
- Ao abrir Comunicação, a importação de mensagens acontece se o projeto Supabase permitir `insert` no registro novo. Se a política bloquear, o navegador exibirá erro ou cairá em cache: ajuste as permissões na fase de autenticação/RLS.
- Campos sem identidade estável e alterações simultâneas no mesmo campo não têm reconciliação automática perfeita: em colisões, a mesclagem favorece a alteração local, com cópia anterior ainda disponível nos backups. Preferir registros com IDs únicos.

## Validações desta entrega

A validação automática checou sintaxe JavaScript dos HTMLs e dos arquivos compartilhados, resolução de recursos locais e sete cenários unitários de mesclagem. **Não foi possível executar um teste de navegação autenticada no navegador ou de múltiplos computadores** neste ambiente, nem acessar as instâncias reais Supabase.
