# V75.2 — Correções do login e carregamento pós-login

Base: V75.1 (mantidos todos os outros módulos e arquivos).

## 1. Identidade visual Avenida
- Removido o PNG pequeno (304×82) que vinha sendo usado no login e no carregamento.
- Reaproveitado o **emblema AV 512×512 já distribuído no próprio sistema** (`icons/gerencial-icon-512.png`).
- Adicionada a identificação AVENIDA em texto de alta nitidez no login.
- Mantidas as cores amarelo/branco no tema claro e grafite/amarelo no escuro.

## 2. Operador → senha
- Ao abrir, o campo do operador está liberado e o campo da senha está bloqueado.
- Ao informar um operador, a aplicação consulta a configuração oficial de usuários no Supabase.
- Somente **se o operador estiver autorizado** a senha e o botão Entrar são liberados.
- Operadores não autorizados e falhas de consulta não liberam a senha.
- Alterar o número do operador invalida imediatamente o desbloqueio anterior e limpa a senha.
- A verificação é automática após uma pausa curta na digitação, ou imediata com Enter/Tab.
- A senha segue sendo validada na etapa de autenticação, no banco oficial.

## 3. Carregamento após login
- As cinco etapas agora acompanham operações reais: credenciais, conexão, configuração, carregamento de dados e finalização.
- Removida a consulta redundante de internet/Supabase do checklist, já confirmada no carregamento dos acessos.
- Removida a duplicação de busca de configuração dos operadores durante o login.
- A tela não aguarda mais a abertura das sessões opcionais de SOPHIA e Documentos para liberar o Gerencial.
- Reduzido o atraso artificial final para 320 ms; o carregamento real dos dados continua sendo aguardado.
- Não há verificação de Estoque ou Resultados no load.
- Ajustada a rolagem do login em aparelhos estreitos.

## Testes
- Compilação sintática de 12 blocos de script JavaScript: sem erros.
- Simulações visuais/interativas em Chromium, nos temas claro e escuro e tamanhos desktop e celular.
- Cenários: operador 999 rejeitado, operador 133 autorizado, troca de operador bloqueia novamente, Enter permite acessar senha, senha inválida, login permitido e encerramento do loader.

**Limite do teste:** as simulações empregaram um provedor de autorização de teste; não foi usado login de produção do Supabase. A autorização online real deve ser validada em implantação.
