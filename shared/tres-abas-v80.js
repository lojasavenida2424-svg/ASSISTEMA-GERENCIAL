/* V80: pequenas melhorias visuais controladas. Nenhuma mudança em persistência/autenticação. */
function av80AtualizarResumoNotas(registros) {
  if (!Array.isArray(registros)) return;
  const setText = (id, value) => {const el=document.getElementById(id);if(el)el.textContent=String(value);};
  setText('av80NotasTotal', registros.length);
  setText('av80NotasPrioridade', registros.filter(n=>String(n?.prioridade||'').toUpperCase()==='ALTA').length);
  setText('av80NotasConcluidas', registros.filter(n=>String(n?.status||'').toUpperCase().includes('CONCLU')).length);
}
function av80AtualizarResumoFuncionarios(registros) {
  if (!Array.isArray(registros)) return;
  const originais=typeof db!=='undefined' && Array.isArray(db?.funcionarios)?db.funcionarios:[];
  const setText = (id,value) => {const el=document.getElementById(id);if(el)el.textContent=String(value);};
  setText('av80FuncTotal', originais.length);
  setText('av80FuncAtivos', originais.filter(f => String(f?.status||'ATIVO').toUpperCase()==='ATIVO').length);
  setText('av80FuncFiltrados', registros.length);
}
function av80SelecionarModoFuncionarios(modo) {
  const tabela=modo==='TABLE';
  const cards=document.getElementById('funcCards');
  const table=document.getElementById('av80FuncionariosTabela');
  if(!cards || !table) return;
  cards.hidden=tabela;
  table.hidden=!tabela;
  for (const [id, active] of [['av80ViewCards',!tabela],['av80ViewTable',tabela]]) {
    const btn=document.getElementById(id);
    if(btn){btn.classList.toggle('active',active);btn.setAttribute('aria-pressed',String(active));}
  }
}
