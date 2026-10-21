// Tandas controladas por el usuario + filtro de estadísticas.
(function(){
  const $=id=>document.getElementById(id);
  // Migración: tandas antiguas y flechas sin etiqueta -> se derivan de los metadatos de la sesión.
  (function migrate(){
    const L=store.list(); let ch=false;
    const tandaAt=(s,x)=>{
      const ts=Number.isFinite(x.wt)?x.wt:Number.isFinite(x.t_ms)?x.t_ms:null;
      if(ts==null) return null;
      let hit=null;
      for(const t of s.tandas||[]){
        const n=Number(t?.n), start=Number(t?.start), end=t?.end==null?null:Number(t?.end);
        if(!Number.isFinite(n)||!Number.isFinite(start)||ts<start) continue;
        if(Number.isFinite(end)&&ts>end) continue;
        if(!hit||start>hit.start) hit={n,start};
      }
      return hit?hit.n:null;
    };
    L.forEach(s=>{
      if(s.tanda && !s.tandas){ const sh=(s.shots||[]).filter(x=>!x.candidate);
        sh.forEach(x=>{ if(x.tanda==null) x.tanda=1; });
        s.tandas=[{n:1,start:sh[0]?.wt||s.id,end:sh[sh.length-1]?.wt||s.id}]; ch=true; }
      if(Array.isArray(s.tandas)&&s.tandas.length) (s.shots||[]).forEach(x=>{
        if(!x||x.candidate||Number(x.tanda)>0) return;
        const n=tandaAt(s,x); if(n!=null){x.tanda=n;ch=true;}
      });
    });
    if(ch) store.save(L);
  })();
  const css=document.createElement('style');
  css.textContent=`.tandaBar{display:flex;flex-direction:column;align-items:stretch;gap:8px;margin:10px 0 2px}
.tandaBtn{display:flex;align-items:center;justify-content:center;width:100%;height:44px;padding:0 16px;border-radius:999px;border:0;background:#fff;color:#111;font-size:14px;font-weight:600}
.tandaBtn.on{background:#2a2a2e;color:#fff}
.tandaInfo{font-size:12px;color:var(--txt-2,#aaa)}
.statFilter{display:flex;gap:2px;padding:3px;border-radius:999px;background:var(--surface);overflow-x:auto;scrollbar-width:none}
.statFilter::-webkit-scrollbar{display:none}
.statFilter[hidden]{display:none}
.statFilter button{flex:1 0 auto;height:32px;padding:0 14px;border:0;border-radius:999px;background:none;color:var(--txt-2,#aaa);font-size:13px;font-weight:500;white-space:nowrap}
.statFilter button.on{background:var(--acc-soft);color:var(--acc);font-weight:600}`;
  document.head.appendChild(css);
  $('trainingStatus').insertAdjacentHTML('afterend','<div class="tandaBar" id="tandaBar"><button class="tandaBtn" id="tandaBtn"></button><span class="tandaInfo" id="tandaInfo"></span></div>');
  $('sessionHero').insertAdjacentHTML('beforebegin','<div class="statFilter" data-scope="session"></div>');
  $('histList').insertAdjacentHTML('beforebegin','<div class="statFilter" data-scope="all"></div>');
  $('profileNums').closest('.card').querySelector('.cardTitle').insertAdjacentHTML('beforeend','<select class="pfChip" id="pfChip"></select>');
  css.textContent+=`.cardTitle{align-items:center}
.pfChip{margin-left:auto;appearance:none;-webkit-appearance:none;height:28px;padding:0 28px 0 12px;border-radius:999px;border:1px solid var(--line-2);color:var(--txt);font:inherit;font-size:12px;font-weight:500;background:transparent url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23f59e0b' stroke-width='2.4' stroke-linecap='round'%3E%3Cpath d='M7 10l5 5 5-5'/%3E%3C/svg%3E") no-repeat right 9px center/14px}`;
  function sessRef(){ return curSess && !historyMode ? curSess : null; }
  function tandaStats(s,n){ const sh=s.shots.filter(x=>!x.candidate&&x.tanda===n), p=Score.totals(sh);
    return `${sh.length} flecha${sh.length===1?'':'s'}${p.scored?' · '+p.score+' pts':''}`; }
  function tandaSets(s,n){ return new Set(s.shots.filter(x=>!x.candidate&&x.tanda===n&&x.set_id>0).map(x=>x.set_id)).size; }
  $('tandaBtn').onclick=async()=>{ const s=sessRef(); if(!s) return;
    s.tandas=s.tandas||[];
    if(s.activeTanda){
      const goal=s.mode==='Indoor'?10:s.mode==='Outdoor'?6:0;
      if(goal && tandaSets(s,s.activeTanda)<goal && typeof askConfirm==='function' && !(await askConfirm(`No has acabado los ${goal} sets, ¿quieres cerrar la tanda?`))) return; const t=s.tandas.find(x=>x.n===s.activeTanda); if(t) t.end=Date.now();
      notice(`Tanda ${s.activeTanda} terminada · ${tandaStats(s,s.activeTanda)}`); try{window.Native?.command?.(JSON.stringify({action:'mark',value:'tanda_end '+s.activeTanda}));}catch(_){} s.activeTanda=0; }
    else { const n=s.tandas.length+1; s.tandas.push({n,start:Date.now()}); s.activeTanda=n; try{window.Native?.command?.(JSON.stringify({action:'mark',value:'tanda_start '+n}));}catch(_){} notice(`Tanda ${n} empezada`); }
    persist(); render(); };
  function tandaNums(scope){
    const L=scope==='session'?[{shots:data?.shots||[]}]:store.list(), set=new Set();
    L.forEach(s=>(s.shots||[]).forEach(x=>{ if(Number.isFinite(x.tanda)) set.add(x.tanda); }));
    return [...set].sort((a,b)=>a-b);
  }
  function paintFilters(){
    document.querySelectorAll('.statFilter').forEach(el=>{
      const opts=[['all','Todas'],['score','Puntuables'],...tandaNums(el.dataset.scope).map(n=>['t'+n,'Tanda '+n])];
      el.innerHTML=opts.map(([v,l])=>`<button data-v="${v}" class="${v===statFilter?'on':''}">${l}</button>`).join('');
      el.querySelectorAll('button').forEach(b=>b.onclick=()=>{ statFilter=b.dataset.v; localStorage.setItem('atStatFilter',statFilter); render(); });
    });
    const pc=$('pfChip'); if(pc){ const o=[['all','Todas'],['score','Puntuables'],...tandaNums('all').map(n=>['t'+n,'Tanda '+n])];
      pc.setAttribute('aria-label','Filtrar estadísticas'); pc.innerHTML=o.map(([v,l])=>`<option value="${v}"${v===statFilter?' selected':''}>${l}</option>`).join('');
      pc.onchange=()=>{ statFilter=pc.value; localStorage.setItem('atStatFilter',statFilter); render(); }; }
    const s=sessRef(), bar=$('tandaBar'); bar.hidden=!s;
    if(s){ const a=s.activeTanda; $('tandaBtn').className='tandaBtn'+(a?' on':'');
      $('tandaBtn').innerHTML=a?`Terminar tanda ${a}`:`Empezar tanda ${(s.tandas?.length||0)+1}`;
      $('tandaInfo').textContent=a?tandaStats(s,a):''; }
  }
  const base=render; render=function(){ const r=base.apply(this,arguments); try{paintFilters();}catch(e){console.error(e);} return r; };
  window.render=render;
})();
