/* AV V64 — Política operacional de cargos. Não substitui RLS/autorização do servidor. */
(function(root,factory){
  const p=factory();
  if(typeof module!=='undefined' && module.exports) module.exports=p;
  if(root) root.AVCargoPolicy=p;
})(typeof globalThis!=='undefined'?globalThis:null,function(){
  'use strict';
  const normalizarCargo = value => String(value||'').trim().toUpperCase();
  const isFiscal = value => normalizarCargo(typeof value==='object'&&value!==null?value.cargo||value.role:value)==='FISCAL';
  const normalizarOperador = value => {
    const digits=String(value||'').replace(/\D/g,'');
    return digits&&Number(digits)>0?String(Number(digits)):'';
  };
  // Código funcional distinto do código numérico existente (login/integração).
  const codigoFiscal = operator => {
    const normalized=normalizarOperador(operator);
    return normalized ? 'FISC-'+normalized.padStart(4,'0') : '';
  };
  const podeOperarCaixa = employee => !isFiscal(employee) && String(employee?.caixaOperacional||employee?.cashStatus||'INATIVO').toUpperCase()==='ATIVO';
  const elegivelMeta = employee => employee && !isFiscal(employee) && !['INATIVO','DESLIGADO','DEMITIDO','AFASTADO'].includes(String(employee.status||'ATIVO').toUpperCase()) && !!normalizarOperador(employee.operador??employee.operator);
  const aplicarRestricoes = employee => {
    if(!employee || typeof employee!=='object') return employee;
    if(isFiscal(employee)){
      employee.caixaOperacional='INATIVO';
      employee.cashStatus='INATIVO';
      employee.codigoFiscal=codigoFiscal(employee.operador??employee.operator);
      employee.inelegivelMeta=true;
    } else {
      delete employee.codigoFiscal;
      delete employee.inelegivelMeta;
    }
    return employee;
  };
  return Object.freeze({normalizarCargo,isFiscal,codigoFiscal,podeOperarCaixa,elegivelMeta,aplicarRestricoes});
});
