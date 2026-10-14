const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.join(__dirname, '..');
const operacional = fs.readFileSync(path.join(root, 'operacional/index.html'), 'utf8');
const gerencial = fs.readFileSync(path.join(root, 'index.html'), 'utf8');

test('perfil usa data de entrada e o tema oferece as oito cores pedidas', () => {
  for (const id of ['profileOperator','profileRole','profileTenure','profileRegistration','profileEntry','profileSector','profileDepartment','profileStatus']) {
    assert.match(operacional, new RegExp(`id="${id}"`));
  }
  for (const color of ['PADRAO','AZUL','ROXO','ROSA','VERMELHO','VERDE','CINZA','LARANJA']) {
    assert.match(operacional, new RegExp(`<option value="${color}"`));
  }
  assert.match(operacional, /<option value="CLARO">Claro<\/option>/);
  assert.match(operacional, /<option value="ESCURO">Escuro<\/option>/);
  assert.match(operacional, /function tenureText\(value\)/);
});

test('Perfil e Configurações usam cartões de largura e fundo coerentes com Home e Tarefas', () => {
  const css=operacional.match(/<style id="operacional-account-cards-v9">([\s\S]*?)<\/style>/)?.[1]||'';
  assert.match(css,/#app \.account-panel\{[^}]*max-width:none[^}]*background:transparent/);
  assert.match(css,/#app \.account-field\{[^}]*background:var\(--surface\)/);
  assert.match(css,/#app \.settings-panel \.settings-row\{[^}]*background:var\(--surface\)/);
  assert.match(css,/#app\.view-settings \.settings-panel\{[^}]*grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
  assert.match(css,/@media\(max-width:650px\)\{[\s\S]*?grid-template-columns:minmax\(0,1fr\)/);
  assert.match(operacional,/class="settings-row settings-login-row"/);
});

test('tema e cor alcançam as superfícies e mudam ao alternar preferências', () => {
  const completeTheme=operacional.match(/<style id="operacional-theme-completo-v4">([\s\S]*?)<\/style>/)?.[1]||'';
  for(const selector of ['.login','.desk-rail','.topbar','.focus-top','.metric','.task','.toolbar','.account-panel','.modal','.completion-card','.photo-drop','.auto-refresh-loader-card']){
    assert.ok(completeTheme.includes(selector),`superfície sem regra de tema: ${selector}`);
  }
  const begin=operacional.indexOf("const UI_PREFS_KEY='operacionalPreferenciasUIV3Operador'");
  const end=operacional.indexOf('function syncNavigation',begin);
  let prefs={period:'TODAS',density:'COMPACTA',theme:'ESCURO',accent:'AZUL'};
  const attrs={dataset:{}},meta={content:''},classes={compact:false,toggle(name,value){if(name==='compact-tasks')this.compact=value}};
  const context={
    localStorage:{getItem:()=>JSON.stringify(prefs)},document:{documentElement:attrs,querySelector:()=>meta},
    $:()=>({classList:classes}),state:{employee:{operador:'144'}},opnorm:v=>String(v||''),toast(){}
  };
  vm.runInNewContext(operacional.slice(begin,end),context);
  context.applyUiPreferences();
  assert.deepEqual(attrs.dataset,{theme:'dark',accent:'azul'});
  assert.equal(meta.content,'#121212');assert.equal(classes.compact,true);
  prefs={period:'HOJE',density:'NORMAL',theme:'CLARO',accent:'ROSA'};
  context.applyUiPreferences();
  assert.deepEqual(attrs.dataset,{theme:'light',accent:'rosa'});
  assert.equal(meta.content,'#F3F5F4');assert.equal(classes.compact,false);
});

test('temporizador acompanha a cor, login tem duas cores e menus usam ícones vetoriais', () => {
  const colors=operacional.match(/<style id="operacional-cores-icones-v6">([\s\S]*?)<\/style>/)?.[1]||'';
  assert.match(colors,/\.focus-clock,\.task \.exec-time,\.modal \.exec-time\s*\{[^}]*color:var\(--accent-label\)/);
  assert.match(colors,/\.live-clock\{color:color-mix\(in srgb,var\(--accent\)/);
  assert.match(colors,/\.login\s*\{[^}]*radial-gradient\([\s\S]*?linear-gradient\(/);
  assert.match(colors,/:root\[data-theme="dark"\] \.login\s*\{[^}]*linear-gradient\(/);
  assert.match(colors,/:root\[data-theme="dark"\]\s*\{[^}]*--accent-label:color-mix/);
  for(const menu of [operacional.match(/<aside class="desk-rail"[\s\S]*?<\/aside>/)?.[0]||'',operacional.match(/<nav class="bottom-nav"[\s\S]*?<\/nav>/)?.[0]||'']){
    assert.equal((menu.match(/<svg class="ui-svg-icon"/g)||[]).length,4);
  }
  assert.match(operacional,/\['Ⅱ','pause'\]/);
});

test('menu lateral mantém base neutra e usa a cor selecionada nos detalhes dos dois temas', () => {
  const css=operacional.match(/<style id="operacional-gerencial-gray-rail-v8">([\s\S]*?)<\/style>/)?.[1]||'';
  for(const [key,color] of [['bg','#121212'],['surface','#1E1E1E'],['surface-soft','#292929']]){
    assert.match(css,new RegExp(`--${key}:${color}`));
  }
  assert.match(css,/\.desk-rail\{[\s\S]*?var\(--accent\) 15%,transparent[\s\S]*?linear-gradient\(180deg,#FCFCFB 0%,#F1F3F2 100%\)/);
  assert.match(css,/:root\[data-theme="dark"\] \.desk-rail\{[\s\S]*?var\(--accent\) 12%,transparent[\s\S]*?linear-gradient\(180deg,#282828 0%,#191919 100%\)/);
  assert.match(css,/\.desk-rail \.tab\.active\{[^}]*box-shadow:inset 4px 0 0 var\(--accent\)/);
  assert.match(css,/:root\[data-theme="dark"\] \.desk-rail \.tab\.active\{[^}]*var\(--accent\) 15%,#292929/);
});

test('foto do operador é validada, salva em registro próprio e reaparece no perfil e cabeçalho', async () => {
  assert.match(operacional,/id="profilePhotoInput"[^>]+accept="image\/jpeg,image\/png,image\/webp"/);
  assert.match(operacional,/<style id="operacional-profile-mobile-v5">[\s\S]*?@media\(max-width:360px\)/);
  const begin=operacional.indexOf("const UI_PREFS_KEY='operacionalPreferenciasUIV3Operador'");
  const end=operacional.indexOf('function syncNavigation',begin);
  const rows=new Map(),changes=[];
  const element=()=>({textContent:'',children:[],classList:{toggle(){return true}},replaceChildren(){this.children=[];this.textContent=''},appendChild(child){this.children.push(child)}});
  const elements={profileAvatar:element(),avatarTop:element(),removeProfilePhotoButton:element(),profilePhotoStatus:element(),profilePhotoInput:element()};
  const dataUrl='data:image/jpeg;base64,YWJj';
  const context={
    state:{employee:{operador:'144',nome:'João Pedro'},mode:'online'},client:{from:()=>({
      select(){return this},eq(k,v){this.id=v;return this},async maybeSingle(){return {data:rows.get(this.id)||null,error:null}},
      upsert(row){rows.set(row.id,row);changes.push(row);return {select(){return {async maybeSingle(){return {data:{id:row.id},error:null}}}}}},
      delete(){return {eq(_key,id){rows.delete(id);return Promise.resolve({error:null})}}}
    })},ONLINE_TABLE:'assistencia_gerencial',REQUEST_TIMEOUT_MS:18000,PHOTO_UPLOAD_TIMEOUT_MS:45000,
    withTimeout:async p=>p,opnorm:v=>String(v||''),initials:()=> 'JP',
    $:id=>elements[id],document:{createElement:()=>({})},navigator:{onLine:true},toast(){},
    carregarImagemArquivo:async()=>({}),comprimirCanvas:()=>({dataUrl}),localStorage:{getItem:()=>null}
  };
  vm.runInNewContext(operacional.slice(begin,end),context);
  await context.handleProfilePhoto({files:[{type:'image/svg+xml',size:100}],value:'x'});
  assert.equal(rows.size,0);
  assert.match(elements.profilePhotoStatus.textContent,/JPG, PNG ou WebP/);
  await context.handleProfilePhoto({files:[{type:'image/jpeg',size:100}],value:'x'});
  assert.equal(changes[0].id,'operacional_foto_144');
  assert.equal(changes[0].dados.fotoDataUrl,dataUrl);
  assert.equal(elements.avatarTop.children[0].src,dataUrl);
  assert.equal(elements.profileAvatar.children[0].src,dataUrl);
  elements.avatarTop.replaceChildren();elements.profileAvatar.replaceChildren();
  await context.loadProfilePhoto();
  assert.equal(elements.profileAvatar.children[0].src,dataUrl);
  await context.removeProfilePhoto();
  assert.equal(rows.size,0);
  assert.equal(elements.avatarTop.textContent,'JP');
});

test('pedidos de senha são autorizados no Gerencial e o usuário escolhe a senha', async () => {
  const begin=operacional.indexOf("const UI_PREFS_KEY='operacionalPreferenciasUIV3Operador'");
  const end=operacional.indexOf('function syncNavigation',begin);
  const rows=new Map();let writes=0,credentialConflictOnce=true,globalWrites=0;
  class Query {
    constructor(){this.filters={};this.op='read'}
    select(){return this}eq(k,v){this.filters[k]=v;return this}is(k,v){this.filters[k]=v;return this}
    like(){return this}limit(){return Promise.resolve({data:[...rows.values()].filter(r=>r.id.startsWith('operacional_senha_')),error:null})}
    insert(row){this.op='insert';this.payload=row;return this}update(row){this.op='update';this.payload=row;return this}
    async maybeSingle(){
      const id=this.filters.id||this.payload?.id,old=rows.get(id);
      if(this.op==='read')return {data:old||null,error:null};
      if(this.op==='insert'){if(old)return {data:null,error:new Error('duplicate')};rows.set(id,this.payload);writes++;return {data:{id},error:null}}
      if(id==='operacional_credencial_144'&&credentialConflictOnce){credentialConflictOnce=false;return {data:null,error:null}}
      if(old&&(!('updated_at' in this.filters)||this.filters.updated_at===old.updated_at)){
        rows.set(id,{...old,...this.payload});writes++;if(id==='config_global_v1')globalWrites++;return {data:{id},error:null};
      }
      return {data:null,error:null};
    }
  }
  rows.set('config_global_v1',{id:'config_global_v1',updated_at:'2026-10-01',dados:{usuarios:[{operador:'144',nome:'KAILANY',senha:'senhaGerencial',credencialVersao:2}],operacionalAcessos:{'144':true}}});
  rows.set('operacional_credencial_144',{id:'operacional_credencial_144',updated_at:'2026-10-01',dados:{tipo:'CREDENCIAL_OPERACIONAL',operador:'144',senha:'senhaOperacional',versao:1}});
  assert.match(operacional,/id="passwordNew"[^>]+minlength="4"/);
  assert.match(operacional,/id="passwordConfirm"[^>]+minlength="4"/);
  assert.doesNotMatch(operacional,/id="passwordCurrent"/);
  const elements={requestPasswordStatus:{textContent:''},requestPasswordButton:{disabled:false,textContent:''},passwordChangeForm:{hidden:true,reset(){this.resetCalled=true}},passwordNew:{value:'nov'},passwordConfirm:{value:'nov'},saveOwnPasswordButton:{disabled:false}};
  const base={client:{from:()=>new Query()},ONLINE_TABLE:'assistencia_gerencial',GLOBAL_ROW_ID:'config_global_v1',REQUEST_TIMEOUT_MS:18000,withTimeout:async p=>p,navigator:{onLine:true},opnorm:v=>String(v||''),normalizarOperador:v=>String(v||''),operacionalCredentialId:op=>'operacional_credencial_'+op,$:id=>elements[id],document:{getElementById:id=>elements[id]||null},console,toast(){}};
  const operator={...base,state:{employee:{operador:'144',nome:'KAILANY',matricula:'AV24-0144'},view:'CONFIGURACOES'},localStorage:{getItem:()=>null,setItem(){}}};
  vm.runInNewContext(operacional.slice(begin,end),operator);
  await operator.requestPasswordChange();
  const request=rows.get('operacional_senha_144');
  assert.equal(request.dados.status,'PENDENTE');
  assert.equal(JSON.stringify(request).includes('novaSenhaSegura'),false);
  await operator.requestPasswordChange();assert.equal(writes,1);
  const beginManager=gerencial.indexOf("const OPERACIONAL_SENHA_REQUEST_PREFIX='operacional_senha_'");
  const endManager=gerencial.indexOf('function abrirAlteracaoSenha',beginManager);
  const manager={...base,db:{diario:[]},usuarioAtual:{operador:'133',nome:'Administrador'},usuarioGlobalPorOperador:op=>op==='144'?{nome:'KAILANY'}:null,supabaseclient:base.client,comTimeout:async p=>p,SUPABASE_OPERATION_TIMEOUT_MS:18000,escapeHTML:v=>String(v||''),alert(){}};
  vm.runInNewContext(gerencial.slice(beginManager,endManager),manager);
  assert.equal(await manager.decidirSolicitacaoSenhaOperacional('144',true),true);
  assert.equal(rows.get('operacional_senha_144').dados.status,'AUTORIZADA');
  assert.equal(rows.get('config_global_v1').dados.usuarios[0].senha,'senhaGerencial');
  await operator.loadPasswordRequestStatus();
  assert.equal(elements.passwordChangeForm.hidden,false);
  await operator.submitOwnPasswordChange({preventDefault(){}});
  assert.equal(rows.get('config_global_v1').dados.usuarios[0].senha,'senhaGerencial');
  assert.match(elements.requestPasswordStatus.textContent,/pelo menos 4 caracteres/);
  elements.passwordNew.value=elements.passwordConfirm.value='nova';
  await operator.submitOwnPasswordChange({preventDefault(){}});
  assert.equal(rows.get('config_global_v1').dados.usuarios[0].senha,'senhaGerencial');
  assert.equal(rows.get('config_global_v1').dados.usuarios[0].credencialVersao,2);
  assert.equal(globalWrites,0);
  assert.equal(rows.get('operacional_credencial_144').dados.senha,'nova');
  assert.equal(rows.get('operacional_credencial_144').dados.versao,2);
  assert.equal(credentialConflictOnce,false);
  assert.equal(rows.get('operacional_senha_144').dados.status,'ATENDIDA');
  assert.equal(JSON.stringify(rows.get('operacional_senha_144')).includes('senha:'),false);
  assert.equal(elements.passwordChangeForm.resetCalled,true);
});

test('Solicitação reúne senha e alteração de entrega com decisão pelo líder', () => {
  const page=gerencial.match(/<section id="acompanhamento" class="page">([\s\S]*?)<style id="acompanhamento-dia-v52-enhancements">/)?.[1]||'';
  for(const id of ['acompTabSolicitacao','acompAreaSolicitacao','acompSolicitacoesSenhaLista','acompSolicitacoesPrazoLista','acompSolicitacoesBadge'])assert.ok(page.includes(`id="${id}"`));
  assert.match(page,/✉ Solicitação/);
  const begin=gerencial.indexOf("const OPERACIONAL_SENHA_REQUEST_PREFIX='operacional_senha_'");
  const end=gerencial.indexOf('function abrirAlteracaoSenha',begin);
  const elements={};for(const id of ['acompanhamento','acompAreaTarefas','acompAreaSolicitacao','acompTabTarefas','acompTabSolicitacao','acompSolicitacoesSenhaLista','acompSolicitacoesPrazoLista','acompSolicitacoesBadge'])elements[id]={hidden:false,innerHTML:'',textContent:'',classList:{toggle(){}},setAttribute(){}};
  const task={id:'t1',descricao:'Entregar vitrine',prazo:'2026-10-15T16:00',responsavel:'KAILANY',criadoPorOperador:'133',reagendamento:{status:'PENDENTE',dataSolicitada:'2026-10-20',solicitadoPor:'KAILANY'}};
  const context={db:{diario:[{id:'d1',responsavel:'KAILANY',tarefas:[task]}]},usuarioAtual:{operador:'133'},normalizarOperador:v=>String(v||''),document:{getElementById:id=>elements[id]||null},escapeHTML:v=>String(v||''),prazoAcompanhamentoTexto:v=>v,dataReagendamentoAcompTexto:v=>v,liderPodeDecidirReagendamento:()=>true,supabaseclient:{from:()=>({select(){return this},like(){return this},limit(){return Promise.resolve({data:[],error:null})}})},comTimeout:async p=>p};
  vm.runInNewContext(gerencial.slice(begin,end),context);
  context.selecionarAreaAcompanhamento('SOLICITACAO');
  assert.equal(elements.acompAreaTarefas.hidden,true);
  assert.match(elements.acompSolicitacoesPrazoLista.innerHTML,/Entregar vitrine/);
  assert.match(elements.acompSolicitacoesPrazoLista.innerHTML,/decidirReagendamentoAcompanhamento/);
  assert.equal(elements.acompSolicitacoesBadge.textContent,'1');
});

test('aprovar ou recusar reagendamento muda o prazo apenas após aprovação', () => {
  const begin=gerencial.indexOf('function dataReagendamentoAcompTexto(');
  const end=gerencial.indexOf('const SISTEMA_OPERACIONAL_URL_OFICIAL',begin);
  const make=()=>({id:'t1',prazo:'2026-10-15T16:00',criadoPorOperador:'133',reagendamento:{status:'PENDENTE',dataSolicitada:'2026-10-20',prazoOriginal:'2026-10-15T16:00'},historico:[]});
  let saves=0;const task=make(),d={id:'d1',tarefas:[task]},context={db:{diario:[d]},usuarioAtual:{operador:'133',nome:'Líder'},normalizarOperador:v=>String(v||''),agoraBR:()=> '14/10/2026',adicionarHistoricoTarefa:(t,evento)=>t.historico.push(evento),saveDB(){saves++},renderDiario(){},renderRelatorio(){},renderSolicitacoesReagendamentoAcompanhamento(){},alert(){}};
  vm.runInNewContext(gerencial.slice(begin,end),context);
  context.decidirReagendamentoAcompanhamento('d1','t1',false);
  assert.equal(task.prazo,'2026-10-15T16:00');assert.equal(task.reagendamento.status,'RECUSADO');
  const second=make();d.tarefas=[second];
  context.decidirReagendamentoAcompanhamento('d1','t1',true);
  assert.equal(second.prazo,'2026-10-20T16:00');assert.equal(second.reagendamento.status,'APROVADO');
  assert.equal(saves,2);
});

test('login do Operacional migra uma vez e depois ignora a senha do Gerencial', async () => {
  const helperStart=operacional.indexOf('function operacionalCredentialId(');
  const helperEnd=operacional.indexOf('const client=window.supabase',helperStart);
  const loginStart=operacional.indexOf("$('loginForm').addEventListener('submit',async e=>{");
  const loginEnd=operacional.indexOf('function demoData()',loginStart);
  const rows=new Map([
    ['gerencial_compartilhados_v1',{dados:{funcionarios:[{operador:'144',nome:'KAILANY',status:'ATIVO'}]},updated_at:'2026-10-13'}],
    ['config_global_v1',{dados:{usuarios:[{operador:'144',senha:'gerencial'}],operacionalAcessos:{'144':true}}}]
  ]);
  class Query {
    select(){return this}eq(_key,id){this.id=id;return this}insert(row){this.payload=row;return this}
    async maybeSingle(){if(this.payload){if(rows.has(this.payload.id))return {data:null,error:{code:'23505'}};rows.set(this.payload.id,this.payload);return {data:{id:this.payload.id},error:null}}return {data:rows.get(this.id)||null,error:null}}
  }
  const fields={loginOperador:{value:'144'},loginSenha:{value:'gerencial'},loginError:{textContent:''}};
  let onSubmit,starts=0;
  const session=new Map();
  const context={client:{from:()=>new Query()},ONLINE_TABLE:'assistencia_gerencial',SHARED_ROW_ID:'gerencial_compartilhados_v1',GLOBAL_ROW_ID:'config_global_v1',REQUEST_TIMEOUT_MS:1000,SESSION_MAX_AGE_MS:12*60*60*1000,withTimeout:async p=>p,opnorm:v=>String(v||''),norm:v=>String(v||'').toUpperCase(),state:{},$:id=>id==='loginForm'?{addEventListener(_type,cb){onSubmit=cb}}:fields[id],loginStatus(){},erroConexao:()=>false,startApp(){starts++},subscribeRealtime(){},iniciarMonitorSincronizacao(){},loadUiPreferencesOnline:async()=>{},sessionStorage:{setItem:(k,v)=>session.set(k,v),removeItem:k=>session.delete(k)},crypto:{randomUUID:()=>`token${rows.size}abcdefghij`}};
  vm.runInNewContext("const OPERACIONAL_CREDENTIAL_PREFIX='operacional_credencial_';const OPERACIONAL_SESSION_PREFIX='operacional_sessao_';const OPERACIONAL_PREFERENCES_PREFIX='operacional_preferencias_';\n"+operacional.slice(helperStart,helperEnd)+'\n'+operacional.slice(loginStart,loginEnd),context);
  await onSubmit({preventDefault(){}});
  assert.equal(starts,1);
  assert.equal(rows.get('operacional_credencial_144').dados.senha,'gerencial');
  assert.ok(session.has('operacionalSessaoV2'));
  rows.get('operacional_credencial_144').dados.senha='opNova';
  fields.loginSenha.value='opNova';
  await onSubmit({preventDefault(){}});
  assert.equal(starts,2);
  fields.loginSenha.value='gerencial';
  await onSubmit({preventDefault(){}});
  assert.equal(starts,2);
  assert.match(fields.loginError.textContent,/Senha do Operacional não reconhecida/);
  assert.equal(rows.get('config_global_v1').dados.usuarios[0].senha,'gerencial');
});
