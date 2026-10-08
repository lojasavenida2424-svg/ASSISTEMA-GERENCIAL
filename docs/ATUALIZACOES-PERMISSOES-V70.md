# V70 — Visibilidade das seções internas de Configurações

- Na central **Configurações > Permissões**, nova guia **Configurações** permite escolher a visibilidade de: Visão geral/Minha conta, Usuários, Permissões/Meus acessos e Dados e backup.
- É necessário habilitar **Configurações** na guia Módulos. A seleção fica salva em `globalConfig.permissoes[operador].acessosDetalhados.secoesConfig`.
- Usuários comuns podem consultar a lista de contas **somente se liberados**, sem editar senhas ou perfis. Em Permissões, acessam apenas **Meus acessos**.
- A visibilidade de Dados e backup **não concede** o direito de fazer backup: continua dependendo da permissão `backupDados`. Importar/limpar permanecem exclusivos do painel do administrador.
- O operador 133 segue protegido com acesso integral.
- Perfis novos recebem padrões por cargo, sem reescrever configurações individuais já existentes. Perfis legados mantêm a visibilidade histórica (Minha conta e Meus acessos; Dados e backup se `backupDados` estava ativo).
- Tela e regras no navegador não substituem Supabase Auth/RLS. O banco precisa garantir isolamento e segurança de dados.
- Somente o `index.html`, `shared/permissoes-v66.js` e a nova folha `styles/configuracoes-v70-secoes.css` foram alterados, além desta documentação.
