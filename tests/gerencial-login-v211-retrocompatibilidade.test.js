'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');

assert.match(html,/async function login\(\)/,'Fluxo atual de login encontrado');
assert.match(html,/carregarConfigGlobalOnline\(\{forcar:true\}\)/,'Login sempre recarrega a configuração oficial');
assert.match(html,/if\(!navigator\.onLine \|\| !supabaseclient\)/,'Login não aceita autenticação sem o servidor');
assert.match(html,/if\(pass!==senhaConfigurada\)/,'Senha é validada antes de abrir a sessão');
assert.match(html,/delete usuarioAtual\.senha/,'Senha não permanece no objeto de sessão do navegador');
console.log('PASS — login atual valida credenciais e protege a sessão local.');
