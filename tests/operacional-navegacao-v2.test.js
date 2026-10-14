const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const html = fs.readFileSync(path.join(__dirname, '../operacional/index.html'), 'utf8');

test('menu responsivo oferece quatro áreas e os estados só aparecem como filtro de tarefas', () => {
  const desktop = html.match(/<aside class="desk-rail"[\s\S]*?<\/aside>/)?.[0] || '';
  const mobile = html.match(/<nav class="bottom-nav"[\s\S]*?<\/nav>/)?.[0] || '';
  const expected = ['HOME', 'TAREFAS', 'PERFIL', 'CONFIGURACOES'];
  for (const menu of [desktop, mobile]) {
    assert.deepEqual([...menu.matchAll(/data-view="([^"]+)"/g)].map(x => x[1]), expected);
    assert.doesNotMatch(menu, /data-tab=/);
  }
  assert.match(html, /<select id="filterStatus"/);
  assert.doesNotMatch(html, /<div class="tabs"/);
});

test('navegar entre áreas preserva o filtro de status dentro de Tarefas', () => {
  const start = html.indexOf("const UI_PREFS_KEY='operacionalPreferenciasUIV3Operador'");
  const end = html.indexOf('async function refreshOnline', start);
  assert.ok(start > 0 && end > start);
  const elements = {
    filterDate: {value:'HOJE'},
    filterSearch: {value:''},
    settingsDefaultPeriod: {value:'TODAS'},
    settingsDensity: {value:'NORMAL'},
    app: {classList:{toggle(){}}}
  };
  const buttons = ['HOME','TAREFAS','PERFIL','CONFIGURACOES'].map(view => ({dataset:{view},classList:{toggle(){}},setAttribute(){},removeAttribute(){}}));
  const stored = new Map([['operacionalPreferenciasUIV3Operador_144',JSON.stringify({period:'TODAS',density:'NORMAL'})]]);
  const state = {view:'HOME',tab:'TODAS',employee:{operador:'144'}};
  const context = {state,opnorm:v=>String(v||''),document:{querySelectorAll:()=>buttons},localStorage:{getItem:k=>stored.get(k),setItem:(k,v)=>stored.set(k,v)},$:(id)=>elements[id],render(){},salvarEstadoOperacionalAntesReload(){},window:{scrollTo(){}},toast(){}};
  vm.runInNewContext(html.slice(start,end),context);
  context.openView('TAREFAS');
  assert.equal(state.view,'TAREFAS');
  assert.equal(elements.filterDate.value,'TODAS');
  context.setTab('PENDENTE');
  assert.equal(state.tab,'PENDENTE');
  assert.equal(state.view,'TAREFAS');
  context.openView('PERFIL');
  context.openView('HOME');
  assert.equal(elements.filterDate.value,'HOJE');
  assert.equal(state.tab,'PENDENTE');
});
