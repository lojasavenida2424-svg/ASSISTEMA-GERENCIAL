const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const html=fs.readFileSync(path.join(__dirname,'../operacional/index.html'),'utf8');

function makeUi(){
  const elements=new Map();
  const get=id=>{
    if(!elements.has(id)){
      const classes=new Set();
      elements.set(id,{value:'',textContent:'',hidden:false,disabled:false,scrollTop:0,attrs:{},
        classList:{add:v=>classes.add(v),remove:v=>classes.delete(v),contains:v=>classes.has(v)},
        setAttribute(k,v){this.attrs[k]=v},focus(){this.focused=true}});
    }
    return elements.get(id);
  };
  const document={activeElement:{focus(){}},body:{style:{overflow:''}},getElementById:get,addEventListener(){}};
  return {get,document};
}

test('Resolver impedimento abre página própria, cancelar não altera e confirmar registra uma vez',async()=>{
  for(const id of ['resolutionPage','resolutionReason','resolutionNextStatus','resolutionSubmit','resolutionError'])assert.match(html,new RegExp(`id="${id}"`));
  assert.doesNotMatch(html,/\b(?:alert|confirm|prompt)\s*\(/);
  const begin=html.indexOf('let resolutionState=');
  const end=html.indexOf('function syncStatus(',begin);
  const {get,document}=makeUi(),task={descricao:'Organizar vitrine',status:'BLOQUEADA',impedimento:{status:'ATIVO',motivo:'EQUIPAMENTO / SISTEMA',detalhes:'Computador indisponível',statusAnterior:'EM ANDAMENTO'},execucao:{pausadoEmISO:'2026-10-13T21:00:00Z'}};
  let writes=0,history=[],messages=[];
  const context={document,$:get,state:{employee:{nome:'KAILANY'},selected:null},findTask:()=>({t:task}),norm:s=>String(s||'').toUpperCase(),mutateTask:async(_d,_t,fn)=>{fn({},task);writes++},prepararExecucaoInicio:t=>{delete t.execucao.pausadoEmISO},nowBR:()=> '13/10/2026',addHist:(_t,name)=>history.push(name),toast:s=>messages.push(s),openTaskMaybe(){}};
  vm.runInNewContext(html.slice(begin,end),context);
  context.resolveImpediment('d1','t1');
  assert.equal(get('resolutionPage').classList.contains('active'),true);
  assert.equal(get('resolutionReason').textContent,'EQUIPAMENTO / SISTEMA');
  assert.equal(get('resolutionNextStatus').textContent,'Em andamento');
  assert.equal(writes,0);
  context.closeResolutionPage();assert.equal(writes,0);assert.equal(task.status,'BLOQUEADA');
  context.resolveImpediment('d1','t1');await context.submitResolution();
  assert.equal(writes,1);assert.equal(task.status,'EM ANDAMENTO');assert.equal(task.impedimento.status,'RESOLVIDO');
  assert.equal(get('resolutionPage').classList.contains('active'),false);
  assert.deepEqual(history,['IMPEDIMENTO RESOLVIDO']);assert.match(messages[0],/Impedimento resolvido/);
});

test('Adicionar observação usa editor do sistema com validação e aviso próprio',async()=>{
  const begin=html.indexOf('let resolutionState=');const end=html.indexOf('function syncStatus(',begin);
  const {get,document}=makeUi(),task={descricao:'Conferir arara'},history=[];
  const context={document,$:get,state:{employee:{nome:'KAILANY'},selected:null},findTask:()=>({t:task}),mutateTask:async(_d,_t,fn)=>fn({},task),addHist:(_t,name,details)=>history.push([name,details]),toast(){},norm:s=>String(s||''),openTaskMaybe(){}};
  vm.runInNewContext(html.slice(begin,end),context);
  context.openObservationEditor('d1','t1');
  assert.equal(get('operationalDialogBack').classList.contains('active'),true);
  await context.submitOperationalDialog();assert.equal(history.length,0);
  assert.match(get('operationalDialogError').textContent,/Escreva uma observação/);
  get('operationalDialogInput').value='Produto conferido';await context.submitOperationalDialog();
  assert.equal(history[0][0],'OBSERVAÇÃO');assert.match(history[0][1],/Produto conferido/);
  assert.equal(get('operationalDialogBack').classList.contains('active'),false);
  context.showOperationalNotice('Falha de conexão');
  assert.equal(get('operationalDialogMessage').textContent,'Falha de conexão');
  assert.equal(get('operationalDialogInput').hidden,true);
});
