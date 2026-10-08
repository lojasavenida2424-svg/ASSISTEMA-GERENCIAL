/* AV Resultados — sincronização otimista: mantém alterações independentes entre equipamentos. */
(function(root){
  'use strict';
  const clone=v=>v===undefined?undefined:JSON.parse(JSON.stringify(v));
  const equal=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
  const plain=v=>!!v&&typeof v==='object'&&!Array.isArray(v);
  const own=(o,k)=>Object.prototype.hasOwnProperty.call(o||{},k);
  const keyOf=v=>{
    if(!plain(v))return null;
    for(const key of ['id','operator','operador','dataISO','date','data','key']){
      if(v[key]!==undefined&&v[key]!==null&&String(v[key]))return key+':'+String(v[key]);
    }
    return null;
  };
  function merge(base,local,remote){
    if(equal(local,base))return clone(remote);
    if(equal(remote,base)||equal(local,remote))return clone(local);
    if(plain(local)&&plain(remote)){
      const result={};
      const old=plain(base)?base:{};
      for(const k of new Set([...Object.keys(old),...Object.keys(local),...Object.keys(remote)])){
        if(['__proto__','constructor','prototype'].includes(k))continue;
        const b=own(old,k),l=own(local,k),r=own(remote,k);
        if(!l && !r)continue;
        if(!l){
          // Exclusão local prevalece se o registro ainda existia na base.
          if(!b)result[k]=clone(remote[k]);
          continue;
        }
        if(!r){
          // Exclusão remota prevalece se o registro não mudou localmente.
          if(!b||!equal(local[k],old[k]))result[k]=clone(local[k]);
          continue;
        }
        result[k]=merge(b?old[k]:undefined,local[k],remote[k]);
      }
      return result;
    }
    if(Array.isArray(local)&&Array.isArray(remote)){
      const old=Array.isArray(base)?base:[];
      const all=[...old,...local,...remote];
      const keyed=all.length>0&&all.every(item=>keyOf(item)!==null);
      if(keyed){
        const toMap=list=>new Map(list.map(item=>[keyOf(item),item]));
        const b=toMap(old),l=toMap(local),r=toMap(remote);
        const keys=new Set([...r.keys(),...l.keys(),...b.keys()]);
        const output=[];
        for(const k of keys){
          const hasB=b.has(k),hasL=l.has(k),hasR=r.has(k);
          if(!hasL&&!hasR)continue;
          if(!hasL){if(!hasB)output.push(clone(r.get(k)));continue;}
          if(!hasR){if(!hasB||!equal(l.get(k),b.get(k)))output.push(clone(l.get(k)));continue;}
          output.push(merge(b.get(k),l.get(k),r.get(k)));
        }
        return output;
      }
      if(all.every(item=>item===null||['string','number','boolean'].includes(typeof item))){
        const b=new Set(old.map(JSON.stringify)), l=new Set(local.map(JSON.stringify)),r=new Set(remote.map(JSON.stringify));
        const values=new Map(all.map(item=>[JSON.stringify(item),item]));
        return [...new Set([...r,...l])].filter(k=>!b.has(k)||l.has(k)&&r.has(k)).map(k=>clone(values.get(k)));
      }
      // Arrays sem identidade estável: conflito não pode ser mesclado automaticamente.
      // Preserva a alteração local sem criar registros falsos.
      return clone(local);
    }
    return clone(local); // edição simultânea do mesmo escalar: alteração local prevalece
  }
  const api={merge,clone,equal,keyOf};
  if(typeof module==='object'&&module.exports)module.exports=api;
  root.AVResultadoSync=api;
})(typeof window==='object'?window:globalThis);
