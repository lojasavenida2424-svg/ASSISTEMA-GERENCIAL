/* AV V66 — central de permissões. AUI do Gerencial; autorização sensível exige RLS no servidor. */
const AVP66_ACTIONS=[['ver','Visualizar'],['criar','Criar'],['editar','Editar'],['imprimir','Imprimir'],['excluir','Excluir']];
const AVP66_MODULE_ACTIONS=[['ver','Ver'],['criar','Criar'],['editar','Editar'],['excluir','Excluir'],['imprimir','Imprimir'],['exportar','Exportar']];
const AVP66_TABS=[['modulos','Módulos'],['acoes','Ações'],['configuracoes','Configurações'],['documentos','Documentos'],['sistemas','Sistemas AV'],['restricoes','Restrições']];
let avp66Operator='',avp66Tab='modulos',avp66Draft=null,avp66Dirty=false,avp66Text='',avp66Cargo='TODOS',avp66DocText='';

// V70: o acesso a Configurações é dividido em seções independentes.
// Retrocompatibilidade: contas antigas preservam Minha conta / Meus acessos e backup anteriormente concedido.
const AVP70_CONFIG_SECTIONS=[
  ['inicio','Visão geral / Minha conta','Dados básicos do operador e opções pessoais.'],
  ['usuarios','Usuários','Consulta da relação de contas. Somente o administrador 133 gerencia logins e senhas.'],
  ['permissoes','Permissões / Meus acessos','Consulta das próprias permissões. Somente o administrador 133 altera acessos.'],
  ['dados','Dados e backup','Visualização da área de dados. Fazer backup exige a permissão adicional Backup completo.']
];
function avp70PodeSecaoNoPerfil(p,secao,op){
  const id=normalizarOperador(op);
  if(!AVP70_CONFIG_SECTIONS.some(([k])=>k===secao))return false;
  if(id==='133')return true;
  if(!p?.config)return false;
  const marcado=p?.acessosDetalhados?.secoesConfig?.[secao];
  if(typeof marcado==='boolean')return marcado;
  if(secao==='inicio'||secao==='permissoes')return true;
  return secao==='dados'?!!p.backupDados:false;
}
function podeSecaoConfigAV(secao,op=usuarioAtual?.operador){
  const id=normalizarOperador(op);
  if(!id)return false;
  return avp70PodeSecaoNoPerfil(permissoesUsuario(id),secao,id);
}


