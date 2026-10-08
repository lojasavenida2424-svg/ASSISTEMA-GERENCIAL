/* V83 — Modal de preenchimento para Domingo, Feriado, Mês, Limpeza e Provador.
   Move os formulários REAIS para uma janela; não clona campos, IDs ou eventos. */
(function () {
  'use strict';
  const byId = id => document.getElementById(id);
  const ids = ['escalaCreatorPanel', 'escalaLimpezaCreator', 'escalaProvadorCreator', 'escalaMonthPanel'];
  const labels = {
    DOMINGO: 'Escala de Domingo', FERIADO: 'Escala de Feriado',
    MES: 'Escala Mensal', LIMPEZA: 'Escala de Limpeza', PROVADOR: 'Escala de Provador'
  };
  let activeType = '';
  let focusedBefore = null;
  const overlay = document.createElement('div');
  overlay.id = 'avEscalaEditorBackdrop';
  overlay.className = 'no-print';
  overlay.hidden = true;
  overlay.innerHTML = `
    <div class="av-escala-dialog" role="dialog" aria-modal="true" aria-labelledby="avEscalaEditorTitulo" aria-describedby="avEscalaEditorAjuda">
      <header class="av-escala-dialog-header">
        <div>
          <span class="av-escala-dialog-kicker">ASSISTÊNCIA GERENCIAL AV · ESCALAS</span>
          <h2 id="avEscalaEditorTitulo">Preencher escala</h2>
          <span id="avEscalaEditorAjuda" class="sr-only">Preencha os dados e salve ou feche para voltar à área de Escalas.</span>
        </div>
        <button class="av-escala-dialog-close" type="button" aria-label="Fechar formulário de escala" title="Fechar e voltar para Escalas">✕</button>
      </header>
      <div class="av-escala-dialog-body" id="avEscalaEditorConteudo"></div>
    </div>`;
  document.body.appendChild(overlay);
  const body = byId('avEscalaEditorConteudo');
  const heading = byId('avEscalaEditorTitulo');

  // Mover os formulários originais não altera os dados que as funções já leem por ID.
  for (const id of ids) {
    const el = byId(id);
    if (el) body.appendChild(el);
  }
  // O mês é criado dinamicamente antes de escalaCreatorPanel; o observer trata isso.
  // A seleção múltipla é um diálogo independente, acima do formulário principal.
  const pessoas = byId('modalEscalaPessoas');
  if (pessoas) document.body.appendChild(pessoas);

  function selectedPanel() {
    return ids.map(byId).find(el => el && el.classList.contains('active')) || null;
  }
  function identifyType(el) {
    switch (el?.id) {
      case 'escalaCreatorPanel': return (byId('escalaTipo')?.value || 'DOMINGO').toUpperCase();
      case 'escalaLimpezaCreator': return 'LIMPEZA';
      case 'escalaProvadorCreator': return 'PROVADOR';
      case 'escalaMonthPanel': return 'MES';
      default: return '';
    }
  }
  function hide() {
    if (overlay.hidden) return;
    overlay.hidden = true;
    overlay.classList.remove('active');
    activeType = '';
    document.body.classList.remove('av-escala-dialog-open');
    const navCreate = document.querySelector('#escalas button[onclick="abrirSeletorCriacaoEscala()"]');
    const restore = focusedBefore?.isConnected && focusedBefore.offsetParent ? focusedBefore : navCreate;
    if (restore) { try { restore.focus({preventScroll: true}); } catch(_){} }
  }
  function update() {
    const panel = selectedPanel();
    if (!panel) { hide(); return; }
    // Para o painel MÊS, criado por uma função legada, realocar no mesmo contêiner.
    if (panel.parentElement !== body) body.insertBefore(panel, byId('escalaCreatorPanel'));
    const type = identifyType(panel);
    heading.textContent = labels[type] || 'Preencher escala';
    if (overlay.hidden) {
      focusedBefore = document.activeElement;
      overlay.hidden = false;
      overlay.classList.add('active');
      document.body.classList.add('av-escala-dialog-open');
      body.scrollTop = 0;
      requestAnimationFrame(() => {
        if (!overlay.hidden) overlay.querySelector('.av-escala-dialog-close')?.focus({preventScroll:true});
      });
    } else if (activeType !== type) {
      body.scrollTop = 0;
    }
    activeType = type;
  }
  function closeCurrent() {
    const panel = selectedPanel();
    switch (panel?.id) {
      case 'escalaCreatorPanel':
        if (typeof window.fecharCriadorEscala === 'function') window.fecharCriadorEscala();
        break;
      case 'escalaMonthPanel':
        if (typeof window.fecharEscalaMensal === 'function') window.fecharEscalaMensal();
        break;
      case 'escalaLimpezaCreator':
        if (typeof window.fecharCriadorEscalaLimpeza === 'function') window.fecharCriadorEscalaLimpeza();
        break;
      case 'escalaProvadorCreator':
        if (typeof window.fecharCriadorEscalaProvador === 'function') window.fecharCriadorEscalaProvador();
        break;
    }
    // Fechamento imediato, sem esperar o MutationObserver.
    hide();
  }
  overlay.querySelector('.av-escala-dialog-close').addEventListener('click', closeCurrent);
  overlay.addEventListener('click', ev => { if (ev.target === overlay) closeCurrent(); });
  document.addEventListener('keydown', ev => {
    if (overlay.hidden) return;
    if (ev.key === 'Escape') {
      if (pessoas?.classList.contains('active')) { ev.preventDefault(); pessoas.classList.remove('active'); return; }
      ev.preventDefault(); closeCurrent(); return;
    }
    if (ev.key !== 'Tab' || pessoas?.classList.contains('active')) return;
    // Manter o foco dentro do formulário aberto.
    const tabbables = [...overlay.querySelectorAll('button, input, select, textarea, a[href], [tabindex]')]
      .filter(el => !el.disabled && !el.hidden && el.getClientRects().length > 0 && el.tabIndex >= 0);
    if (!tabbables.length) return;
    const first=tabbables[0], last=tabbables[tabbables.length-1];
    if (ev.shiftKey && document.activeElement === first) { ev.preventDefault(); last.focus(); }
    else if (!ev.shiftKey && document.activeElement === last) { ev.preventDefault(); first.focus(); }
  });
  const observer = new MutationObserver(update);
  observer.observe(body, {attributes:true, attributeFilter:['class'], subtree:true, childList:true});
  // Ao criar o painel MÊS no corpo do modal, o watcher vê a classe active.
  window.avFecharEditorEscalasV83 = closeCurrent;
  window.avAtualizarEditorEscalasV83 = update;
})();
