/* Separação de domínio: o banco do RESULTADO não é fonte dos totais da loja. */
(function(root){
  'use strict';
  const STORE_KEYS=['header','pcjSnapshots','snapshotDate','calendarSnapshots','monthlyStoreGoals','monthlyPfGoals','monthlyStorePfGoals','dailyStorePfGoals'];
  function ownSnapshot(database){
    const data=JSON.parse(JSON.stringify(database||{}));
    // A primeira migração conserva os totais antigos num arquivo morto, sem exibi-los.
    if(!data._meta?.managementOwnershipVersion && !data.legacyStoreArchive){
      const archive=Object.fromEntries(STORE_KEYS.filter(k=>data[k]!==undefined).map(k=>[k,data[k]]));
      if(Object.keys(archive).length)data.legacyStoreArchive={archivedAt:new Date().toISOString(),data:archive};
    }
    const operators={...data.operatorSnapshots};
    for(const [date,snapshot] of Object.entries(data.calendarSnapshots||{})){
      if(snapshot.source==='SISTEMA OFICIAL DA LOJA')continue; // antiga carga fixa, preservada no arquivo morto
      const people=Object.fromEntries(Object.entries(snapshot.operators||{}).filter(([key])=>key!=='total'));
      const pf=snapshot.pf?.operators||{};
      if(Object.keys(people).length||Object.keys(pf).length)operators[date]={operators:people,pf:{operators:pf},source:'RESULTADO — REGISTROS INDIVIDUAIS',capturedAt:snapshot.capturedAt||null};
    }
    data.operatorSnapshots=operators;
    const fixedRecords=(data.records||[]).filter(r=>String(r?.source||'').toUpperCase().startsWith('SIGA'));
    if(fixedRecords.length){data.legacyStoreArchive=data.legacyStoreArchive||{archivedAt:new Date().toISOString(),data:{}};data.legacyStoreArchive.fixedRecords=data.legacyStoreArchive.fixedRecords||fixedRecords;}
    data.records=(data.records||[]).filter(r=>!String(r?.source||'').toUpperCase().startsWith('SIGA'));
    STORE_KEYS.forEach(k=>delete data[k]);
    data._meta={...data._meta,managementOwnershipVersion:2};
    return data;
  }
  function neutralHeader(){
    return {vendaAtual:0,vendaAcumulada:0,compromissoDia:0,metaTotal:0,ativadosDia:0,ativadosAcc:0,ativadosMeta:0,ativadosTotal:0,pfRealizado:0,pfMetaMensal:0,storePfRealized:{},pcjDia:null,pcjAcc:null,cartaoAv:null,cartaoAvAcc:null,cartaoAvGap:null,cartaoAvGapAcc:null,pcjGap:null,pcjGapAcc:null,tudoAvDia:null,tudoAvAcc:null,tudoAvGap:null};
  }
  const api={ownSnapshot,neutralHeader};
  if(typeof module==='object'&&module.exports)module.exports=api;
  root.AVResultSource=api;
})(typeof window==='object'?window:globalThis);
