# Sistema Operacional AV — Correções no pacote entregue

**Origem:** `ASSISTEMA-GERENCIAL-main(4).zip`  
**Data:** 13/10/2026  
**Abrangência:** arquivos `operacional/index.html` e `index.html` (exclusivamente rotinas Gerenciais de acesso/diário/validação), mais testes/documentação. Layout, marca, navegação e demais módulos foram preservados.

## Alterações implementadas

1. **Restauração indevida de identidade:** um registro manual no `sessionStorage` não autentica mais um operador. Ao recarregar a página, o sistema lembra apenas o número do operador e exige nova senha. Este é um endurecimento **do cliente**, não substitui autenticação segura no servidor.
2. **Permissões filtradas:** ao pesquisar ou alternar filtros, as alterações em checkboxes permanecem em um rascunho; salvar preserva o estado dos operadores não exibidos na pesquisa.
3. **Edição Gerencial de tarefa:** o formulário do Gerencial preserva `execucao`, `impedimento`, `fotoConclusaoRegistroId`, metadados de evidência e campos não reconhecidos, inclusive tarefas atribuídas a assessores adicionais.
4. **Checklist:** enquanto tarefa estiver concluída, cancelada ou aguardando validação, os controles aparecem bloqueados. Também há validação da condição imediatamente antes da gravação no registro remoto.
5. **Cronômetro após devolução:** a rejeição da conclusão devolve a tarefa em `PAUSADA` e usa o instante de **envio da conclusão** como início da pausa, para não contabilizar a espera pelo líder. O colaborador precisa clicar em **Retomar** antes de concluir novamente.
6. **Transições:** bloqueios para concluir tarefas não iniciadas, retomar tarefa que não esteja pausada ou iniciar uma tarefa que já não esteja pendente.
7. **Meu Dia:** recomenda apenas tarefas agendadas para hoje ou anteriores, sem transformar tarefas futuras em prioridade de hoje.
8. **Indicadores:** conclusão aprovada é contada em “concluídas”; itens aguardando validação são exibidos separadamente no progresso.
9. **Filtros e navegação:** a tela lembra aba, pesquisa, período, posição de rolagem e modal de tarefa no armazenamento da sessão para restaurar após nova autenticação.
10. **Fotografias:** seleção repetida do mesmo arquivo volta a funcionar porque o input é zerado ao abrir a conclusão.
11. **Conectividade:** a etiqueta offline agora informa claramente que, por segurança dos dados, a consulta segue disponível, mas edições exigem internet.
12. **Regressão:** foram adicionados seis testes específicos do Operacional. A suíte total chegou a **27 testes aprovados**; fluxo principal foi validado em Chromium com Supabase simulado.

## Pendências que dependem de infraestrutura (não implantadas)

### Segurança: Supabase Auth e políticas RLS

O login atual ainda recebe `config_global_v1` no navegador e compara `usuarios[].senha` no cliente. A chave `anon` (pública) permanece no HTML. Portanto, uma pessoa tecnicamente capaz de manipular requisições ou ler o JSON disponível pelo banco ainda pode explorar permissões **caso o RLS real não imponha controles seguros**. A correção completa exige:

- Migrar cada operador para identidade autenticada no Supabase Auth (ou backend equivalente) e migrar/remover senhas em texto puro do objeto global.
- Definir tabelas/endpoints por colaborador que exponham apenas os dados necessários, em vez de compartilhar toda a base JSON entre usuários.
- Configurar RLS para operações de leitura, escrita, evidências e validação do líder, vinculadas à identidade do JWT.
- Atualizar juntos **Gerencial e Operacional** para passar a usar os endpoints autenticados. Aplicar RLS bloqueando o acesso anônimo *antes* dessa migração derrubaria ambos os sistemas.
- Testar em homologação com dois operadores, líder e usuário não autorizado; auditar a configuração real antes de ativar em produção.

**Não foi feito login no Supabase de produção, nem implantadas políticas RLS. Não declarar segurança de produção aprovada.** O script `docs/AUDITORIA-SUPABASE-SOMENTE-LEITURA.sql` preexistente pode ajudar a coletar informações para a migração.

### Fotos: Supabase Storage

O fluxo atual guarda evidências comprimidas em registros separados na tabela lógica (Base64) e apenas miniatura na tarefa. O input foi corrigido, mas **não foi realizada migração automática para Storage**, porque isso depende de bucket privado, políticas de acesso do banco e migração das fotos já existentes. Não criar bucket público para acomodar as permissões atuais; isso exporia evidências.

### Operações sem internet

O módulo continua com **consulta de dados já carregados offline; alterações exigem conexão**. Uma fila offline de gravações não foi ativada porque implicaria aplicar ações de uma pessoa num JSON gerencial compartilhado, sujeito a concorrência/conflitos e identidade não validada pelo servidor. A evolução depende de endpoints autenticados e eventos idempotentes, com política definida para conflitos.

## Testes executados

- `node --check` em todos os scripts JavaScript inline (`index.html`: 12; `operacional/index.html`: 4); nenhum erro sintático.
- `node --test tests/*.test.js`: 27 de 27 aprovados, incluindo novos testes `tests/operacional-correcao.test.js`.
- Chromium local, com **mock de Supabase**: login válido, impossibilidade de restaurar sessão forjada, isolamento visual por operador, iniciar/pausar/retomar, envio à validação, bloqueio de checklist e priorização de tarefas por data.

**Atenção:** os testes não validam as permissões reais do banco e não alteram os dados de produção.

## Uso/instalação

1. Faça backup do conteúdo e das configurações que estão implantados atualmente.
2. Substitua os arquivos do projeto pelos deste ZIP, preservando a hierarquia (`operacional/index.html` não deve ser movido).
3. Publique ambos os arquivos alterados **Gerencial `index.html` e `operacional/index.html`** para que a devolução de tarefas e as permissões permaneçam compatíveis.
4. Limpe o cache do site, acesse novamente e faça login com a senha individual existente. Nova confirmação após atualização da página é **intencional**.
5. Em ambiente de homologação, teste funcionário com tarefa e foto, líder devolvendo/aprovando, filtros de acesso, edição de tarefa já iniciada e sincronização concorrente.
6. Planeje a etapa de autenticação/RLS e de Storage **antes de considerar o sistema seguro para produção**.
