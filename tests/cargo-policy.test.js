const assert = require('node:assert/strict');
const {test} = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const p = require('../shared/cargo-policy.js');
const home = path.resolve(__dirname,'..');

test('identificação funcional para fiscal é única pelo número de operador e não muda o login numérico',()=>{
  assert.equal(p.codigoFiscal('145'),'FISC-0145');
  assert.equal(p.codigoFiscal(146),'FISC-0146');
  assert.equal(p.codigoFiscal('0007'),'FISC-0007');
  assert.equal(p.codigoFiscal(''), '');
  assert.notEqual(p.codigoFiscal('145'),p.codigoFiscal('146'));
});
test('fiscal tem caixa bloqueado ainda que o cadastro antigo esteja ATIVO',()=>{
  const fiscal={operador:'145',cargo:'FISCAL',caixaOperacional:'ATIVO',status:'ATIVO'};
  assert.equal(p.podeOperarCaixa(fiscal),false);
  assert.equal(p.elegivelMeta(fiscal),false);
  p.aplicarRestricoes(fiscal);
  assert.equal(fiscal.caixaOperacional,'INATIVO');
  assert.equal(fiscal.cashStatus,'INATIVO');
  assert.equal(fiscal.codigoFiscal,'FISC-0145');
  assert.equal(fiscal.inelegivelMeta,true);
});
test('fiscal removido do cargo não mantém o bloqueio especial indevidamente',()=>{
  const f={operador:'201',cargo:'FISCAL'};
  p.aplicarRestricoes(f);
  f.cargo='ASSESSOR DE CLIENTE';
  p.aplicarRestricoes(f);
  assert.equal(f.codigoFiscal,undefined);
  assert.equal(f.inelegivelMeta,undefined);
  assert.equal(p.elegivelMeta(f),true);
});
test('free lance e jovem aprendiz preservam acesso conforme seu status e caixa',()=>{
  for (const cargo of ['FREE LANCE','JOVEM APRENDIZ']){
    const f={cargo,operador:'210',status:'ATIVO',caixaOperacional:'ATIVO'};
    assert.equal(p.isFiscal(f),false);
    assert.equal(p.podeOperarCaixa(f),true);
    assert.equal(p.elegivelMeta(f),true);
  }
});
test('funcionários desligados ou afastados não recebem distribuição automática',()=>{
  for(const status of ['INATIVO','DESLIGADO','DEMITIDO','AFASTADO']){
    assert.equal(p.elegivelMeta({operador:'300',cargo:'ASSESSOR',status}),false);
  }
});
test('cadastros fiscais antigos sem código recebem identificador derivado sem exclusão de dados',()=>{
  const f={id:'legado',operador:'444',cargo:'FISCAL',status:'ATIVO',nome:'TESTE',obs:'Histórico intacto',caixaOperacional:'ATIVO'};
  p.aplicarRestricoes(f);
  assert.equal(f.codigoFiscal,'FISC-0444');
  assert.equal(f.obs,'Histórico intacto');
  assert.equal(f.id,'legado');
});
test('Gerencial e Comunicação permitem os novos cargos e forçam o bloqueio no salvamento',()=>{
  for(const file of ['index.html','comunicacao/index.html']){
    const s=fs.readFileSync(path.join(home,file),'utf8');
    for(const cargo of ['FREE LANCE','JOVEM APRENDIZ'])assert.ok(s.includes(`<option>${cargo}</option>`),`${file}: ${cargo}`);
    assert.ok(s.includes("AVCargoPolicy.aplicarRestricoes(item)"),file);
    assert.ok(s.includes("AVCargoPolicy.isFiscal(f)"),file);
    assert.ok(s.includes('funcCodigoFiscal'),file);
  }
});
test('Resultados não distribui metas aos fiscais e não lhes concede abas operacionais',()=>{
  const s=fs.readFileSync(path.join(home,'resultados/index.html'),'utf8');
  assert.ok(s.includes('AVCargoPolicy.elegivelMeta({ ...employee, operador:employee.operator })'));
  assert.ok(s.includes('normalized.rolePermissions.FISCAL = { ...DEFAULT_ROLE_PERMISSIONS.FISCAL }'));
  assert.match(s,/"FISCAL": \{ dashboard:true, calendario:false, funcionarios:false, operadores:false, lancamentos:false, distribuicao:false, game:false, premia:false \}/);
  assert.ok(s.includes('if(AVCargoPolicy.isFiscal(getEmployee(currentUser?.operator)))'));
});
