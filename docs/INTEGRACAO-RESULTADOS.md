# Integração — Assistência Gerencial x AV Resultados

## Fonte oficial

O módulo AV Resultados consome os dados do registro compartilhado do Assistência Gerencial no Supabase.

A aba **Acompanhamento Gerencial** é a fonte oficial para os indicadores de Venda e Ativados.

### Metas
Origem:

`dados.gerencial.distribuicoes[AAAA-MM][AAAA-MM-DD]`

Campos utilizados:
- `venda` — meta de Venda do dia;
- `ativados` — meta de Ativados do dia.

No AV Resultados:
- Meta de Venda do dia = `venda` da data;
- Meta mensal de Venda = soma de `venda` de todas as datas do mês;
- Meta de Ativados do dia = `ativados` da data;
- Meta mensal de Ativados = soma de `ativados` de todas as datas do mês.

### Resultados realizados
Origem:

`dados.gerencial.resultados[]`

Campos utilizados:
- `data` — data do resultado;
- `venda` / `realizado` / `vendas` — Venda realizada;
- `ativados` — Ativados realizados;
- `meta` — fallback da meta de Venda quando não existir distribuição;
- `metaAtivados` — fallback da meta de Ativados quando não existir distribuição.

No AV Resultados:
- Venda realizada do dia = resultado lançado para a mesma data;
- Venda acumulada do mês = soma dos resultados lançados no mês;
- Ativados do dia = resultado lançado para a mesma data;
- Ativados acumulados = soma dos resultados lançados no mês.

A Distribuição tem prioridade sobre os campos `meta` e `metaAtivados` presentes em Resultado Comercial.

## Colaboradores

O cadastro de colaboradores continua vindo da lista `funcionarios` compartilhada pelo Gerencial. O AV Resultados não deve manter uma segunda lista operacional independente.

## Indicadores exclusivos do AV Resultados

Continuam sendo controlados pelo próprio AV Resultados:
- PF e produtos financeiros;
- PCJ;
- GAME;
- AV Premia;
- percentuais individuais e demais lançamentos específicos do módulo Resultados.

## Sincronização

O AV Resultados consulta o registro `gerencial_compartilhados_v1` da tabela `assistencia_gerencial` e assina alterações em tempo real. Quando o Acompanhamento Gerencial é salvo, o Resultados reaplica metas e resultados vindos do Gerencial.
