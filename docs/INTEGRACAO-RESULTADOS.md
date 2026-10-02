# GERENCIAL e RESULTADO — fluxo integrado

O RESULTADO é uma extensão do GERENCIAL: consulta os resultados oficiais da loja e administra metas individuais. Não é necessário criar outra tabela de banco para esta alteração.

## Como usar

1. No GERENCIAL, abra **Acompanhamento Gerencial** e selecione o mês.
2. Em **Distribuição**, mantenha o planejamento diário de Venda e Ativados. Preencha também o quadro **Metas da loja — PCJ e Produtos Financeiros** e salve.
3. Em **Lançar resultado**, informe Venda, Ativados, PCJ do dia e as quantidades dos seis PFs. O total de PF é calculado. A regra existente de lançamento do dia anterior foi mantida.
4. O PCJ acumulado deve ser copiado do relatório oficial. Não é calculado por soma ou média simples dos percentuais diários. Campo vazio significa não informado; zero é um resultado válido.
5. Abra **RESULTADO**. O painel apresenta o último dia lançado, com a data explícita, e o acumulado daquele mês. Os demais dias ficam disponíveis no calendário.
6. Em **Distribuição de meta**, selecione o mês e um colaborador ativo cadastrado no GERENCIAL. Preencha Venda, Ativados, PCJ e PF por produto; salve. O colaborador pode consultar a própria meta.
7. A opção **Dividir metas da loja igualmente** mostra os totais e a lista de colaboradores antes da confirmação. Venda é dividida em centavos, Ativados e PF em unidades inteiras, preservando os totais. A meta percentual de PCJ é aplicada a cada pessoa. Depois do rateio, cada meta pode ser ajustada manualmente.

Colaboradores sem número de operador, inativos ou desligados não entram na distribuição. Metas históricas permanecem armazenadas. O quadro compara o que foi distribuído aos colaboradores ativos com a meta da loja.

## Fonte de dados

| Dado | Origem oficial |
| --- | --- |
| Cadastro de colaboradores | `funcionarios[]` do GERENCIAL |
| Venda e Ativados planejados | `gerencial.distribuicoes[AAAA-MM][AAAA-MM-DD]` |
| Meta de PCJ e metas mensais de PF | `gerencial.metasComplementares[AAAA-MM]` |
| Realizado da loja | `gerencial.resultados[]` |
| Metas individuais | `goalDistribution[AAAA-MM][operador]` no RESULTADO |

Campos adicionais do realizado: `pcj`, `pcjAcumulado`, `pf`, `pfDetalhado` e `atualizadoEmISO`. Chaves de PF preservadas: `bolsa`, `compra`, `protecao` (Proteção da Sorte), `sabadao`, `sms` e `vida`.

A meta mensal de PF é repartida igualmente pelos dias do mês, em unidades inteiras, para exibição da meta diária. O cadastro de metas individuais é independente: sua edição não altera a meta da loja. Resultados da loja não são redistribuídos como se fossem resultados de cada colaborador; os registros individuais existentes continuam separados.

## Sincronização — correção de origem (V62)

Os indicadores da loja são carregados exclusivamente da tabela `assistencia_gerencial`, linha `gerencial_compartilhados_v1`, no mesmo projeto Supabase configurado no GERENCIAL.

- A linha legada `dados_compartilhados_v1` deixou de ser consultada pelo RESULTADO.
- O cache geral do navegador, a base própria `av_resultados`, o IndexedDB e backups antigos não fornecem totais da loja.
- Alterações no cache do GERENCIAL apenas solicitam uma nova consulta ao servidor. Nenhum valor local antigo ganha prioridade por conter a marca de sincronização pendente.
- A sincronização é consultada ao entrar, ao voltar à aba, ao reconectar e a cada 30 segundos enquanto a tela estiver aberta. Existe também o botão **Atualizar dados do GERENCIAL** no painel.
- A assinatura de atualizações online continua ativa. Leituras atrasadas não substituem um evento mais recente.
- Offline, a única cópia aceita é `av_resultados_gerencial_oficial_v2`, criada após uma leitura bem-sucedida da linha oficial. A tela mostra **OFFLINE**, a origem e a data/hora da última conferência.
- Se a linha oficial estiver ausente ou inválida, a tela informa a indisponibilidade. Não tenta preencher indicadores usando outro banco. Uma resposta oficial vazia produz indicadores vazios/zerados, mesmo que exista um cache antigo com valores.
- Datas sem lançamento do GERENCIAL não usam o histórico fixo de julho/2026 nem a soma dos registros individuais.

As metas individuais, permissões, registros individuais e premiações continuam na persistência própria do RESULTADO. Os totais da loja não são gravados nesse banco. O carregamento inicial também não envia automaticamente um snapshot antigo ao servidor.

Os dados antigos de totais são preservados em `legacyStoreArchive`, sem participar da exibição ou dos cálculos. Não é necessário apagar todo o armazenamento do navegador; isso poderia remover dados próprios úteis.

**Atenção ao fluxo de trabalho:** os lançamentos do GERENCIAL precisam terminar a sincronização online para aparecerem no RESULTADO. Enquanto o envio estiver pendente, o RESULTADO continuará exibindo o último lançamento confirmado pelo servidor. Sua identificação da fonte e data permite reconhecer essa situação.

Esta correção não altera as tabelas, as políticas de acesso nem a autenticação do Supabase.

## Arquivos alterados

- `index.html`: lançamentos de PCJ/PF, metas complementares, correção de centavos, retirada da rotina destrutiva de reset e link relativo para RESULTADO.
- `resultados/index.html`: leitura canônica dos quatro indicadores, consulta de totais da loja, metas individuais de Venda, seleção de mês, cadastro ativo e rateio.
- `shared/gerencial-resultados.js`: normalização, projeção diária/mensal e divisão exata.
- `shared/resultado-source.js`: separação dos dados próprios do RESULTADO e arquivamento dos totais antigos.
- `resultados/sw-pwa.js`: nova versão do cache, inclusão do módulo compartilhado e preservação dos caches dos outros sistemas.

Publique a pasta completa preservando os caminhos. Não copie somente o HTML: os dois arquivos da pasta `shared` são necessários. Após publicar, recarregue as abas abertas do GERENCIAL e do RESULTADO.

## Verificação desta versão

Testes locais em DOM simulado reproduziram dados divergentes no cache geral, cache legado, banco próprio do RESULTADO e fonte oficial do GERENCIAL. Foram verificados: precedência exclusiva da linha oficial, resposta vazia, linha inexistente, cópia offline identificada, recarregamento, atualização entre abas via nova consulta, ausência de publicação automática de dados antigos e conservação das metas individuais.

Também foram conferidos o lançamento pelo formulário do GERENCIAL, centavos, PCJ/PF, rateio exato, ausência de dupla contagem e exclusão dos totais da loja dos payloads salvos no RESULTADO. Os scripts foram verificados sintaticamente.

As respostas Supabase foram simuladas para estes testes. Não houve leitura ou escrita no banco de produção, nem publicação no GitHub.
