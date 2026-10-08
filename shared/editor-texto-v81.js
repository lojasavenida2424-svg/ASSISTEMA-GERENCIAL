/* V81 · Editor rico reutilizável nos textos longos de Anotações e Tarefas.
   Mantém o campo legado (texto simples) e salva HTML estritamente higienizado à parte. */
(function(){
  'use strict';
  const IDS=['notaDescricaoEscrita','notaDescricao','obsFuncTexto','tarefaDescricao'];
  const FONTES={
    Arial:'Arial, Helvetica, sans-serif',
    'Segoe UI':'"Segoe UI", Arial, sans-serif',
    Georgia:'Georgia, serif',
    Verdana:'Verdana, sans-serif',
    'Times New Roman':'"Times New Roman", serif',
    Tahoma:'Tahoma, sans-serif',
    'Courier New':'"Courier New", monospace'
  };
  const TAMANHOS=[12,14,16,18,20,24,28,32,36];
  const ALLOWED=new Set(['B','STRONG','I','EM','U','S','STRIKE','P','DIV','BR','UL','OL','LI','SPAN','FONT','BLOCKQUOTE']);
  const DESCARTAR=new Set(['SCRIPT','STYLE','SVG','MATH','IFRAME','OBJECT','EMBED','FORM','INPUT','BUTTON','SELECT','TEXTAREA','LINK','META','NOSCRIPT','IMG','VIDEO','AUDIO','TABLE']);
  const salvo={};
  let ativo='';
  function corSegura(v){
    v=String(v||'').trim();
    if(/^#[0-9a-f]{3}(?:[0-9a-f]{3})?$/i.test(v)) return v;
    const m=v.match(/^rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})(?:\s*,\s*(0(?:\.\d+)?|1(?:\.0+)?))?\s*\)$/i);
    if(m && [m[1],m[2],m[3]].every(n=>Number(n)<=255)) return `rgb(${m[1]}, ${m[2]}, ${m[3]})`;
    return '';
  }
  function estiloSeguro(tag,src,out){
    const s=src.style;
    const d=out.style;
    const color=corSegura(s.color||src.getAttribute('color'));
    if(color) d.color=color;
    const bg=corSegura(s.backgroundColor);
    if(bg) d.backgroundColor=bg;
    const ff=(s.fontFamily||src.getAttribute('face')||'').replace(/["']/g,'').split(',')[0].trim();
    if(FONTES[ff]) d.fontFamily=FONTES[ff];
    const tam=s.fontSize?.match(/^(\d+(?:\.\d+)?)px$/);
    if(tam && Number(tam[1])>=10 && Number(tam[1])<=36) d.fontSize=`${Number(tam[1])}px`;
    else if(tag==='FONT' && /^\d$/.test(src.getAttribute('size')||'')){
      const map={1:10,2:12,3:16,4:18,5:24,6:28,7:36};
      d.fontSize=`${map[Number(src.getAttribute('size'))]||16}px`;
    }
    if(['left','center','right','justify'].includes(s.textAlign)) d.textAlign=s.textAlign;
    if(['bold','bolder','600','700','800','900'].includes(s.fontWeight)) d.fontWeight=s.fontWeight;
    if(s.fontStyle==='italic') d.fontStyle='italic';
    if(/(?:^|\s)(?:underline|line-through)(?:\s|$)/.test(s.textDecorationLine)) d.textDecorationLine=s.textDecorationLine;
  }
  function higienizarHTML(html){
    const source=document.createElement('template');
    source.innerHTML=String(html||'').slice(0,120000);
    const target=document.createElement('div');
    function copy(parent,into,depth){
      if(depth>35) return;
      [...parent.childNodes].forEach(node=>{
        if(node.nodeType===Node.TEXT_NODE){into.appendChild(document.createTextNode(node.nodeValue));return;}
        if(node.nodeType!==Node.ELEMENT_NODE) return;
        const tag=node.tagName.toUpperCase();
        if(DESCARTAR.has(tag)) return;
        if(!ALLOWED.has(tag)){copy(node,into,depth+1);return;}
        const safe=document.createElement(tag==='FONT'?'span':tag==='STRIKE'?'s':tag.toLowerCase());
        estiloSeguro(tag,node,safe);
        copy(node,safe,depth+1);
        into.appendChild(safe);
      });
    }
    copy(source.content,target,0);
    return target.innerHTML;
  }
  function textoSeguro(html,texto){
    return html ? higienizarHTML(html) : '';
  }
  function editor(id){return document.querySelector(`.av-rte[data-field="${id}"] .av-rte-area`);}
  function campo(id){return document.getElementById(id);}
  function obterTexto(id){
    const el=editor(id); if(!el) return String(campo(id)?.value||'').trim();
    return String(el.innerText||'').replace(/\u00a0/g,' ').trim();
  }
  function obterHTML(id){
    const el=editor(id);
    if(!el || !obterTexto(id)) return '';
    return higienizarHTML(el.innerHTML);
  }
  function sincronizar(id){
    const fallback=campo(id);if(fallback)fallback.value=obterTexto(id);
    if(id==='notaDescricao' && campo('notaVozRevisaoConfirmada')?.value==='1'){
      campo('notaVozRevisaoConfirmada').value='0';
      if(typeof window.atualizarBadgeRevisaoVozNota==='function')window.atualizarBadgeRevisaoVozNota(false);
    }
  }
  function definir(id,texto='',html=''){
    const el=editor(id),fal=campo(id);
    if(!el){if(fal) fal.value=String(texto||'');return;}
    if(html && String(html).trim()) el.innerHTML=higienizarHTML(html);
    else el.textContent=String(texto||'');
    if(fal) fal.value=String(texto||'');
    delete salvo[id];
  }
  function pertence(el,node){return !!el && !!node && (el===node || el.contains(node));}
  function guardar(id){
    const el=editor(id),sel=window.getSelection();
    if(!el || !sel?.rangeCount) return;
    const range=sel.getRangeAt(0);
    if(pertence(el,range.commonAncestorContainer)) {salvo[id]=range.cloneRange();ativo=id;}
  }
  function restaurar(id){
    const el=editor(id);if(!el)return false;
    el.focus();
    const selection=window.getSelection();
    const range=salvo[id];
    if(range && pertence(el,range.commonAncestorContainer)){
      try{selection.removeAllRanges();selection.addRange(range);return true;}catch(e){}
    }
    const end=document.createRange();end.selectNodeContents(el);end.collapse(false);
    selection.removeAllRanges();selection.addRange(end);return true;
  }
  function executar(id,cmd,value){
    if(!restaurar(id))return;
    try{document.execCommand(cmd,false,value||null);}catch(e){console.warn('Editor de texto:',e);}
    guardar(id);sincronizar(id);
  }
  function aplicarTamanho(id,tam){
    const el=editor(id);
    if(!el || !TAMANHOS.includes(Number(tam)))return;
    restaurar(id);
    try{document.execCommand('fontSize',false,'7');}catch(e){}
    el.querySelectorAll('font[size="7"]').forEach(f=>{
      const sp=document.createElement('span'); sp.style.fontSize=`${tam}px`;
      const cor=corSegura(f.getAttribute('color')||f.style.color); if(cor)sp.style.color=cor;
      const fonte=String(f.getAttribute('face')||'').replace(/[\"']/g,'').split(',')[0].trim();if(FONTES[fonte])sp.style.fontFamily=FONTES[fonte];
      while(f.firstChild)sp.appendChild(f.firstChild);
      f.replaceWith(sp);
    });
    guardar(id);sincronizar(id);
  }
  function criar(id){
    const native=campo(id);if(!native||native.dataset.avRte)return;
    const wrap=document.createElement('div');wrap.className='av-rte';wrap.dataset.field=id;
    const fontOptions=Object.keys(FONTES).map(f=>`<option value="${f}">${f}</option>`).join('');
    const tamanhoOptions=TAMANHOS.map(t=>`<option value="${t}" ${t===16?'selected':''}>${t} px</option>`).join('');
    wrap.innerHTML=`<div class="av-rte-toolbar" role="toolbar" aria-label="Ferramentas de formatação">
      <label title="Tipo da letra">Fonte <select data-rte-font aria-label="Fonte">${fontOptions}</select></label>
      <label title="Tamanho da letra">Tamanho <select data-rte-size aria-label="Tamanho da fonte">${tamanhoOptions}</select></label>
      <span class="av-rte-sep" aria-hidden="true"></span>
      <button type="button" data-rte-cmd="bold" title="Negrito (Ctrl+B)" aria-label="Negrito"><b>N</b></button>
      <button type="button" data-rte-cmd="italic" title="Itálico (Ctrl+I)" aria-label="Itálico"><i>I</i></button>
      <button type="button" data-rte-cmd="underline" title="Sublinhado (Ctrl+U)" aria-label="Sublinhado"><u>S</u></button>
      <button type="button" data-rte-cmd="strikeThrough" title="Tachado" aria-label="Tachado"><s>T</s></button>
      <span class="av-rte-sep" aria-hidden="true"></span>
      <label class="av-rte-color-label" title="Cor do texto">Cor <input type="color" data-rte-color value="#252525" aria-label="Cor do texto"></label>
      <label class="av-rte-color-label" title="Marca-texto">Realce <input type="color" data-rte-mark value="#ffea8a" aria-label="Cor de destaque"></label>
      <span class="av-rte-sep" aria-hidden="true"></span>
      <button type="button" data-rte-cmd="justifyLeft" title="Alinhar à esquerda" aria-label="Alinhar à esquerda">☰</button>
      <button type="button" data-rte-cmd="justifyCenter" title="Centralizar" aria-label="Centralizar">≡</button>
      <button type="button" data-rte-cmd="justifyRight" title="Alinhar à direita" aria-label="Alinhar à direita">☷</button>
      <button type="button" data-rte-cmd="justifyFull" title="Justificar" aria-label="Justificar">▤</button>
      <span class="av-rte-sep" aria-hidden="true"></span>
      <button type="button" data-rte-cmd="insertUnorderedList" title="Marcadores" aria-label="Lista com marcadores">• Lista</button>
      <button type="button" data-rte-cmd="insertOrderedList" title="Lista numerada" aria-label="Lista numerada">1. Lista</button>
      <button type="button" data-rte-cmd="removeFormat" title="Limpar a formatação selecionada" aria-label="Limpar formatação">Limpar</button>
    </div><div class="av-rte-area" contenteditable="true" role="textbox" aria-multiline="true" spellcheck="true" aria-label="${native.getAttribute('placeholder')||'Editor de texto'}" data-placeholder="${native.getAttribute('placeholder')||'Digite aqui...'}"></div>
    <div class="av-rte-footer">Selecione o trecho que deseja formatar · Ctrl+B, Ctrl+I e Ctrl+U funcionam normalmente</div>`;
    native.parentNode.insertBefore(wrap,native);
    const area=editor(id);
    area.textContent=native.value||'';
    native.classList.add('av-rte-fallback-hidden'); native.dataset.avRte='1';
    // O texto é validado pelo formulário: campo nativo oculto não pode reter required.
    native.required=false;
    area.addEventListener('focus',()=>{ativo=id;guardar(id);});
    area.addEventListener('mouseup',()=>guardar(id));
    area.addEventListener('keyup',()=>guardar(id));
    area.addEventListener('input',()=>{guardar(id);sincronizar(id);});
    area.addEventListener('paste',ev=>{
      const h=ev.clipboardData?.getData('text/html');
      const t=ev.clipboardData?.getData('text/plain')||'';
      ev.preventDefault();
      restaurar(id);
      if(h)document.execCommand('insertHTML',false,higienizarHTML(h));
      else document.execCommand('insertHTML',false,t.split(/\r?\n/).map(x=>x.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')).join('<br>'));
      guardar(id);sincronizar(id);
    });
    wrap.querySelectorAll('button[data-rte-cmd]').forEach(b=>{
      b.addEventListener('mousedown',e=>e.preventDefault());
      b.addEventListener('click',()=>executar(id,b.dataset.rteCmd));
    });
    wrap.querySelector('[data-rte-font]').addEventListener('change',e=>executar(id,'fontName',e.target.value));
    wrap.querySelector('[data-rte-size]').addEventListener('change',e=>aplicarTamanho(id,Number(e.target.value)));
    wrap.querySelector('[data-rte-color]').addEventListener('input',e=>executar(id,'foreColor',e.target.value));
    wrap.querySelector('[data-rte-mark]').addEventListener('input',e=>executar(id,'hiliteColor',e.target.value));
  }
  function init(){IDS.forEach(criar);}
  window.avRteDefinir=definir;
  window.avRteObterTexto=obterTexto;
  window.avRteObterHTML=obterHTML;
  window.avRteFocar=id=>(editor(id)||campo(id))?.focus();
  window.avRteSanitizar=higienizarHTML;
  window.avRteConteudoParaExibicao=(html,texto)=>{
    const safe=textoSeguro(html,texto);
    if(safe && String(texto||'').trim())return `<div class="av-rte-render">${safe}</div>`;
    return `<div class="av-rte-render">${String(texto||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')}</div>`;
  };
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);
  else init();
})();
