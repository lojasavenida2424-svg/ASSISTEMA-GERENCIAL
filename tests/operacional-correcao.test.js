'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const operational=fs.readFileSync(path.join(__dirname,'../operacional/index.html'),'utf8');
const manager=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
function oneLineFunction(name){
  const re=new RegExp(`function ${name}\\([^\\n]*`);
  const m=operational.match(re);assert.ok(m,`missing ${name}`);return m[0];
}
test('reload restaura somente sessão temporária validada no servidor',()=>{
  const p=operational.slice(operational.indexOf('async function restaurarSessaoOperacional()'),operational.indexOf('function initials('));
  assert.match(p,/operacionalSessionId\(sess\.token\)/);
  assert.match(p,/serverSession\?\.tipo!=='SESSAO_OPERACIONAL'/);
  assert.match(p,/serverSession\.credencialVersao/);
  assert.match(p,/cfg\.operacionalAcessos/);
  assert.match(p,/startApp\(\)/);
  assert.match(p,/sessionStorage\.removeItem\('operacionalSessaoV2'\)/);
});
test('Checklist bloqueado na interface e validado novamente antes da gravação',()=>{
  assert.match(operational,/statusAberto\(t\)\?'':'disabled title=/);
  assert.match(operational,/if\(!atual\|\|!statusAberto\(atual\)\)/);
  assert.match(operational,/if\(!statusEdicaoPermitida\(found\.t,fn\)\)/);
});
test('Tarefa futura não entra no destaque Meu Dia',()=>{
  const fn=oneLineFunction('proximaTarefa');
  assert.match(fn,/String\(d\.dataISO\|\|''\)<=today\(\)/);
});
test('Cronômetro desconta o tempo da fila de aprovação quando a tarefa for retomada',()=>{
  const fn=oneLineFunction('tempoExecucaoMs');
  const ctx={Date,Number,Math};vm.runInNewContext(fn,ctx);
  const start=new Date('2026-10-13T10:00:00Z').getTime();
  const end=new Date('2026-10-13T10:20:00Z').getTime();
  const t={execucao:{inicioEmISO:new Date(start).toISOString(),pausadoEmISO:new Date(end).toISOString(),totalPausadoMs:0}};
  assert.equal(ctx.tempoExecucaoMs(t),20*60*1000);
  assert.match(manager,/const ultimoFim=t\.execucao\.fimEmISO\|\|v\.solicitadoEmISO\|\|agoraISO/);
  assert.match(manager,/AGUARDANDO VALIDAÇÃO → PAUSADA/);
});
test('Gerencial não apaga campos de execução nem evidência ao editar',()=>{
  assert.match(manager,/Campos operacionais pertencem ao funcionário/);
  assert.match(manager,/anteriorExtra\)Object\.entries\(anteriorExtra\)/);
  assert.match(manager,/fotoConclusaoRegistroId/);
});
test('Salvar permissões usa rascunho com colaboradores ocultos preservados',()=>{
  const a=manager.indexOf('window.salvarConfiguracaoAcessoOperacional=async function');
  assert.ok(a>0);const b=manager.slice(a,a+1800);
  assert.match(b,/Object\.assign\(mapa,rascunhoAcessos\|\|\{\}\)/);
  assert.doesNotMatch(b,/mapa\[op\]=false/);
});
