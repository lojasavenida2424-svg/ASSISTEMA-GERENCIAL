'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
const start=html.indexOf("let gerencialConfigUpdatedAt='';");
const end=html.indexOf('async function chamarGerencialAutenticacaoSegura(action,extra={}){',start);
assert.ok(start>0&&end>start,'Bloco de compatibilidade do login encontrado');
const funcs=html.slice(start,end);
const cfg={usuarios:[{operador:'133',senha:'senha-teste-longa',nome:'Admin'}],permissoes:{'133':{config:true}}};
const test=async({edge,sql})=>{
 const context={
  SUPABASE_OPERATION_TIMEOUT_MS:6000,
  ONLINE_TABLE:'assistencia_gerencial',GLOBAL_ROW_ID:'config_global_v1',
  comTimeout:async p=>await p,
  chamarGerencialAutenticacaoSegura:async()=>edge(),
  supabaseclient:{from:t=>{assert.equal(t,'assistencia_gerencial');return {select:cols=>{assert.equal(cols,'dados,updated_at');return {eq:(col,id)=>{assert.equal(col,'id');assert.equal(id,'config_global_v1');return {maybeSingle:async()=>sql()}}}}}}},
  console,
 };
 vm.createContext(context);
 vm.runInContext(funcs+'\nthis.runCompat=obterConfigGerencialCompat;this.getModo=()=>gerencialModoAutenticacao;',context);
 const result=await context.runCompat();
 return {result,modo:context.getModo()};
};
(async()=>{
 let legacyReads=0;
 const legacy=await test({edge:()=>{throw Error('ACAO_DESCONHECIDA')},sql:()=>{legacyReads++;return {data:{dados:cfg,updated_at:'2026-10-21'}}}});
 assert.equal(legacy.modo,'legado');assert.equal(legacy.result.usuarios[0].operador,'133');assert.equal(legacyReads,1);
 const safe=await test({edge:()=>({config:{usuarios:[{operador:'133',senha:'__CREDENCIAL_PROTEGIDA__'}]}}),sql:()=>{throw Error('NAO DEVERIA CONSULTAR DIRETAMENTE')}});
 assert.equal(safe.modo,'seguro');assert.equal(safe.result.usuarios[0].senha,'__CREDENCIAL_PROTEGIDA__');
 let triedLegacy=false;
 await assert.rejects(test({edge:()=>{throw Error('SERVICO_NAO_CONFIGURADO')},sql:()=>{triedLegacy=true;return {data:{dados:cfg}}}}),/autenticação segura.*indisponível/i);
 assert.equal(triedLegacy,false,'Em falha da API nova não fazer downgrade inseguro');
 await assert.rejects(test({edge:()=>{throw Error('HTTP 404')},sql:()=>({data:null,error:{message:'permission denied'}})}),/Atualização do Supabase pendente/i);
 await assert.rejects(test({edge:()=>{throw Error('ACAO_DESCONHECIDA')},sql:()=>({data:null,error:null})}),/Cadastro global de usuários não disponível/i);
 assert.match(html,/gerencialModoAutenticacao==='legado'/);
 assert.match(html,/senhaConfigurada==='__CREDENCIAL_PROTEGIDA__'/);
 assert.match(html,/Operador não cadastrado na configuração oficial deste Supabase/);
 console.log('PASS — 5 cenários: Edge V2.0, Edge V2.1, erro da Edge, RLS restritiva, cadastro não encontrado.');
})().catch(e=>{console.error(e);process.exitCode=1});
