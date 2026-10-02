/* Contrato de leitura do Acompanhamento Gerencial. Sem acesso à rede ou escrita. */
(function(root){
  'use strict';
  const PF = ['bolsa','compra','protecao','sabadao','sms','vida'];
  const number = value => {
    if(typeof value === 'number') return Number.isFinite(value) ? value : 0;
    let text = String(value ?? '').replace(/R\$|\s|%/g,'');
    if(text.includes(',')) text = text.replace(/\./g,'').replace(',','.');
    const n = Number(text);
    return Number.isFinite(n) ? n : 0;
  };
  const count = value => Math.max(0,Math.trunc(number(value)));
  const amount = value => Math.max(0,Math.round(number(value)*100)/100);
  const percentage = value => Math.min(100,Math.max(0,number(value)));
  const has = value => value !== undefined && value !== null && value !== '';
  const dateOf = row => String(row?.data || row?.date || row?.dia || '').slice(0,10);
  const products = value => Object.fromEntries(PF.map(key=>[key,count(value?.[key])]));
  const pfTotal = value => PF.reduce((sum,key)=>sum+count(value?.[key]),0);
  const launched = row => !!row && (Boolean(row.lancadoEm || row.lancadoPor || row.observacao || row.obs) ||
    ['venda','realizado','vendas','ativados','pcj','pf'].some(key=>number(row[key])>0) || pfTotal(row.pfDetalhado)>0);
  function uniqueResults(rows){
    const byDate = new Map();
    for(const row of Array.isArray(rows)?rows:[]){
      const date=dateOf(row);
      if(!/^\d{4}-\d{2}-\d{2}$/.test(date) || !launched(row)) continue;
      const previous=byDate.get(date);
      // Edições novas vencem importações antigas; um dia representa um total da loja.
      if(!previous || !previous.atualizadoEmISO || !row.atualizadoEmISO || row.atualizadoEmISO>=previous.atualizadoEmISO) byDate.set(date,row);
    }
    return byDate;
  }
  function monthGoals(gerencial,month){
    const distribution=gerencial?.distribuicoes?.[month] || {};
    const complement=gerencial?.metasComplementares?.[month] || {};
    const result={venda:0,ativados:0,pf:products(complement.pf),pcj:percentage(complement.pcj)};
    for(const [date,goal] of Object.entries(distribution)){
      if(!date.startsWith(month+'-')) continue;
      result.venda+=amount(goal?.venda); result.ativados+=count(goal?.ativados);
    }
    result.venda=amount(result.venda); result.pfTotal=pfTotal(result.pf);
    return result;
  }
  function split(total,n,decimals=0){
    if(!Number.isInteger(n)||n<1) return [];
    const scale=10**decimals,units=Math.round(Math.max(number(total),0)*scale),base=Math.floor(units/n),extra=units%n;
    return Array.from({length:n},(_,i)=>(base+(i<extra?1:0))/scale);
  }
  function build(gerencial,currentDate){
    const rows=uniqueResults(gerencial?.resultados),snapshots={},goals={};
    const months=new Set([currentDate.slice(0,7),...Object.keys(gerencial?.distribuicoes||{}),...Object.keys(gerencial?.metasComplementares||{}),...[...rows.keys()].map(date=>date.slice(0,7))]);
    for(const month of [...months].filter(m=>/^\d{4}-(0[1-9]|1[0-2])$/.test(m)).sort()){
      const target=monthGoals(gerencial,month); goals[month]=target;
      const [year,m]=month.split('-').map(Number),days=new Date(year,m,0).getDate();
      const pfGoals=Object.fromEntries(PF.map(key=>[key,split(target.pf[key],days)]));
      let sales=0,activated=0,pf=0,pcjAcc=null;
      const productAcc=products({});
      for(let d=1;d<=days;d++){
        const date=month+'-'+String(d).padStart(2,'0'),row=rows.get(date),goal=gerencial?.distribuicoes?.[month]?.[date]||{};
        const detail=products(row?.pfDetalhado),dailyPf=has(row?.pf)?count(row.pf):pfTotal(detail);
        const sale=amount(row?.venda??row?.realizado??row?.vendas),active=count(row?.ativados);
        sales=amount(sales+sale); activated+=active; pf+=dailyPf;
        PF.forEach(key=>productAcc[key]+=detail[key]);
        // Percentuais não são somados nem recebem média simples entre dias.
        if(row && has(row.pcjAcumulado)) pcjAcc=percentage(row.pcjAcumulado);
        const dailyGoals=Object.fromEntries(PF.map(key=>[key,pfGoals[key][d-1]]));
        const total={pfHoje:dailyPf,pfAcc:pf};
        PF.forEach(key=>{total[key+'Hoje']=detail[key];total[key+'Acc']=productAcc[key];});
        snapshots[date]={source:'ACOMPANHAMENTO GERENCIAL',managementSource:'gerencial.acompanhamento',managementResult:!!row,
          store:{vendaAtual:sale,vendaAcumulada:sales,compromissoDia:amount(goal.venda??row?.meta),metaTotal:target.venda,
            ativadosHoje:active,ativadosAcc:activated,ativadosMeta:count(goal.ativados??row?.metaAtivados),ativadosMetaAcc:target.ativados,
            pcj:has(row?.pcj)?percentage(row.pcj):null,pcjAcc,pcjMeta:target.pcj,
            pfHoje:dailyPf,pfAcc:pf,pfMetaHoje:pfTotal(dailyGoals),pfMetaAcc:target.pfTotal},
          pf:{total,goalsHoje:{...dailyGoals,pf:pfTotal(dailyGoals)},goals:{...target.pf,pf:target.pfTotal}}};
      }
    }
    const referenceDate=[...rows.keys()].filter(date=>date<=currentDate).sort().pop()||currentDate;
    return {snapshots,goals,referenceDate,hasResults:rows.size>0};
  }
  const api={PF,number,count,amount,percentage,products,pfTotal,launched,uniqueResults,monthGoals,split,build};
  if(typeof module==='object' && module.exports) module.exports=api;
  root.AVManagement=api;
})(typeof window==='object'?window:globalThis);
