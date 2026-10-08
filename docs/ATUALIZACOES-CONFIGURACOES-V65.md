# Assistência Gerencial AV — V65: Configurações

- Removidos os textos informativos adicionais do cargo FISCAL no formulário e nas opções do Resultados, mantendo código funcional e regras de bloqueio.
- Nova organização da aba Configurações: Visão geral, Usuários, Permissões, Dados e backup (administrador).
- Operadores comuns visualizam Minha conta, Meus acessos e Dados e backup quando permitido.
- Identificadores HTML e ações existentes (liberar login, permissões, senha, backup, importação, limpeza) foram preservados.
- Busca local na tabela de usuários, sem alterar o banco nem salvar filtros.
- Navegação interna da aba, sem trocar a rota do sistema e sem chamar operações de gravação.
- Nenhuma tabela, documento, escala ou estrutura de dados do Supabase foi alterada.
- Atenção: as regras de FISCAL continuam sendo regras na aplicação; segurança autoritativa exige RLS e autenticação no servidor.
