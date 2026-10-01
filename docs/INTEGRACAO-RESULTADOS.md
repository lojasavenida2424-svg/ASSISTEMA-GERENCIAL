# Integração AV Resultados ↔ Assistência Gerencial

## Caminho oficial

- Gerencial: `/ASSISTEMA-GERENCIAL/`
- Resultados: `/ASSISTEMA-GERENCIAL/resultados/`

## Fonte oficial dos dados

O AV Resultados usa o **Acompanhamento Gerencial** como fonte de Venda e Ativados.

- `gerencial.distribuicoes[AAAA-MM][AAAA-MM-DD].venda` → meta diária de Venda
- `gerencial.distribuicoes[AAAA-MM][AAAA-MM-DD].ativados` → meta diária de Ativados
- soma da distribuição do mês → metas mensais
- `gerencial.resultados[]` → Venda e Ativados realizados
- `funcionarios[]` → colaboradores/operadores

## Leitura em duas camadas

1. Cache oficial do Gerencial no mesmo domínio:
   - `adminGerencialLojaV7_gerencial_compartilhados_v1_cache`
   - `adminGerencialLojaV7_gerencial_compartilhados_v1_base_sync`
2. Supabase:
   - tabela `assistencia_gerencial`
   - linha `gerencial_compartilhados_v1`

A linha `dados_compartilhados_v1` permanece somente como fallback legado.

## Atualização

O Resultados sincroniza o Gerencial em toda inicialização. Também observa alterações do `localStorage` entre abas e reaplica os dados quando a aba volta a ficar visível.
