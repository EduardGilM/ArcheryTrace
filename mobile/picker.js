// Selector oscuro propio en lugar del diálogo nativo de <select>.
(function(){
  const css=document.createElement('style');
  css.textContent=`#atPick{position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,0);transition:background .22s ease;display:flex;align-items:flex-end}
#atPick.open{background:rgba(0,0,0,.55)}
#atPick .pk{width:calc(100% - 24px);margin:0 12px max(12px,env(safe-area-inset-bottom));max-height:70vh;overflow:auto;background:#141416;border:1px solid var(--line);border-radius:20px;padding:8px;box-sizing:border-box;transform:translateY(110%);transition:transform .26s cubic-bezier(.2,.8,.2,1);box-shadow:0 12px 32px rgba(0,0,0,.5)}
#atPick.open .pk{transform:none}
#atPick .pkT{font-size:12px;color:var(--txt-3);padding:8px 12px 6px}
#atPick button{display:flex;align-items:center;justify-content:space-between;width:100%;min-height:46px;padding:0 14px;border:none;border-radius:999px;background:none;color:var(--txt);font:inherit;font-size:15px;text-align:left}
#atPick button.on{background:var(--surface-2,#222);font-weight:600}
#atPick button svg{width:18px;height:18px;color:var(--acc);flex-shrink:0}
#atPick button:disabled{opacity:.4}`;
  document.head.appendChild(css);
  const CHECK='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';
  const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  function title(sel){ if(sel.getAttribute('aria-label')) return sel.getAttribute('aria-label');
    const l=sel.closest('label'); return l?[...l.childNodes].filter(n=>n.nodeType===3).map(n=>n.textContent).join('').trim():''; }
  function close(){ const o=document.getElementById('atPick'); if(!o) return; o.classList.remove('open'); setTimeout(()=>o.remove(),260); }
  function open(sel){
    if(sel.disabled||document.getElementById('atPick')) return;
    const o=document.createElement('div'); o.id='atPick';
    const t=title(sel);
    o.innerHTML=`<div class="pk" role="listbox">${t?`<div class="pkT">${esc(t)}</div>`:''}${[...sel.options].map((op,i)=>`<button data-i="${i}" class="${i===sel.selectedIndex?'on':''}"${op.disabled?' disabled':''}><span>${esc(op.textContent)}</span>${i===sel.selectedIndex?CHECK:''}</button>`).join('')}</div>`;
    o.addEventListener('click',e=>{ const b=e.target.closest('button[data-i]');
      if(b){ const i=+b.dataset.i; if(i!==sel.selectedIndex){ sel.selectedIndex=i; sel.dispatchEvent(new Event('input',{bubbles:true})); sel.dispatchEvent(new Event('change',{bubbles:true})); } close(); }
      else if(!e.target.closest('.pk')) close(); });
    document.body.appendChild(o); requestAnimationFrame(()=>requestAnimationFrame(()=>o.classList.add('open')));
    o.querySelector('button.on')?.scrollIntoView({block:'nearest'});
  }
  const sel=e=>e.target.closest&&e.target.closest('select');
  document.addEventListener('mousedown',e=>{ if(sel(e)) e.preventDefault(); },true);
  document.addEventListener('click',e=>{ const s=sel(e); if(s){ e.preventDefault(); s.blur(); open(s); } },true);
  document.addEventListener('keydown',e=>{ const s=sel(e); if(s&&[' ','Enter','ArrowDown','ArrowUp'].includes(e.key)){ e.preventDefault(); open(s); }
    if(e.key==='Escape') close(); },true);
  window.addEventListener('popstate',close);
})();
