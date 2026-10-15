// Objetivos: plan semanal (días + flechas/día) y meta de puntuación (formato + puntuación + fecha).
(function(){
  const $=id=>document.getElementById(id), DAYS=['L','M','X','J','V','S','D'];
  const MONTHS=['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
  const ROUND={vegas:{name:'Vegas 300',n:30,max:300},wa:{name:'WA 18 m',n:60,max:600},lancaster:{name:'Lancaster',n:30,max:330}};
  const load=(k,d)=>{try{return JSON.parse(localStorage.getItem(k))||d;}catch(e){return d;}};
  const save=(k,v)=>v==null?localStorage.removeItem(k):localStorage.setItem(k,JSON.stringify(v));
  let editing=null, draft=null;
  const css=document.createElement('style');
  css.textContent=`.og .cardTitle{align-items:center}
.og .cardTitle small{flex:1;min-width:0;font-size:12px;font-weight:400;color:var(--txt-3);line-height:28px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.og .ed{margin-left:auto;flex-shrink:0;height:28px;padding:0 12px;border-radius:999px;background:#1c1c1e;border:none;color:var(--txt);font:inherit;font-size:12px;font-weight:500}
.og .days{display:flex;justify-content:space-between;margin:2px 0 14px}
.og .days>div{display:flex;flex-direction:column;align-items:center;gap:5px;font-size:11px;color:var(--txt-3)}
.og .days .today{color:var(--txt);font-weight:600}
.og .days svg text{font-family:var(--num);font-size:12px}
.og .mrow{grid-template-columns:repeat(3,minmax(0,1fr))}.og .mrow .lbl{white-space:nowrap}.og .mrow small{font-size:14px;color:var(--txt-3);font-family:var(--num)}
.og .empty{font-size:13px;color:var(--txt-3);padding:4px 0 2px}
.og .edit{margin-top:14px;padding-top:14px;border-top:1px solid var(--line)}
.og .edit .lbl{display:block;font-size:12px;color:var(--txt-3);margin:0 0 8px}
.og .pills{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:14px}
.og .pills button{height:32px;min-width:38px;padding:0 13px;border-radius:999px;border:none;background:#1c1c1e;color:var(--txt-2);font:inherit;font-size:13px;font-weight:500}
.og .pills button.on{background:var(--acc);color:#111;font-weight:600}
.og .step{display:flex;align-items:center;gap:8px;margin-bottom:14px}
.og .step button{width:38px;height:32px;border-radius:999px;border:none;background:#1c1c1e;color:var(--txt);font-size:17px}
.og .step b{min-width:60px;text-align:center;font:600 22px var(--num)}
.og .acts{display:flex;gap:8px}.og .acts .btnSecondary{flex:1;min-height:44px}
.og .acts .ghost{background:none;border:1px solid var(--line);color:var(--txt-3);border-radius:22px;padding:0 16px;font:inherit;font-size:13px}`;
  document.head.appendChild(css);
  const pad=n=>String(n).padStart(2,'0'), dk=d=>d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate());
  const monday=d=>{const m=new Date(d.getFullYear(),d.getMonth(),d.getDate());m.setDate(m.getDate()-((m.getDay()+6)%7));return m;};
  function arrowsByDay(){ const m={}; store.list().forEach(s=>{ const n=(s.shots||[]).filter(x=>!x.candidate).length; if(!n) return; const k=dk(new Date(s.id)); m[k]=(m[k]||0)+n; }); return m; }
  function weekStats(plan,by,start){ const days=DAYS.map((_,i)=>{const d=new Date(start);d.setDate(d.getDate()+i);return {i,key:dk(d),n:by[dk(d)]||0,plan:plan.days.includes(i)};});
    const total=days.reduce((a,d)=>a+d.n,0), goal=plan.days.length*plan.arrows, met=days.filter(d=>d.plan&&d.n>=plan.arrows).length;
    return {days,total,goal,met,ok:total>=goal&&met>=plan.days.length}; }
  function ring(d,plan,today){ const r=14,c=2*Math.PI*r,f=plan.arrows?Math.min(1,d.n/plan.arrows):0;
    return `<svg width="38" height="38" aria-label="${d.n} flechas"><circle cx="19" cy="19" r="${r}" fill="none" stroke="${d.plan?'#2c2c2f':'#1a1a1c'}" stroke-width="4"/>`+
      (d.n?`<circle cx="19" cy="19" r="${r}" fill="none" stroke="var(--acc)" stroke-width="4" stroke-linecap="round" stroke-dasharray="${(c*f).toFixed(1)} ${c.toFixed(1)}" transform="rotate(-90 19 19)"/>`:'')+
      `<text x="19" y="23" text-anchor="middle" fill="${d.n?'var(--txt)':'var(--txt-3)'}">${d.n||(d.plan?'·':'')}</text></svg>`; }
  function renderWeek(){
    const el=$('goalCard'); if(!el) return; const plan=load('atPlan',null), now=new Date(), start=monday(now), by=arrowsByDay(), todayI=(now.getDay()+6)%7;
    const p=plan||{days:[],arrows:0}, w=weekStats(p,by,start);
    let streak=0; if(plan){ const s=new Date(start); if(!w.ok) s.setDate(s.getDate()-7); for(let k=0;k<104;k++){ if(!weekStats(p,by,s).ok) break; streak++; s.setDate(s.getDate()-7);} }
    let h=`<div class="cardTitle">Esta semana${plan?`<small>${p.arrows} flechas · ${p.days.length} días</small>`:''}<button class="ed" data-ed="plan">${editing==='plan'?'Cerrar':'Editar'}</button></div>`+
      `<div class="days">${w.days.map(d=>`<div class="${d.i===todayI?'today':''}">${ring(d,p)}${DAYS[d.i]}</div>`).join('')}</div>`;
    h+=plan?`<div class="mrow"><div><span class="lbl">Total semana</span><b class="num">${w.total}<small> /${w.goal}</small></b></div><div><span class="lbl">Días cumplidos</span><b class="num">${w.met}<small> /${p.days.length}</small></b></div><div><span class="lbl">Racha</span><b class="num">${streak}<small> sem</small></b></div></div>`
      :`<p class="empty">Elige qué días tiras y cuántas flechas.</p>`;
    if(editing==='plan'){ const d=draft;
      h+=`<div class="edit"><span class="lbl">Días</span><div class="pills" data-k="days">${DAYS.map((l,i)=>`<button data-v="${i}" class="${d.days.includes(i)?'on':''}">${l}</button>`).join('')}</div>`+
        `<span class="lbl">Flechas por día</span><div class="pills" data-k="arrows">${[18,24,36,48,60,72,90].map(n=>`<button data-v="${n}" class="${d.arrows===n?'on':''}">${n}</button>`).join('')}</div>`+
        `<div class="acts"><button class="btnSecondary" data-act="save">Guardar</button>${plan?'<button class="ghost" data-act="clear">Quitar</button>':''}</div></div>`; }
    el.innerHTML=h;
  }
  function metaPoints(meta){ const R=ROUND[meta.format];
    return store.list().filter(s=>Score.formatOf(s)===meta.format).sort((a,b)=>a.id-b.id).map(s=>{const t=Score.totals((s.shots||[]).filter(x=>!x.candidate));return t.scored>=10&&t.avg!=null?{t:s.id,v:t.avg*R.n}:null;}).filter(Boolean).slice(-10); }
  const fmtDay=ms=>{const d=new Date(ms);return d.getDate()+' '+MONTHS[d.getMonth()];};
  function renderMeta(){
    const el=$('metaCard'); if(!el) return; const meta=load('atMeta',null);
    let h=`<div class="cardTitle">Meta${meta?`<small>${ROUND[meta.format].name} · ${meta.target} antes del ${fmtDay(meta.deadline)}</small>`:''}<button class="ed" data-ed="meta">${editing==='meta'?'Cerrar':meta?'Editar':'Crear'}</button></div>`;
    if(!meta) h+=`<p class="empty">Ponte una puntuación y una fecha.</p>`;
    else { const P=metaPoints(meta), R=ROUND[meta.format];
      if(P.length<2) h+=`<p class="empty">Tira ${P.length?'otra ronda':'dos rondas'} ${R.name} para ver tu evolución.</p>`;
      else { const W=320,H=70,vs=P.map(p=>p.v).concat(meta.target),mn=Math.min(...vs)-4,mx=Math.max(...vs)+4,y=v=>H-(v-mn)/(mx-mn)*H;
        h+=`<svg viewBox="0 0 ${W} ${H+4}" style="width:100%;height:auto;margin:4px 0 12px"><line x1="0" x2="${W}" y1="${y(meta.target).toFixed(1)}" y2="${y(meta.target).toFixed(1)}" stroke="#3a3a3d" stroke-dasharray="3 4"/><polyline points="${P.map((p,i)=>`${(i*W/(P.length-1)).toFixed(1)},${(y(p.v)+2).toFixed(1)}`).join(' ')}" fill="none" stroke="var(--acc)" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/></svg>`; }
      if(P.length){ const last=P.slice(-5), avg=last.reduce((a,p)=>a+p.v,0)/last.length, left=Math.max(0,Math.round(meta.target-avg));
        let eta='–', etaOk=false;
        if(left===0){eta='Hecho';etaOk=true;}
        else if(P.length>=3){ const n=P.length,mt=P.reduce((a,p)=>a+p.t,0)/n,mv=P.reduce((a,p)=>a+p.v,0)/n,sl=P.reduce((a,p)=>a+(p.t-mt)*(p.v-mv),0)/P.reduce((a,p)=>a+(p.t-mt)**2,0);
          if(sl>0){ const t=Date.now()+(meta.target-avg)/sl; if(t-Date.now()<365*864e5){eta=fmtDay(t);etaOk=t<=meta.deadline;} } }
        h+=`<div class="mrow"><div><span class="lbl">Media reciente</span><b class="num">${Math.round(avg)}<small> /${R.max}</small></b></div><div><span class="lbl">Faltan</span><b class="num">${left}<small> pts</small></b></div><div><span class="lbl">Previsión</span><b class="num"${etaOk?' style="color:var(--acc)"':''}>${eta}</b></div></div>`; } }
    if(editing==='meta'){ const d=draft, R=ROUND[d.format];
      h+=`<div class="edit"><span class="lbl">Formato</span><div class="pills" data-k="format">${Object.entries(ROUND).map(([k,r])=>`<button data-v="${k}" class="${d.format===k?'on':''}">${r.name}</button>`).join('')}</div>`+
        `<span class="lbl">Puntuación</span><div class="step"><button data-st="-5">−</button><b>${d.target}</b><button data-st="5">+</button><span class="mrow" style="font-size:12px;color:var(--txt-3)">/${R.max}</span></div>`+
        `<span class="lbl">Fecha</span><div class="pills" data-k="weeks">${[[2,'2 semanas'],[4,'1 mes'],[13,'3 meses'],[26,'6 meses']].map(([w,l])=>`<button data-v="${w}" class="${d.weeks===w?'on':''}">${l}</button>`).join('')}</div>`+
        `<div class="acts"><button class="btnSecondary" data-act="save">Guardar</button>${meta?'<button class="ghost" data-act="clear">Quitar</button>':''}</div></div>`; }
    el.innerHTML=h;
  }
  function paint(){ renderWeek(); renderMeta(); }
  function open(kind){ if(editing===kind){editing=null;paint();return;} editing=kind;
    if(kind==='plan'){ const p=load('atPlan',null); draft=p?{days:[...p.days],arrows:p.arrows}:{days:[0,2,4],arrows:36}; }
    else { const m=load('atMeta',null); draft=m?{format:m.format,target:m.target,weeks:m.weeks||4}:{format:Score.DEFAULT_FORMAT in ROUND?Score.DEFAULT_FORMAT:'vegas',target:270,weeks:4}; }
    paint(); }
  function click(e,kind){
    const ed=e.target.closest('[data-ed]'); if(ed){open(ed.dataset.ed);return;}
    if(editing!==kind) return;
    const b=e.target.closest('.pills button'); if(b){ const k=b.parentElement.dataset.k, v=b.dataset.v;
      if(k==='days'){ const i=+v; draft.days=draft.days.includes(i)?draft.days.filter(x=>x!==i):[...draft.days,i].sort(); }
      else if(k==='format'){ draft.format=v; draft.target=Math.min(draft.target,ROUND[v].max); }
      else draft[k]=+v; paint(); return; }
    const st=e.target.closest('[data-st]'); if(st){ draft.target=Math.max(5,Math.min(ROUND[draft.format].max,draft.target+ +st.dataset.st)); paint(); return; }
    const a=e.target.closest('[data-act]'); if(!a) return;
    if(kind==='plan'){ if(a.dataset.act==='clear') save('atPlan',null); else if(draft.days.length) save('atPlan',{days:draft.days,arrows:draft.arrows}); else { notice('Elige al menos un día'); return; } }
    else { if(a.dataset.act==='clear') save('atMeta',null); else save('atMeta',{format:draft.format,target:draft.target,weeks:draft.weeks,deadline:Date.now()+draft.weeks*7*864e5}); }
    editing=null; paint(); notice(a.dataset.act==='clear'?'Objetivo quitado':'Objetivo guardado');
  }
  $('goalCard').addEventListener('click',e=>click(e,'plan')); $('metaCard').addEventListener('click',e=>click(e,'meta'));
  renderGoals=function(){ try{ if(!editing) paint(); }catch(e){ console.error(e); } };
  window.renderGoals=renderGoals;
})();
