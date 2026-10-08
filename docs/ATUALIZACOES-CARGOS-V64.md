# AV Gerencial — V64: novos cargos e perfil fiscal

## Cadastro de funcionários

- Adicionados os cargos **FREE LANCE** e **JOVEM APRENDIZ** nos formulários de Gerencial, Comunicação e Resultados.
- **FISCAL** agora possui um **código funcional próprio** `FISC-####`, derivado de seu operador numérico exclusivo (por exemplo, operador 145 → `FISC-0145`). Esse código é usado para identificação fiscal, **não é um login de caixa**.
- Mantém-se o número de operador numérico no cadastro para compatibilidade com o login, a matrícula e as integrações existentes. Para novo FISCAL sem operador, o formulário sugere automaticamente o próximo número não utilizado.
- O código aparece na edição do cadastro e na relação de operadores. Cada fiscal tem código próprio; não existe senha compartilhada para o cargo.
- Setor passa a **FISCAL**; o campo de caixa é bloqueado em **INATIVO**.

## Restrições do cargo FISCAL

- A operação de caixa é forçada a **INATIVO** ao salvar, carregar ou normalizar os registros. O botão de ativação manual recusa FISCAL.
- O Resultados exclui fiscais da lista de distribuição automática e manual de metas individuais, das listas de desempenho e dos rankings. Metas históricas são mantidas intactas no banco para auditoria, mas não são aplicadas ao FISCAL.
- No Resultados, perfil FISCAL acessa somente o painel geral. Ficam bloqueados calendário de vendas, Operadores, Funcionários, Lançamentos, Distribuição de Meta, GAME e AV Premia. Regras persistidas de permissão FISCAL são normalizadas para o padrão restritivo.
- A aba de metas pessoais do fiscal fica oculta.
- FREE LANCE e JOVEM APRENDIZ não recebem automaticamente bloqueios fiscais; seguem as permissões operacionais normais, conforme o cadastro.

## Considerações importantes

- Essa mudança **não altera nem apaga registros existentes**. Fiscais anteriormente marcados como `ATIVO` no caixa serão marcados `INATIVO` na próxima normalização/salvamento.
- A política é aplicada **dentro deste sistema**. Não controla terminais de PDV externos ou operações diretamente no banco executadas fora da aplicação. A garantia de autorização no backend depende da migração para Supabase Auth + RLS, ainda pendente na V63.
- Para cadastrar o fiscal, use **Gerencial → Funcionários → Adicionar cadastro → Cargo FISCAL**. O código `FISC-####` aparecerá automaticamente.
- Ao publicar no GitHub Pages, suba **todos os arquivos** do ZIP, sobretudo `shared/cargo-policy.js`; publicar apenas o HTML fará a política ficar indisponível.

## Verificações

- Testes de política funcional em `tests/cargo-policy.test.js`.
- Testes de sincronização anteriores preservados em `tests/resultado-sync.test.js`.
- Análise sintática de JavaScript incorporado e verificação de referências de arquivos, sem executar login real no Supabase.