function avp66Esc(s){return escapeHTML(String(s??''));}
function avp66CargoUsuario(op){
  const u=(globalConfig?.usuarios||[]).find(x=>normalizarOperador(x.operador)===normalizarOperador(op));
  const f=(db?.funcionarios||[]).find(x=>normalizarOperador(x.operador)===normalizarOperador(op));
  return String(f?.cargo||u?.cargo||'ASSESSOR').trim();
}
function avp66EhFiscal(op){return /FISCAL/i.test(avp66CargoUsuario(op));}
function avp66PerfilCargo(cargo){
  const c=String(cargo||'').toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
  if(/FISCAL/.test(c))return 'fiscal';
  if(/JOVEM\s*APRENDIZ/.test(c))return 'aprendiz';
  if(/FREE\s*LANCE|FREELANCE/.test(c))return 'freelance';
  if(/GERENTE|SUPERVISOR|DESENVOLVEDOR/.test(c))return 'gerencia';
  if(/\bVM\b|VISUAL|MERCHANDISING/.test(c))return 'vm';
  return 'assessor';
}
function avp66PapelNome(c){return {gerencia:'Gerência',vm:'Visual Merchandising',fiscal:'Fiscal',aprendiz:'Jovem Aprendiz',freelance:'Free Lance',assessor:'Assessor'}[c]||'Personalizado';}
function avp66PermOrigem(op){
  const id=normalizarOperador(op);
  return typeof permissoesUsuario==='function'?permissoesUsuario(id):permissoesPadrao(id);
}
function avp66Extrair(draft,area,id,acao,pai){
  const especifico=draft?.acessosDetalhados?.[area]?.[id]?.[acao];
  if(typeof especifico==='boolean') return especifico;
  return pai;
}
function podeAcaoModuloAV(modulo,acao='ver',op=usuarioAtual?.operador){
  const id=normalizarOperador(op);
  if(!id)return false;
  if(id==='133')return true;
  const p=avp66PermOrigem(id);
  if(!p?.[modulo])return false;
  const restricoes=p?.acessosDetalhados?.restricoes||{};
  if(restricoes.somenteLeitura&&['criar','editar','excluir'].includes(acao))return false;
  if(restricoes.semExportacao&&acao==='exportar')return false;
  return !!avp66Extrair(p,'acoes',modulo,acao,true);
}
function podeDocumentoAV(docId,acao='ver',op=usuarioAtual?.operador){
  const id=normalizarOperador(op);
  if(!id)return false;
  if(id==='133')return true;
  if(!docId || !podeAcaoModuloAV('operacoes',acao==='ver'?'ver':acao,id))return false;
  const p=avp66PermOrigem(id);
  const tipo=p?.acessosDetalhados?.documentos?.[docId];
  const visivel=typeof tipo?.ver==='boolean'?tipo.ver:true;
  if(!visivel)return false;
  return acao==='ver'?true:(typeof tipo?.[acao]==='boolean'?tipo[acao]:true);
}
function exigirPermissaoDocumentoAV(docId,acao='ver'){
  if(podeDocumentoAV(docId,acao)) return true;
  alert('Acesso não autorizado: este documento ou ação não está liberado para seu operador.');
  return false;
}
function avp66NormalizarRascunho(op){
  const p=JSON.parse(JSON.stringify(avp66PermOrigem(op)));
  if(!p.acessosDetalhados || typeof p.acessosDetalhados!=='object')p.acessosDetalhados={};
  const d=p.acessosDetalhados;
  d.versao=2;
  d.perfilBase=d.perfilBase||'personalizado';
  d.acoes=d.acoes&&typeof d.acoes==='object'?d.acoes:{};
  d.documentos=d.documentos&&typeof d.documentos==='object'?d.documentos:{};
  d.secoesConfig=d.secoesConfig&&typeof d.secoesConfig==='object'?d.secoesConfig:{};
  d.restricoes=d.restricoes&&typeof d.restricoes==='object'?d.restricoes:{};
  return p;
}
function avp66ListaUsuarios(){
  return (globalConfig?.usuarios||[]).map(u=>({op:normalizarOperador(u.operador),
    nome:String(usuarioGlobalPorOperador(u.operador)?.nome||u.nome||'OPERADOR'),cargo:avp66CargoUsuario(u.operador)}))
    .sort((a,b)=>a.nome.localeCompare(b.nome,'pt-BR'));
}
function avp66Catalogo(){return Array.isArray(window.avCatalogoDocumentosV66)?window.avCatalogoDocumentosV66:[];}
function avp66Stats(p){
  const mod=MODULOS.filter(([id])=>p[id]).length;
  const d=avp66Catalogo().flatMap(cat=>cat.documentos);
  const liberados=d.filter(t=>avp66Extrair(p,'documentos',t.id,'ver',!!p.operacoes)).length;
  const links=SISTEMA_AV_LINKS.filter(([id])=>p.sistemaAvLinks?.[id]&&p.sistemaav).length;
  return {mod,docs:liberados,links,total:d.length};
}
function renderCentralPermissoesAV(){
  const users=avp66ListaUsuarios();
  if(!users.some(x=>x.op===avp66Operator)){avp66Operator=users[0]?.op||'';avp66Draft=null;avp66Dirty=false;}
  return `<section class="avp66" aria-label="Central de permissões">
    <div class="avp66-intro"><div><span class="avp66-overline">ADMINISTRAÇÃO / CONTROLE DE ACESSO</span><h2>Permissões e acessos</h2><p>Defina quais áreas, operações e documentos cada colaborador pode utilizar.</p></div><span class="avp66-security">◈ Gestão por operador</span></div>
    <div class="avp66-topstats"><div><small>CONTAS</small><b>${users.length}</b><span>Operadores cadastrados</span></div><div><small>DOCUMENTOS</small><b>${avp66Catalogo().reduce((n,c)=>n+c.documentos.length,0)}</b><span>Modelos da biblioteca</span></div><div><small>PERFIS</small><b>6</b><span>Perfis de referência</span></div></div>
    <div class="avp66-columns"><aside class="avp66-people" aria-label="Operadores"><button type="button" class="avp67-return" onclick="selecionarSecaoConfigAV('inicio')" aria-label="Voltar ao menu de configurações">‹ <span>Áreas de Configurações</span></button><div class="avp66-people-head"><h3>Operadores</h3><span>${users.length}</span></div>
      <label class="avp66-search"><span>⌕</span><input id="avp66Search" type="search" placeholder="Buscar nome ou operador" value="${avp66Esc(avp66Text)}" oninput="avp66Filtrar(this.value)" autocomplete="off"></label>
      <select aria-label="Filtrar por cargo" id="avp66RoleFilter" onchange="avp66FiltrarCargo(this.value)"><option value="TODOS">Todos os cargos</option>${[...new Set(users.map(u=>u.cargo))].sort().map(c=>`<option value="${avp66Esc(c)}" ${c===avp66Cargo?'selected':''}>${avp66Esc(c)}</option>`).join('')}</select>
      <div class="avp66-user-list" id="avp66UserList"></div><div class="avp66-people-foot">O operador 133 possui acesso integral protegido.</div></aside>
      <div class="avp66-workspace" id="avp66Workspace"></div></div>
    </section>`;
}
function avp66Filtrar(texto){avp66Text=texto;avp66RenderLista();}
function avp66FiltrarCargo(cargo){avp66Cargo=cargo;avp66RenderLista();}
function avp66RenderLista(){
  const box=document.getElementById('avp66UserList');if(!box)return;
  const clean=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
  const lista=avp66ListaUsuarios().filter(u=>(avp66Cargo==='TODOS'||u.cargo===avp66Cargo)&&clean(u.nome+' '+u.op+' '+u.cargo).includes(clean(avp66Text)));
  box.innerHTML=lista.length?lista.map(u=>{const isDev=u.op==='133',sel=avp66Operator===u.op;
    return `<button type="button" class="avp66-user ${sel?'selected':''}" aria-pressed="${sel}" onclick="selecionarOperadorPermissoesAV('${avp66Esc(u.op)}')"><span class="avp66-avatar">${avp66Esc(u.nome[0]||'A')}</span><span class="avp66-userinfo"><b>${avp66Esc(u.nome)}</b><small>OP. ${avp66Esc(u.op)} · ${avp66Esc(u.cargo)}</small></span><span class="avp66-userchev">${isDev?'◆':'›'}</span></button>`;
  }).join(''):'<p class="avp66-empty">Nenhum operador encontrado.</p>';
}
function selecionarOperadorPermissoesAV(op){
  const id=normalizarOperador(op);
  if(!avp66ListaUsuarios().some(u=>u.op===id))return;
  if(avp66Dirty && id!==avp66Operator&&!confirm('Existem alterações não salvas. Descartar e trocar de operador?'))return;
  avp66Operator=id;avp66Draft=avp66NormalizarRascunho(id);avp66Dirty=false;
  avp66RenderLista();avp66RenderWorkspace();
}
function avp66SelecionarAba(tab){if(!AVP66_TABS.some(x=>x[0]===tab))return;avp66Tab=tab;avp66RenderWorkspace();}
function avp66Alterar(categoria,chave,acao,checked){
  if(avp66Operator==='133'||!avp66Draft)return;
  const p=avp66Draft;
  if(categoria==='modulos')p[chave]=checked;
  else if(categoria==='sistemas'){
    p.sistemaAvLinks=p.sistemaAvLinks||{};
    p.sistemaAvLinks[chave]=checked;
  }else if(categoria==='recursos')p[chave]=checked;
  else if(categoria==='restricoes'){
    p.acessosDetalhados.restricoes[chave]=checked;
  }else if(categoria==='secoesConfig'){
    p.acessosDetalhados.secoesConfig[chave]=checked;
  }else if(['acoes','documentos'].includes(categoria)){
    const area=p.acessosDetalhados[categoria];
    const entry=area[chave]||{};
    entry[acao]=checked;
    if(!checked&&acao==='ver'){
      const cols=categoria==='documentos'?AVP66_ACTIONS:AVP66_MODULE_ACTIONS;
      cols.forEach(([a])=>entry[a]=false);
    }else if(checked&&acao!=='ver') entry.ver=true;
    area[chave]=entry;
  }
  if(avp66EhFiscal(avp66Operator)){
    p.acessosDetalhados.restricoes.semCaixa=true;
    p.acessosDetalhados.restricoes.semMetaIndividual=true;
  }
  avp66Dirty=true;avp66RenderWorkspace();
}
function avp66Check(cat,chave,acao,label,checked,disabled=false){
  return `<label class="avp66-check" title="${avp66Esc(label)}"><input type="checkbox" aria-label="${avp66Esc(label)}" ${checked?'checked':''} ${disabled?'disabled':''} onchange="avp66Alterar('${cat}','${avp66Esc(chave)}','${acao}',this.checked)"><span class="avp66-check-ui" aria-hidden="true"></span></label>`;
}
function avp66Modulos(dev){
  return `<div class="avp66-paneltitle"><h3>Acesso aos módulos</h3><p>Defina quais áreas aparecem no menu deste operador. Desligar um módulo também bloqueia suas ações e documentos vinculados.</p></div>
    <div class="avp66-module-grid">${MODULOS.map(([id,nome])=>`<label class="avp66-module"><span class="avp66-module-icon">${({painel:'▣',operacoes:'▤',colaboradores:'♙',config:'⚙',escalas:'▦',relatorios:'◫',sistemaav:'↗'})[id]||'◇'}</span><span><b>${avp66Esc(nome)}</b><small>${avp66Draft[id]?'Acesso liberado':'Acesso bloqueado'}</small></span><input type="checkbox" role="switch" ${avp66Draft[id]?'checked':''} ${dev||id==='painel'?'disabled':''} onchange="avp66Alterar('modulos','${id}','ver',this.checked)"></label>`).join('')}</div>`;
}
function avp66Acoes(dev){
  const a=AVP66_MODULE_ACTIONS;
  return `<div class="avp66-paneltitle"><h3>Permissões por ação</h3><p>Controle o que o operador pode fazer dentro de cada área. A permissão de visualizar é obrigatória para as demais.</p></div>
    <div class="avp66-tablewrap"><table class="avp66-matrix"><thead><tr><th>ÁREA</th>${a.map(([,label])=>`<th>${label}</th>`).join('')}</tr></thead><tbody>${MODULOS.filter(([id])=>!['painel','sophia'].includes(id)).map(([id,nome])=>`<tr class="${avp66Draft[id]?'':'avp66-rowoff'}"><td><b>${avp66Esc(nome)}</b></td>${a.map(([acao,rot])=>`<td>${avp66Check('acoes',id,acao,`${rot} em ${nome}`,avp66Draft[id]&&avp66Extrair(avp66Draft,'acoes',id,acao,true),dev||!avp66Draft[id])}</td>`).join('')}</tr>`).join('')}</tbody></table></div>
    <div class="avp66-note">Esses controles integram a matriz de permissões. Operações que ainda não possuem validação individual no código necessitam integração específica antes de serem consideradas bloqueadas.</div>`;
}
function avp66Documentos(dev){
  const catalogo=avp66Catalogo();const campos=AVP66_ACTIONS;
  return `<div class="avp66-paneltitle"><h3>Permissões de documentos</h3><p>Defina os modelos que podem ser vistos e quais ações são liberadas para cada um na biblioteca de Operações.</p></div>
    <label class="avp66-search avp66-doc-search"><span>⌕</span><input value="${avp66Esc(avp66DocText)}" type="search" placeholder="Pesquisar documento" oninput="avp66PesquisarDoc(this.value)"></label>
    ${!avp66Draft.operacoes?'<div class="avp66-note">Para disponibilizar documentos, habilite primeiro o módulo Operações.</div>':''}
    <div class="avp66-docgroups">${catalogo.map(grupo=>{
      const docs=grupo.documentos.filter(d=>String(d.nome).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').includes(String(avp66DocText).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'')));
      if(!docs.length)return '';
      return `<details class="avp66-docgroup" open><summary><span>${avp66Esc(grupo.nome)}</span><small>${docs.length} modelos</small></summary><div class="avp66-tablewrap"><table class="avp66-matrix"><thead><tr><th>DOCUMENTO</th>${campos.map(([,label])=>`<th>${label}</th>`).join('')}</tr></thead><tbody>${docs.map(doc=>`<tr><td><b>${avp66Esc(doc.nome)}</b>${!doc.editavel?'<small>Modelo fixo</small>':''}</td>${campos.map(([acao,rot])=>{
        const autorizado=avp66Draft.operacoes && avp66Extrair(avp66Draft,'documentos',doc.id,'ver',true) && avp66Extrair(avp66Draft,'documentos',doc.id,acao,true);
        return `<td>${avp66Check('documentos',doc.id,acao,`${rot}: ${doc.nome}`,autorizado,dev||!avp66Draft.operacoes||(acao==='editar'&&!doc.editavel))}</td>`;
      }).join('')}</tr>`).join('')}</tbody></table></div></details>`;
    }).join('')||'<p class="avp66-empty">Nenhum documento corresponde à pesquisa.</p>'}</div>
    <p class="avp66-note">A restrição é aplicada aos modelos e aos arquivos salvos desses modelos dentro do Gerencial. Documentos armazenados no servidor também precisam de controle no backend para impedir acesso por requisições diretas.</p>`;
}
function avp66PesquisarDoc(texto){
  avp66DocText=texto;
  const clean=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
  document.querySelectorAll('.avp66-docgroup').forEach(grupo=>{
    let visiveis=0;
    grupo.querySelectorAll('tbody tr').forEach(tr=>{const ok=clean(tr.querySelector('td')?.textContent).includes(clean(texto));tr.hidden=!ok;if(ok)visiveis++;});
    grupo.hidden=visiveis===0;
  });
}
function avp70Configuracoes(dev){
  const p=avp66Draft;
  const temAcesso=!!p.config;
  const quantidade=AVP70_CONFIG_SECTIONS.filter(([id])=>avp70PodeSecaoNoPerfil(p,id,avp66Operator)).length;
  return `<div class="avp66-paneltitle"><h3>Seções de Configurações</h3><p>Escolha quais áreas internas o operador poderá enxergar. O módulo Configurações precisa estar habilitado na aba Módulos.</p></div>
    <div class="avp70-summary"><span><b>${quantidade}</b> de 4 seções visíveis</span><span class="avp70-state ${temAcesso?'is-on':'is-off'}">${temAcesso?'Módulo Configurações habilitado':'Módulo Configurações bloqueado'}</span></div>
    ${!temAcesso?'<p class="avp66-note">Ative primeiro <b>Configurações</b> na aba Módulos para liberar estas opções.</p>':''}
    <div class="avp70-section-grid">${AVP70_CONFIG_SECTIONS.map(([id,nome,desc])=>{
      const checked=avp70PodeSecaoNoPerfil(p,id,avp66Operator);
      return `<label class="avp70-section"><span class="avp70-section-icon" aria-hidden="true">${({inicio:'⌂',usuarios:'♙',permissoes:'▤',dados:'▣'})[id]}</span><span class="avp70-section-description"><b>${avp66Esc(nome)}</b><small>${avp66Esc(desc)}</small><em>${!temAcesso?'Acesso indisponível':checked?'Visível':'Oculta'}</em></span><input type="checkbox" role="switch" aria-label="Permitir visualizar ${avp66Esc(nome)}" ${checked?'checked':''} ${dev||!temAcesso?'disabled':''} onchange="avp66Alterar('secoesConfig','${id}','ver',this.checked)"></label>`;
    }).join('')}</div>
    <div class="avp66-note">O acesso à lista de usuários é apenas de consulta. Visualizar “Dados e backup” não concede autorização para exportar, importar ou limpar informações. A administração das contas e permissões permanece exclusiva do operador 133.</div>`;
}
function avp66Sistemas(dev){
  return `<div class="avp66-paneltitle"><h3>Atalhos do Sistema AV</h3><p>Selecione os sistemas externos visíveis para este operador. O módulo Sistema AV também precisa estar liberado.</p></div><div class="avp66-module-grid">${SISTEMA_AV_LINKS.map(([id,nome])=>`<label class="avp66-module"><span class="avp66-module-icon">↗</span><span><b>${avp66Esc(nome)}</b><small>Atalho externo</small></span><input type="checkbox" role="switch" ${avp66Draft.sistemaAvLinks?.[id]?'checked':''} ${dev||!avp66Draft.sistemaav?'disabled':''} onchange="avp66Alterar('sistemas','${id}','ver',this.checked)"></label>`).join('')}</div>`;
}
function avp66Restricoes(dev){
  const cargoFiscal=avp66EhFiscal(avp66Operator);
  const d=avp66Draft.acessosDetalhados;
  const restricoes=[['semCaixa','Sem funções de caixa','Restringe o trabalho em caixa para o cargo fiscal.'],['semMetaIndividual','Sem metas individuais','Impede atribuição de metas comerciais a fiscais.'],['somenteLeitura','Somente leitura','Define intenção de acesso sem edição no painel.'],['semExportacao','Sem exportar dados','Restringe exportações nos módulos com controle integrado.']];
  return `<div class="avp66-paneltitle"><h3>Restrições especiais</h3><p>Defina bloqueios adicionais. As restrições obrigatórias do cargo Fiscal não podem ser removidas.</p></div>
    <div class="avp66-restrictions">${restricoes.map(([id,nome,desc])=>{
      const fixo=cargoFiscal&&['semCaixa','semMetaIndividual'].includes(id);
      const marcado=fixo||!!d.restricoes[id];
      return `<label class="avp66-restrict"><span><b>${nome}${fixo?' · obrigatório':''}</b><small>${desc}</small></span><input type="checkbox" role="switch" ${marcado?'checked':''} ${fixo||dev?'disabled':''} onchange="avp66Alterar('restricoes','${id}','ver',this.checked)"></label>`;
    }).join('')}</div><div class="avp66-paneltitle"><h3>Recursos da conta</h3><p>Acesso à configuração pessoal e a cópias de dados.</p></div>
    <div class="avp66-restrictions">${[['alterarSenha','Alterar a própria senha'],['backupDados','Fazer backup completo']].map(([id,nome])=>`<label class="avp66-restrict"><b>${nome}</b><input type="checkbox" role="switch" ${avp66Draft[id]?'checked':''} ${dev?'disabled':''} onchange="avp66Alterar('recursos','${id}','ver',this.checked)"></label>`).join('')}</div>
    <p class="avp66-note">A política de caixa e metas do Fiscal permanece obrigatória independentemente da seleção visual. As opções de somente leitura e exportação exigem validação no fluxo correspondente antes de representar restrições de segurança completas.</p>`;
}
function avp66RenderWorkspace(){
  const root=document.getElementById('avp66Workspace');if(!root)return;
  if(!avp66Operator||!avp66ListaUsuarios().some(x=>x.op===avp66Operator)){root.innerHTML='<p class="avp66-empty">Selecione um operador.</p>';return;}
  if(!avp66Draft)avp66Draft=avp66NormalizarRascunho(avp66Operator);
  const u=avp66ListaUsuarios().find(x=>x.op===avp66Operator),dev=u.op==='133';
  const stats=avp66Stats(avp66Draft),c=avp66Draft.acessosDetalhados;
  const role=avp66PerfilCargo(u.cargo);
  const roles=['gerencia','vm','assessor','fiscal','aprendiz','freelance'];
  const header=`<header class="avp66-person-head"><div class="avp66-person-mark">${avp66Esc(u.nome[0])}</div><div class="avp66-person-caption"><span class="avp66-overline">PERFIL SELECIONADO</span><h3>${avp66Esc(u.nome)}</h3><p>Operador ${avp66Esc(u.op)} · ${avp66Esc(u.cargo)}</p></div><span class="avp66-identity ${dev?'avp66-admin':''}">${dev?'Acesso administrativo':'Acesso individual'}</span></header>`;
  root.innerHTML=`${header}<div class="avp66-detailstats"><span><b>${stats.mod}</b> módulos</span><span><b>${stats.docs}</b> / ${stats.total} documentos</span><span><b>${stats.links}</b> sistemas AV</span><span><b>${AVP70_CONFIG_SECTIONS.filter(([id])=>avp70PodeSecaoNoPerfil(avp66Draft,id,avp66Operator)).length}</b> áreas de Configurações</span></div>
    <div class="avp66-roleline"><div><small>PERFIL DE REFERÊNCIA</small><b>${avp66Esc(c.perfilBase==='personalizado'?'Personalizado · '+avp66PapelNome(role):avp66PapelNome(c.perfilBase))}</b></div><div class="avp66-roleactions">
    ${dev?'<span class="avp66-protected">◆ Protegido</span>':`<button type="button" class="avp66-minibtn" onclick="avp66AplicarCargo()">↺ Aplicar padrão do cargo</button><select id="avp66CloneSource" aria-label="Copiar permissões de outro operador"><option value="">Clonar de...</option>${avp66ListaUsuarios().filter(x=>x.op!==u.op).map(x=>`<option value="${avp66Esc(x.op)}">${avp66Esc(x.nome)} (OP. ${avp66Esc(x.op)})</option>`).join('')}</select><button type="button" class="avp66-minibtn" onclick="avp66Clonar()">Copiar</button>`}</div></div>
    <nav class="avp66-tabs" aria-label="Tipos de permissão">${AVP66_TABS.map(([id,label])=>`<button type="button" class="${avp66Tab===id?'active':''}" aria-current="${avp66Tab===id?'page':'false'}" onclick="avp66SelecionarAba('${id}')">${label}</button>`).join('')}</nav>
    <div class="avp66-tabbody">${avp66Tab==='modulos'?avp66Modulos(dev):avp66Tab==='acoes'?avp66Acoes(dev):avp66Tab==='configuracoes'?avp70Configuracoes(dev):avp66Tab==='documentos'?avp66Documentos(dev):avp66Tab==='sistemas'?avp66Sistemas(dev):avp66Restricoes(dev)}</div>
    <footer class="avp66-savebar"><span>${dev?'Acesso integral protegido':avp66Dirty?'● Alterações ainda não salvas':'✓ Configuração atualizada'}</span><div><button type="button" class="avp66-minibtn" onclick="avp66Reverter()" ${dev||!avp66Dirty?'disabled':''}>Descartar</button><button type="button" class="avp66-primary" onclick="salvarCentralPermissoesAV()" ${dev||!avp66Dirty?'disabled':''}>Salvar alterações</button></div></footer>`;
}
function avp66Reverter(){if(avp66Dirty&&!confirm('Descartar alterações não salvas?'))return;avp66Draft=avp66NormalizarRascunho(avp66Operator);avp66Dirty=false;avp66RenderWorkspace();}
function avp66GerarPerfil(perfil,op){
  const p=avp66NormalizarRascunho(op);
  const role=perfil||avp66PerfilCargo(avp66CargoUsuario(op));
  const grupos={
    gerencia:MODULOS.map(x=>x[0]),
    vm:['painel','anotacoes','tarefas','operacoes','colaboradores','funcionarios','escalas','acompanhamento','relatorios','sistemaav','sophia'],
    assessor:['painel','anotacoes','tarefas','operacoes','funcionarios','acompanhamento','sistemaav','sophia'],
    fiscal:['painel','anotacoes','tarefas','operacoes','funcionarios','escalas','sophia'],
    aprendiz:['painel','anotacoes','tarefas','operacoes','funcionarios'],
    freelance:['painel','anotacoes','tarefas','operacoes']
  };
  const liberados=new Set(grupos[role]||grupos.assessor);
  MODULOS.forEach(([id])=>p[id]=liberados.has(id));
  p.painel=true;p.alterarSenha=false;p.backupDados=role==='gerencia';
  p.acessosDetalhados={versao:2,perfilBase:role,acoes:{},documentos:{},restricoes:{},secoesConfig:{inicio:true,usuarios:role==='gerencia',permissoes:true,dados:role==='gerencia'}};
  if(role==='fiscal'){p.acessosDetalhados.restricoes.semCaixa=true;p.acessosDetalhados.restricoes.semMetaIndividual=true;}
  if(['aprendiz','freelance'].includes(role))p.acessosDetalhados.restricoes.semExportacao=true;
  const allowAll=role==='gerencia';
  for(const [id] of MODULOS){
    p.acessosDetalhados.acoes[id]={};
    for(const [acao] of AVP66_MODULE_ACTIONS)p.acessosDetalhados.acoes[id][acao]=p[id]&&(allowAll||(!['excluir','exportar'].includes(acao)&&!(role==='aprendiz'&&acao==='editar')));
  }
  for(const cat of avp66Catalogo())for(const doc of cat.documentos){
    const allow=p.operacoes&&(allowAll||(role==='vm'?cat.id==='visual_merchandising'||cat.id==='reconhecimento_premiacoes':role==='fiscal'?cat.id==='fiscal_auditoria'||cat.id==='rotinas_operacionais':role==='assessor'?cat.id==='rotinas_operacionais'||cat.id==='produtos_financeiros':role==='aprendiz'?cat.id==='rotinas_operacionais':cat.id==='visual_merchandising'));
    p.acessosDetalhados.documentos[doc.id]={ver:allow,criar:allow&&role!=='aprendiz',editar:allow&&doc.editavel&&role!=='aprendiz',imprimir:allow,excluir:allow&&allowAll};
  }
  p.sistemaAvLinks=Object.fromEntries(SISTEMA_AV_LINKS.map(([id])=>[id,allowAll]));
  if(role==='vm')p.sistemaAvLinks.estoque=true;
  if(role==='assessor')p.sistemaAvLinks.resultado=true;
  return p;
}
function avp66AplicarCargo(){
  if(avp66Operator==='133')return;
  const role=avp66PerfilCargo(avp66CargoUsuario(avp66Operator));
  if(!confirm(`Aplicar o perfil padrão ${avp66PapelNome(role)}? As permissões individuais atuais serão substituídas somente ao salvar.`))return;
  avp66Draft=avp66GerarPerfil(role,avp66Operator);avp66Dirty=true;avp66RenderWorkspace();
}
function avp66Clonar(){
  if(avp66Operator==='133')return;
  const origem=normalizarOperador(document.getElementById('avp66CloneSource')?.value);
  if(!origem||origem===avp66Operator)return alert('Selecione um operador de origem.');
  if(!confirm('Copiar as permissões desse operador? As restrições obrigatórias do cargo de destino serão mantidas.'))return;
  avp66Draft=avp66NormalizarRascunho(origem);
  if(avp66EhFiscal(avp66Operator)){
    avp66Draft.acessosDetalhados.restricoes.semCaixa=true;
    avp66Draft.acessosDetalhados.restricoes.semMetaIndividual=true;
  }
  avp66Draft.acessosDetalhados.perfilBase='personalizado';
  avp66Dirty=true;avp66RenderWorkspace();
}
async function salvarCentralPermissoesAV(){
  if(normalizarOperador(usuarioAtual?.operador)!=='133'||!avp66Operator||avp66Operator==='133'||!avp66Dirty)return;
  const operador=avp66Operator,p=JSON.parse(JSON.stringify(avp66Draft));
  p.painel=true;
  if(p.alterarSenha||p.backupDados)p.config=true;
  if(avp66EhFiscal(operador)){
    p.acessosDetalhados.restricoes.semCaixa=true;
    p.acessosDetalhados.restricoes.semMetaIndividual=true;
  }
  const anterior=JSON.parse(JSON.stringify(globalConfig?.permissoes?.[operador]||{}));
  globalConfig.permissoes[operador]=p;
  const saveBtn=document.querySelector('.avp66-primary');if(saveBtn){saveBtn.disabled=true;saveBtn.textContent='Salvando...';}
  try{
    const confirmado=await salvarConfigGlobalOnline();
    if(confirmado!==true)throw new Error('O servidor não confirmou a gravação das permissões.');
    avp66Dirty=false;avp66Draft=avp66NormalizarRascunho(operador);
    avp66RenderLista();avp66RenderWorkspace();aplicarPermissoes();
  }catch(err){
    globalConfig.permissoes[operador]=anterior;
    console.error('Erro ao salvar acessos AV:',err);
    if(saveBtn){saveBtn.disabled=false;saveBtn.textContent='Salvar alterações';}
    alert('Não foi possível salvar as permissões no servidor. Nenhuma alteração foi confirmada.');
  }
}
// Renderização tardia porque a lista de templates é registrada pelo módulo Operações.
document.addEventListener('click',function(ev){
  const btn=ev.target.closest?.('.config-av-navbtn[data-config-target="permissoes"]');
  if(btn)setTimeout(()=>{avp66RenderLista();avp66RenderWorkspace();},0);
});
const avp66OldSelect=selecionarSecaoConfigAV;
selecionarSecaoConfigAV=function(secao){
  avp66OldSelect(secao);
  if(secao==='permissoes'){avp66RenderLista();avp66RenderWorkspace();}
};
