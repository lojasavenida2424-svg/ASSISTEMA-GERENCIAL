const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const src = fs.readFileSync(path.join(root,'index.html'),'utf8');
const start=src.indexOf('/* V65 — Configurações em áreas independentes');
const stop=src.indexOf('function abrirPermissoesSelecionadas(){',start);
assert.ok(start>0&&stop>start);
const script=src.slice(start,stop);
function render(asAdmin){
  const el={innerHTML:'',querySelectorAll(){return[]}};
  const context={
    document:{getElementById(id){return id==='configContent'?el:null}},
    requestAnimationFrame(){},
    normalizarOperador(v){return String(v)},
    usuarioAtual:{nome:'OPERADOR TESTE',operador:asAdmin?'133':'201'},
    temPermissao(v){return v==='config'||v==='alterarSenha'||(asAdmin&&v==='backupDados')||v==='painel'},
    MODULOS:[['painel','Painel'],['relatorios','Relatórios']],
    escapeHTML(v){return String(v||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))},
    normalizarConfigGlobal(v){return v},
    usuarioGlobalPorOperador(){return null},
    globalConfig:{usuarios:[{nome:'OPERADOR TESTE',operador:'133'},{nome:'OUTRO',operador:'201'}]},
    db:{funcionarios:[{nome:'OPERADOR TESTE'},{nome:'OUTRO'}]},
    renderSelectNovoUsuarioLogin(){return '<option>200</option>'},
    renderUsuariosLoginRows(){return '<tr><td>OPERADOR TESTE</td></tr>'},
  };
  vm.runInNewContext(script+'\nrenderConfig();',context);
  return el.innerHTML;
}
test('administrador vê navegação com todos os módulos de Configurações',()=>{
 const html=render(true);
 for(const field of ['Visão geral','Usuários','Permissões','Dados e backup','configNovoUsuarioLogin','configUsuarioPermissoes','configAvBuscaUsuarios','baixarBackupCompletoSistema()','baixarBackup()','importarBackup(event)','limparTudo()']){
   assert.ok(html.includes(field),field);
 }
 assert.match(html, /data-config-target="inicio"/);
 assert.match(html, /data-config-section="dados"/);
});
test('colaborador vê apenas as funções autorizadas',()=>{
 const html=render(false);
 assert.ok(html.includes('Minha conta'));
 assert.ok(html.includes('Meus acessos'));
 assert.ok(html.includes('Alterar senha'));
 assert.ok(!html.includes('Limpar dados'));
 assert.ok(!html.includes('Liberar login'));
 assert.ok(!html.includes('Editar permissões'));
});
test('os informativos fiscais foram retirados da interface, mantendo o código',()=>{
 for(const file of ['index.html','comunicacao/index.html','resultados/index.html']){
   const html=fs.readFileSync(path.join(root,file),'utf8');
   assert.ok(!html.includes('Fiscal (sem caixa / metas)'),file);
   assert.ok(!html.includes('Identificação fiscal exclusiva'),file);
 }
 assert.ok(src.includes('id="funcCodigoFiscal"'));
});
