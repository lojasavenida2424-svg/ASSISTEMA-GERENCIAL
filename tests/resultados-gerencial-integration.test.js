const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const resultHtml = fs.readFileSync(path.join(root, 'resultados', 'index.html'), 'utf8');

test('RESULTADO carrega o contrato compartilhado antes do fallback interno', () => {
  const shared = resultHtml.indexOf('../shared/gerencial-resultados.js');
  const source = resultHtml.indexOf('../shared/resultado-source.js');
  const fallback = resultHtml.indexOf('id="av-resultados-shared-fallback"');

  assert.ok(shared > -1, 'módulo gerencial-resultados ausente');
  assert.ok(source > -1, 'módulo resultado-source ausente');
  assert.ok(shared < fallback, 'fallback interno está vencendo o contrato compartilhado');
  assert.ok(source < fallback, 'fonte compartilhada deve carregar antes do fallback');
});

test('fallback interno não substitui a projeção atual de metas do Gerencial', () => {
  const shared = require(path.join(root, 'shared', 'gerencial-resultados.js'));
  const marker = '<script id="av-resultados-shared-fallback">';
  const start = resultHtml.indexOf(marker);
  const code = resultHtml.slice(resultHtml.indexOf('\n', start) + 1, resultHtml.indexOf('</script>', start));
  const context = { window: { AVManagement: shared } };
  vm.createContext(context);
  vm.runInContext(code, context);

  const gerencial = {
    distribuicoes: {
      '2026-10': {
        '2026-10-01': { venda: 1000, ativados: 2 },
        '2026-10-02': { venda: 1500, ativados: 3 }
      }
    },
    metasComplementares: {
      '2026-10': { pcj: 5, pf: { bolsa: 1, compra: 2, protecao: 3, sabadao: 4, sms: 5, vida: 6 } }
    },
    resultados: []
  };

  const goal = context.window.AVManagement.build(gerencial, '2026-10-02').goals['2026-10'];
  assert.equal(goal.venda, 2500);
  assert.equal(goal.ativados, 5);
  assert.equal(goal.pfTotal, 21);
});

test('a experiência V100 mantém a integração e a nova identidade do RESULTADO', () => {
  assert.match(resultHtml, /id="av-resultados-v100-premium"/);
  assert.match(resultHtml, /AVENIDA • PERFORMANCE DA LOJA/);
  assert.match(resultHtml, /Painel gerencial|Visão geral/);
  assert.match(resultHtml, /id="managementSourceNote"/);
});

test('RESULTADO aceita a credencial oficial do GERENCIAL quando não houver senha local', () => {
  assert.match(resultHtml, /const MANAGEMENT_CONFIG_ROW = "config_global_v1"/);
  assert.match(resultHtml, /async function authenticateResultUser\(operator,password\)/);
  assert.match(resultHtml, /const user = await authenticateResultUser\(op,pass\)/);
  assert.match(resultHtml, /userFromManagementCredentials\(config,operator,password\)/);
});
