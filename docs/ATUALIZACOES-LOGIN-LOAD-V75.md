# V75 — Login e inicialização refinados

## O que mudou

### Login
- Tela de login redesenhada com identidade mais próxima da Avenida.
- Aplicação do **amarelo** como cor principal do fluxo de entrada.
- Remoção do visual com bordô nessas telas.
- Inclusão da **logo da Avenida** no painel de login.
- Estrutura reorganizada em duas áreas: apresentação do sistema + formulário de acesso.
- Melhor responsividade em tablet e celular.

### Load pós-login
- Tela de carregamento redesenhada com animação suave.
- Inclusão da **logo da Avenida** no centro da abertura.
- Remoção das verificações de:
  - Sistema de Estoque
  - Sistema de Resultados
  - IA/SOPHIA na tela inicial de entrada
- A tela de load agora exibe apenas verificações essenciais:
  - Validando acesso
  - Conexão segura
  - Carregando configurações
  - Sincronizando dados principais
  - Finalizando ambiente
- Barra de progresso simplificada para um único fluxo de inicialização.

## Observações
- A lógica principal de autenticação do Gerencial foi preservada.
- O login continua sendo validado pelo sistema principal.
- A abertura do painel continua dependendo do carregamento das configurações e dos dados principais.

## V75.1 — Correção do desbloqueio do login
- Corrigido bloqueio de digitação dos campos de operador e senha.
- Removido `disabled` inicial desses campos e do botão Entrar.
- A validação online e o bloqueio temporário do botão durante a autenticação continuam ativos.
