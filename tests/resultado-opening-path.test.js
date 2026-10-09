const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const mainHtml = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const comunicacaoHtml = fs.readFileSync(path.join(root, 'comunicacao', 'index.html'), 'utf8');

test('atalho do AV RESULTADO aponta diretamente para o arquivo de entrada', () => {
  assert.match(mainHtml, /data-sistema-av-link="resultado"[^>]*href="\.\/resultados\/index\.html"/);
  assert.match(mainHtml, /new URL\('\.\/resultados\/index\.html', document\.baseURI\)\.href/);
  assert.ok(fs.existsSync(path.join(root, 'resultados', 'index.html')));
});

test('verificação do módulo dentro de Comunicação usa a entrada do RESULTADO', () => {
  assert.match(comunicacaoHtml, /new URL\('\.\.\/resultados\/index\.html', document\.baseURI\)\.href/);
});
