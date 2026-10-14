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

test('tema do Operacional é gravado online e reaplicado em outro dispositivo',async()=>{
  const begin=operacional.indexOf("const UI_PREFS_KEY='operacionalPreferenciasUIV3Operador'");
  const end=operacional.indexOf('function passwordRequestId',begin);
  const rows=new Map(),cache=new Map();
  class Query{
    constructor(){this.id='';this.row=null}
    select(){return this}eq(_field,id){this.id=id;return this}
    upsert(row){this.row=row;return this}
    async maybeSingle(){if(this.row){rows.set(this.row.id,this.row);return {data:{id:this.row.id},error:null}}return {data:rows.get(this.id)||null,error:null}}
  }
  const elements={app:{classList:{toggle(){}}},settingsDefaultPeriod:{value:'TODAS'},settingsDensity:{value:'COMPACTA'},settingsTheme:{value:'ESCURO'},settingsAccent:{value:'ROXO'}};
  const rootElement={dataset:{}},context={state:{employee:{operador:'133'},mode:'online'},opnorm:v=>String(v||''),operacionalPreferencesId:op=>'operacional_preferencias_'+op,client:{from:()=>new Query()},ONLINE_TABLE:'assistencia_gerencial',REQUEST_TIMEOUT_MS:1000,withTimeout:async p=>p,navigator:{onLine:true},localStorage:{getItem:k=>cache.get(k)||null,setItem:(k,v)=>cache.set(k,v)},document:{documentElement:rootElement,querySelector:()=>({content:''})},$:id=>elements[id],toast(){},console};
  vm.runInNewContext(operacional.slice(begin,end),context);
  await context.saveUiPreferences();
  assert.equal(rows.get('operacional_preferencias_133').dados.theme,'ESCURO');
  assert.equal(rows.get('operacional_preferencias_133').dados.accent,'ROXO');
  cache.clear();rootElement.dataset={};
  await context.loadUiPreferencesOnline('133');context.applyUiPreferences();
  assert.equal(rootElement.dataset.theme,'dark');assert.equal(rootElement.dataset.accent,'roxo');
});

test('Home separa os blocos e recarrega a cada cinco minutos preservando a sessão',()=>{
  assert.match(operacional,/#app\.view-home \.hero\.overview-only\{margin-bottom:20px\}/);
  assert.match(operacional,/const AUTO_REFRESH_TEST_MS=5\*60\*1000/);
  const reload=operacional.slice(operacional.indexOf('async function executarAutoAtualizacaoOperacional()'),operacional.indexOf('function iniciarAutoAtualizacaoOperacional'));
  assert.match(reload,/salvarEstadoOperacionalAntesReload\(\)/);
  assert.match(reload,/sessionStorage\.setItem\(AUTO_REFRESH_PENDING_KEY,'1'\)/);
  assert.match(reload,/location\.reload\(\)/);
  const restore=operacional.slice(operacional.indexOf('async function restaurarSessaoOperacional()'),operacional.indexOf('function initials('));
  assert.match(restore,/serverSession\?\.tipo!=='SESSAO_OPERACIONAL'/);
  assert.match(restore,/loadUiPreferencesOnline\(op\)/);
  assert.match(restore,/startApp\(\)/);
});
