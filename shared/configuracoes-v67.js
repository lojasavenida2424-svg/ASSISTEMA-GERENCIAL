/* V67 — acabamento da navegação de Configurações, sem alterar dados ou permissões. */
(function(){
  function ajustarNavegacao(){
    const buttons=document.querySelectorAll('#navMenu .nav-btn');
    for(const btn of buttons){
      const label=Array.from(btn.childNodes).filter(n=>n.nodeType===Node.TEXT_NODE).map(n=>n.textContent.trim()).join(' ').trim();
      if(label){btn.setAttribute('title',label);btn.setAttribute('aria-label',label);}
    }
    document.body.classList.toggle('av-config-focus-v67',!!document.getElementById('config')?.classList.contains('active'));
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',ajustarNavegacao,{once:true});
  else ajustarNavegacao();
})();
