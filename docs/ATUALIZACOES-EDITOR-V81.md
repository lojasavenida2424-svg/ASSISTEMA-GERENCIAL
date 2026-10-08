# AV — V81: Editor de texto avançado

Base: versão V80, preservada fora dos componentes de redação listados abaixo.

## Locais com editor

- Central de Anotações > Anotação escrita.
- Central de Anotações > Anotação por voz > Revisão da transcrição.
- Central de Anotações > Observações de Funcionários > Feedback / observação.
- Quadro de Tarefas > Criar/Editar tarefa > Observação.

## Recursos

Fonte (Arial, Segoe UI, Georgia, Verdana, Times New Roman, Tahoma e Courier New), tamanho (12 a 36 px), cor de fonte, marca-texto, negrito, itálico, sublinhado, tachado, alinhamento esquerda/centro/direita/justificado, listas com marcadores e numeradas e limpar formatação.

## Compatibilidade e persistência

O texto simples continua nos campos de dados `descricao` (anotações e tarefas) e `texto` (feedbacks), para pesquisas, notificações, cópias e relatórios existentes. A nova formatação utiliza `descricaoHtml` (anotações e tarefas) e `textoHtml` (observações de funcionários). Registros antigos sem esses atributos continuam editáveis como texto simples.

O HTML é higienizado tanto ao colar quanto ao salvar/exibir: tags e atributos executáveis são descartados. Não é permitido incorporar scripts, links ou imagens pela edição de texto; use os anexos oficiais do sistema para arquivos.

## Testes locais

- Sintaxe dos 12 scripts inline do index: OK.
- Montagem dos 4 editores no navegador: OK.
- Negrito, cor, tamanho e persistência de estilos: OK.
- Alinhamento, listas e reabertura de conteúdo formatado: OK.
- Sanitização de conteúdo inseguro: OK.
- Revalidação da transcrição após edição: OK.
- Teste real de gravação e leitura com Supabase: pendente, deve ser confirmado em ambiente publicado.
