# ESTOQUE AV — atualização 2.3.2

## Correções desta versão

- O ícone de **Código de barras** agora abre o leitor dentro de cada produto da ocorrência de perda, inclusive nos produtos adicionados pelo botão **Adicionar outro produto**.
- Ao confirmar a leitura, o código preenche somente aquele produto da ocorrência.
- O resumo exibido no produto da ocorrência mostra apenas o **nome do produto identificado**. Os detalhes continuam no registro aberto da perda.
- A descrição começa com um texto editável de acordo com a ocorrência e a localização selecionada:
  - **Furto:** “Produto encontrado no depósito/no salão de vendas com suspeita de furto.”
  - **Avaria:** “Produto encontrado no depósito/no salão de vendas com defeito.”
- **Esqueci a senha** abre diretamente o formulário com nome completo, data de nascimento e usuário. Após o envio, a solicitação fica em **Configurações → Usuários** do DESENVOLVEDOR e gera aviso ao entrar ou enquanto ele estiver conectado.

## Correções preservadas da V2.3.1

- Senha mínima de 3 caracteres.
- Senha local permanece salva mesmo se a finalização remota de uma solicitação falhar naquele momento.
- Perdas possuem edição dos dados descritivos e suporte a vários produtos no mesmo registro.

## Atualizar

1. Exporte um backup em **Configurações → Backup e dados**.
2. Publique o conteúdo completo do pacote atualizado.
3. Se usa somente o Estoque, substitua `estoque/index.html` pelo arquivo atualizado dentro da pasta `estoque`.
