const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const root=path.join(__dirname,'..');
const gerencial=fs.readFileSync(path.join(root,'index.html'),'utf8');
const operacional=fs.readFileSync(path.join(root,'operacional/index.html'),'utf8');

test('Operacional isola preferências por operador e login inicia com tema padrão',()=>{
  assert.match(operacional,/document\.documentElement\.dataset\.theme='light';document\.documentElement\.dataset\.accent='padrao'/);
  const begin=operacional.indexOf("const UI_PREFS_KEY='operacionalPreferenciasUIV3Operador'");
  const end=operacional.indexOf('function syncNavigation',begin);
  const saved=new Map(),state={employee:{operador:'144'}},theme={dataset:{}},meta={content:''};
  const fields={settingsDefaultPeriod:{value:'HOJE'},settingsDensity:{value:'NORMAL'},settingsTheme:{value:'ESCURO'},settingsAccent:{value:'ROXO'},app:{classList:{toggle(){}}}};
  const context={state,opnorm:v=>String(v||''),localStorage:{getItem:key=>saved.get(key)||null,setItem:(key,value)=>saved.set(key,value)},document:{documentElement:theme,querySelector:()=>meta},$:id=>fields[id],toast(){}};
  vm.runInNewContext(operacional.slice(begin,end),context);
  context.saveUiPreferences();
  assert.equal(saved.size,1);assert.match(saved.keys().next().value,/_144$/);
  state.employee={operador:'199'};assert.equal(context.readUiPreferences().accent,'PADRAO');
  fields.settingsAccent.value='VERDE';context.saveUiPreferences();
  assert.equal(saved.size,2);assert.equal(context.readUiPreferences().accent,'VERDE');
  state.employee={operador:'144'};context.applyUiPreferences();
  assert.equal(theme.dataset.accent,'roxo');assert.equal(theme.dataset.theme,'dark');
});

test('Gerencial aplica tema após autenticação e separa usuários',()=>{
  assert.match(gerencial,/root\.dataset\.theme = 'light';/);
  const begin=gerencial.indexOf('function chaveTemaGerencialDoOperador()');
  const end=gerencial.indexOf('function showPage(',begin);
  assert.ok(begin>0&&end>begin);
  const saved=new Map(),classes=new Set(),btn={setAttribute(){}},rootElement={dataset:{}};
  const context={usuarioAtual:{operador:'144'},normalizarOperador:String,document:{body:{classList:{toggle:(name,enabled)=>enabled?classes.add(name):classes.delete(name),contains:name=>classes.has(name)}},documentElement:rootElement,getElementById:()=>btn},localStorage:{getItem:k=>saved.get(k),setItem:(k,v)=>saved.set(k,v)}};
  vm.runInNewContext(gerencial.slice(begin,end),context);
  context.toggleTheme();assert.equal(rootElement.dataset.theme,'dark');
  context.usuarioAtual={operador:'199'};context.aplicarTemaGerencialDoOperador();assert.equal(rootElement.dataset.theme,'light');
  context.toggleTheme();context.usuarioAtual={operador:'144'};context.aplicarTemaGerencialDoOperador();assert.equal(rootElement.dataset.theme,'dark');
});

test('Gerencial e Operacional não chamam alert, confirm ou prompt nativos',()=>{
  for(const html of [gerencial,operacional])assert.doesNotMatch(html,/(?:\b|window\.)(?:alert|confirm|prompt)\s*\(/);
  assert.match(gerencial,/function avConfirm\(message\)/);
  assert.match(gerencial,/backdrop-filter:blur\(8px\)/);
  const evidence=gerencial.slice(gerencial.indexOf('function abrirFotoConclusaoAcompanhamento('),gerencial.indexOf('function prazoAcompanhamentoTexto('));
  assert.match(evidence,/avImage\(/);assert.doesNotMatch(evidence,/window\.open\(/);
  const operations=gerencial.slice(gerencial.indexOf('async function opAbrirDigitalizadoArquivoUniforme('),gerencial.indexOf('function opBaixarDigitalizadoArquivoUniforme('));
  assert.match(operations,/avImage\(/);assert.doesNotMatch(operations,/window\.open\(/);
});

test('confirmação interna cancela sem executar a ação e aceita apenas após clique',async()=>{
  const code=gerencial.match(/<script id="av-dialog-system-script-v82">([\s\S]*?)<\/script>/)?.[1];
  assert.ok(code);
  const body={children:[],append(node){this.children.push(node)}};
  const createElement=tag=>({tag,children:[],append(...nodes){this.children.push(...nodes)},setAttribute(){},remove(){body.children=body.children.filter(child=>child!==this)},focus(){}});
  const context={document:{body,activeElement:{focus(){}},createElement,addEventListener(){},removeEventListener(){}}};
  vm.runInNewContext(code,context);
  const first=context.avConfirm('Excluir registro?');await Promise.resolve();
  assert.equal(body.children.length,1);
  const actions=body.children[0].children[0].children.at(-1);
  actions.children[0].onclick();assert.equal(await first,false);assert.equal(body.children.length,0);
  const second=context.avConfirm('Excluir registro?');await Promise.resolve();await Promise.resolve();
  body.children[0].children[0].children.at(-1).children.at(-1).onclick();
  assert.equal(await second,true);
});
