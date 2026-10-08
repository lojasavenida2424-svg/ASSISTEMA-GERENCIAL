# AV Gerencial V66 — Configurações > Permissões

## Escopo
Somente a experiência de Configurações > Permissões e os pontos necessários para aplicar o acesso a modelos de documentos em Operações foram alterados. Preservados: modelos, dimensões dos documentos, escalas, Resultados, Comunicação e demais seções visuais.

## Recursos
- Painel refinado: lista e busca de operadores, filtro de cargo, resumo e navegação por Módulos / Ações / Documentos / Sistemas AV / Restrições.
- Cadastro de documentos derivado de `OPERATION_CATEGORIES` e `OPERATION_TEMPLATES`; as categorias e nomes não são duplicados no editor.
- Em Documentos: marcar individualmente Ver, Criar, Editar, Imprimir e Excluir por **modelo de documento** (não por versão/arquivo salvo individualmente).
- Filtro por documento, agrupamento por área, distinção de modelos não editáveis.
- Aplicar perfil do cargo, copiar permissões de outro operador e reverter alterações não salvas.
- O operador 133 mantém acesso integral protegido. Regras fiscais obrigatórias de caixa e metas não são liberadas pelo editor.
- Permissões persistidas com o restante da configuração oficial em `config_global_v1`, no campo `permissoes[OPERADOR].acessosDetalhados`.
- Permissões legadas permanecem válidas até que o administrador escolha alterar cada conta. Não há migração que revogue automaticamente os acessos atuais.

## Integração real em Operações
- Modelos sem permissão `ver` não aparecem na biblioteca e arquivos já salvos do modelo são ocultados em Recentes / pastas de colaborador / arquivos gerais.
- As rotinas centrais de selecionar modelo, abrir e editar arquivo, salvar rascunho, imprimir e excluir arquivo validam a permissão do usuário antes da ação.
- O editor conserva as regras do módulo Operações: um documento só pode ser acessado se o módulo também estiver autorizado.
- Ações não permitidas deixam de ser oferecidas nas listas principais de arquivos salvos.
- Novo acesso é reavaliado após autenticação, e a seleção inicial não deve ficar presa a modelo negado.

## Limitações importantes antes do ambiente de produção
1. **Segurança de backend:** o Gerencial ainda utiliza autenticação legada em JavaScript, não Supabase Auth. O controle do lado do navegador não impede acesso por API/URL diretamente. Para dados sensíveis, configurar RLS e autenticação real no Supabase e estender autorização por tipo de documento à Edge Function `gerencial-documentos`. Os documentos podem ser carregados para o navegador durante a sincronização e o ocultamento não é uma fronteira de sigilo.
2. A matriz de Ações de módulos que não são Operações **armazena as regras**, mas ainda não está vinculada a todos os handlers desses módulos. Não deve ser interpretada como bloqueio de segurança completo. As restrições "Sem exportação" e "Somente leitura" são respeitadas pela verificação central para documentos, mas as áreas externas exigem integrações específicas.
3. O controle documental é por **tipo/modelo**: Arquivo de Documentos, Termo, Guardião etc. Não controla uma instância individual específica de um modelo nem anexos de outras seções (tarefas e notas).
4. Os perfis por cargo são modelos de referência aplicados manualmente; a alteração automática de cargo não substitui as permissões individuais anteriores.
5. A configuração global não é gravada em modo `PRE_V2_CLOUD_READ_ONLY`; o editor agora sinaliza erro nesse caso, em vez de mostrar confirmação falsa.
6. Não foi possível executar a aplicação inteira conectada à instância real do Supabase; validar em homologação com backup antes de publicar.
