'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'..');
const read=name=>fs.readFileSync(path.join(root,name),'utf8');
for(const file of ['index.html','comunicacao/index.html']){
  const source=read(file);
  assert.match(source,/\.insert\(\{id:rowId,dados:local,updated_at:agora\}\)/,`${file}: criação inicial usa insert exclusivo`);
  assert.match(source,/erroCriar\.code==='23505'/,`${file}: conflito inicial volta para reler e mesclar`);
  assert.doesNotMatch(source,/\.upsert\(\{id:rowId,dados:local,updated_at:agora\}/,`${file}: criação concorrente não usa upsert destrutivo`);
}
const comunicacao=read('comunicacao/index.html');
assert.match(comunicacao,/salvarLinhaComConcorrencia\(SHARED_ROW_ID,compartilhadosLocais,baseCompartilhado\)/,'Comunicação grava alterações compartilhadas no Supabase');
console.log('PASS — criação concorrente e sincronização compartilhada estão protegidas.');
