const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');

test('Tabela de Acompanhamento prepara as duas páginas em uma impressão isolada', () => {
  assert.match(html, /async function opImprimirTabelaAcompanhamentoIsolada\(tpl\)/);
  assert.match(html, /const folhas=\[1,2\]\.map\(page=>opTapfPagina\(tpl,dados,page\)\)\.join\(''\)/);
  assert.match(html, /operation-page\.tapf-operation-page\.active\{display:block!important/);
});

test('a rota de impressão da Tabela de Acompanhamento usa a rotina dedicada', () => {
  const printFunction = html.indexOf('async function imprimirModeloOperacao()');
  const printBody = html.slice(printFunction);
  const route = printBody.indexOf("if(tpl.kind==='tabela_acompanhamento_pf')");
  const generic = printBody.indexOf("if(tpl.kind==='static_pdf')");

  assert.ok(route > -1, 'rota dedicada da Tabela de Acompanhamento ausente');
  assert.ok(route < generic, 'a rota dedicada precisa ocorrer antes da impressão genérica');
  assert.match(printBody.slice(route, generic), /await opImprimirTabelaAcompanhamentoIsolada\(tpl\)/);
});

test('o layout reserva margem extra para o lado direito da folha', () => {
  assert.match(html, /\.tapf-page\{width:210mm;min-height:297mm;[^}]*padding:5mm 8mm 5mm 7mm/);
});
