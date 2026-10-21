# Integração — ESTOQUE AV V1.8

- O app completo está em `estoque/index.html`, dentro deste repositório.
- Em **SISTEMA AV → ESTOQUE AV**, o cartão abre a aplicação em uma janela do próprio Gerencial. Pode-se voltar ao Gerencial pelo botão da janela ou abrir em outra guia.
- O cartão respeita a permissão pré-existente `sistemaAvLinks.estoque`; nenhuma configuração de permissões foi alterada.
- O aplicativo usa seu próprio login e armazenamento local do navegador; as contas e os registros NÃO são sincronizados com os dados do Gerencial e NÃO há autenticação única ou Supabase de Estoque.
- Os dados do Estoque em `localStorage` são exclusivos do domínio/origem (podem variar se mudar de endereço/hospedagem). Antes da migração, exporte backup no Estoque.
- Para publicar, mantenha a pasta `estoque/` na mesma hierarquia de `index.html` e publique toda a estrutura.
- A abertura em iframe depende das políticas de hospedagem; para teste local prefira servidor estático (por exemplo, `python -m http.server 8000`) em vez de `file://`.
- Nenhum outro módulo foi redesenhado.
