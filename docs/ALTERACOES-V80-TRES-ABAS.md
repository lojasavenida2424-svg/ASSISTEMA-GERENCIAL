# V80 — Redesenho de três abas
Base: V79 (menu lateral restaurado).

## Central de Anotações
- Layout de biblioteca, contadores calculados sobre os filtros atuais, cartões de anotações e formulário reorganizado visualmente.
- Observações de Funcionários mantidas com acabamento visual consistente.

## Quadro de Tarefas
- Novo cabeçalho com ações e modos de visualização.
- Destaque de indicadores de status, filtros e blocos de tarefas.
- Preservados o cronograma, modal e ações existentes.

## Quadro de Funcionários
- Cabeçalho e indicadores de total, ativos e filtrados.
- Alternância entre cartões de resumo e tabela completa sem alterar os dados ou a consulta original.
- Avisos de cadastro e privacidade organizados em painel expansível.

## Escopo e arquitetura
- Novos arquivos: `styles/tres-abas-v80.css` e `shared/tres-abas-v80.js`.
- Inclusão de marcação e chamadas de atualização de indicadores em `index.html`.
- Sem alteração nas funções de autenticação, permissões, persistência, banco de dados ou estrutura de documentos.
- Visual validado em navegadores de teste com layouts de 1365px e 390px, temas claro e escuro, e controles de alternância do Quadro de Funcionários.
- Há 2 testes legados de Configurações com falha já presente na V79; esta versão não altera esse módulo.
