'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const source=fs.readFileSync(path.join(__dirname,'../estoque/index.html'),'utf8');
const start=source.indexOf('  function stockConflictError(){');
const end=source.indexOf('  const sameStockState=',start);
assert.ok(start>=0&&end>start,'Supabase write helpers are present');
const helpers=source.slice(start,end);
function mockClient(response){
  const calls=[];
  const query={
    update(value){calls.push(['update',value]);return this},
    insert(value){calls.push(['insert',value]);return this},
    eq(...args){calls.push(['eq',...args]);return this},
    is(...args){calls.push(['is',...args]);return this},
    select(...args){calls.push(['select',...args]);return this},
    async maybeSingle(){return response},
  };
  return {calls,client:{from(name){calls.push(['from',name]);return query}}};
}
async function run(){
  const snapshot={version:1,stores:[],products:[],ledger:[],transfers:[],losses:[],inventories:[],receipts:[]};
  const row={dados:snapshot,updated_at:'2026-10-22T00:00:00.000Z'};
  {
    const mock=mockClient({data:row,error:null});
    const context={stockClient:mock.client,ONLINE_TABLE:'assistencia_gerencial',CLOUD_ROW_ID:'estoque_av_compartilhado_v1',iso:()=> '2026-10-22T00:00:01.000Z',cloudValidate:()=>{}};
    vm.runInNewContext(`${helpers}; globalThis.write=cloudWriteSnapshot;`,context);
    const saved=await context.write(snapshot,'2026-10-22T00:00:00.000Z',true);
    assert.equal(saved.updated_at,row.updated_at);
    assert.ok(mock.calls.some(c=>c[0]==='update'));
    assert.ok(mock.calls.some(c=>c[0]==='eq'&&c[1]==='updated_at'&&c[2]===row.updated_at),'Existing rows require the expected update timestamp');
  }
  {
    const mock=mockClient({data:row,error:null});
    const context={stockClient:mock.client,ONLINE_TABLE:'assistencia_gerencial',CLOUD_ROW_ID:'estoque_av_compartilhado_v1',iso:()=> '2026-10-22T00:00:01.000Z',cloudValidate:()=>{}};
    vm.runInNewContext(`${helpers}; globalThis.write=cloudWriteSnapshot;`,context);
    await context.write(snapshot,null,false);
    assert.ok(mock.calls.some(c=>c[0]==='insert'),'A missing row is created without replacing unrelated data');
  }
  {
    const mock=mockClient({data:null,error:{code:'23505',status:409,message:'duplicate key'}});
    const context={stockClient:mock.client,ONLINE_TABLE:'assistencia_gerencial',CLOUD_ROW_ID:'estoque_av_compartilhado_v1',iso:()=> '2026-10-22T00:00:01.000Z',cloudValidate:()=>{}};
    vm.runInNewContext(`${helpers}; globalThis.write=cloudWriteSnapshot;`,context);
    await assert.rejects(context.write(snapshot,null,false),/CONFLITO_DE_VERSAO/,'Concurrent first insert is reported as a conflict');
  }
  console.log('PASS — gravação Supabase usa compare-and-set e protege a primeira criação concorrente');
}
run().catch(error=>{console.error(error);process.exitCode=1});
