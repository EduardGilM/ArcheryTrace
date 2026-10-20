// Equipo y calibracion del sensor desde el movil.
const $ = id => document.getElementById(id), escapeText = s => String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const CHECK='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';
const FMT_NAMES={wa:'World Archery',vegas:'Vegas',lancaster:'Lancaster'};
document.head.insertAdjacentHTML('beforeend',`<style>
.training{display:grid;gap:10px;font-size:13px;color:var(--txt-2);line-height:1.5}
.training.card{padding:14px}
.training label{display:flex;align-items:center;justify-content:space-between;gap:10px;color:var(--txt);font-size:14px;font-weight:600}
.training b{color:var(--txt)}
#trainingPanel{background:var(--surface);border:1px solid var(--line);border-radius:16px;padding:14px 14px 6px}
#trainingStatus{font-size:15px;font-weight:600;color:var(--txt);margin-bottom:4px}
.gearBtn{display:flex;align-items:center;gap:10px;width:100%;background:none;border:0;border-top:1px solid var(--line);color:var(--txt-2);padding:12px 0;min-height:56px;text-align:left;font:inherit}
.gearBtn .col{flex:1;min-width:0;display:grid;gap:6px}
.gearBtn .lbl{font-size:11.5px;letter-spacing:.03em;color:var(--txt-3)}
.gearBtn .chips{display:flex;flex-wrap:wrap;gap:6px}
.gearBtn .chip{max-width:100%;font-family:var(--font);font-size:12.5px;font-weight:600;padding:5px 11px;border-radius:999px;background:var(--surface-2);border:1px solid var(--line);color:var(--txt);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.gearBtn .chip.mode{background:var(--acc-soft);border-color:transparent;color:var(--acc)}
.gearBtn .chip.empty{color:var(--acc);border-color:transparent;background:var(--acc-soft)}
.gearBtn .r{flex:none;display:flex}
.gearBtn .r::after{content:'';width:13px;height:13px;background:var(--txt-3);-webkit-mask:var(--i-caret) center/contain no-repeat;mask:var(--i-caret) center/contain no-repeat}
.gearBtn.ro{cursor:default}
.gearBtn.ro .r::after{display:none}
#setGearCard .gearBtn{border-top:none;padding-top:0}
#setGearCard #setState{font-size:12.5px;color:var(--txt-3);padding-top:2px}
#gearSheet:not([hidden]){display:flex;position:fixed;inset:0;z-index:65;background:rgba(6,7,9,.74);align-items:flex-end;justify-content:center;padding:16px}
.gsPanel{display:flex;flex-direction:column;width:100%;max-width:460px;max-height:calc(100dvh - 48px);background:var(--surface);border:1px solid var(--line-2);border-radius:20px;overflow:hidden;animation:gsIn .2s ease-out}
@keyframes gsIn{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}
@media(prefers-reduced-motion:reduce){#gearSheet .gsPanel{animation:none}}
.gsHead{display:flex;align-items:center;gap:10px;padding:16px 16px 4px}
.gsHead b{font-size:16px;font-weight:600;color:var(--txt)}
.gsX{margin-left:auto;width:34px;height:34px;border:0;border-radius:50%;background:var(--surface-2);color:var(--txt-2);display:grid;place-items:center}
.gsX svg{width:16px;height:16px}
.gsBody{display:flex;flex-direction:column;gap:8px;padding:8px 16px 4px;overflow:auto}
.gsLbl{font-size:11.5px;letter-spacing:.04em;text-transform:uppercase;color:var(--txt-3);margin-top:6px}
.gsLbl[hidden],.gsSeg[hidden]{display:none}
.gsCards{display:grid;gap:7px}
.gsRow{display:flex;gap:6px}
.gsCard{flex:1;min-width:0;display:flex;align-items:center;gap:10px;background:var(--surface-2);border:1px solid var(--line);border-radius:14px;padding:10px 12px;color:var(--txt);min-height:56px;text-align:left;font:inherit}
.gsCard .t{flex:1;min-width:0}
.gsCard b{display:block;font-size:14px;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.gsCard small{display:block;font-size:12.5px;color:var(--txt-3);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.gsCard.on{border-color:transparent;background:var(--acc-soft)}
.gsCard.on b,.gsCard.on small{color:var(--acc)}
.gsCard .tick{flex:none;width:20px;height:20px;color:var(--acc)}
.gsCard .tick:empty{display:none}
.gsCard .tick svg{width:20px;height:20px}
.gsDel{flex:none;width:44px;border:1px solid var(--line);border-radius:14px;background:var(--surface-2);color:var(--txt-3);display:grid;place-items:center}
.gsDel svg{width:17px;height:17px}
.gsDel:active{color:var(--danger);border-color:var(--danger)}
.gsEmpty{margin:0;font-size:13px;color:var(--txt-3);padding:2px 0 0}
.gsSeg{display:flex;gap:6px}
.gsSeg button{flex:1;min-width:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;min-height:48px;background:var(--surface-2);border:1px solid var(--line);border-radius:12px;color:var(--txt);font:inherit;font-size:13.5px;padding:6px 4px}
.gsSeg button small{font-size:11px;color:var(--txt-3)}
.gsSeg button.on{border-color:transparent;background:var(--acc-soft);color:var(--acc);font-weight:600}
.gsSeg button.on small{color:var(--acc)}
.gsNew{width:100%;min-height:44px;border:1px dashed var(--line-2);border-radius:12px;background:none;color:var(--txt-2);font:inherit;font-size:13.5px}
.gsForm{display:grid;gap:7px;padding-top:2px}
.gsForm[hidden]{display:none}
.gsForm input{width:100%;min-height:46px;background:var(--surface-2);color:var(--txt);border:1px solid var(--line-2);border-radius:12px;padding:10px 12px;font:inherit;font-size:14px}
.gsForm input::placeholder{color:var(--txt-3)}
.gsSave{min-height:44px;border:1px solid transparent;border-radius:12px;background:var(--acc-soft);color:var(--acc);font:inherit;font-size:13.5px;font-weight:600}
.gsFoot{display:grid;gap:8px;padding:12px 16px calc(14px + env(safe-area-inset-bottom));border-top:1px solid var(--line);background:var(--surface)}
.gsConfirm{display:grid;gap:8px;padding:12px 16px calc(14px + env(safe-area-inset-bottom));border-top:1px solid var(--line);background:var(--surface)}
.gsConfirm button{min-height:48px}
.gsGo{width:100%;min-height:48px;border:0;border-radius:999px;background:#fff;color:#111;font:inherit;font-size:15px;font-weight:600}
.gsGo.acc{background:var(--acc);color:#151006}
.gsGhost{width:100%;min-height:44px;border:1px solid var(--line);border-radius:999px;background:none;color:var(--txt-2);font:inherit;font-size:14px}
.gearTag{display:block;font-size:11.5px;color:var(--txt-3);padding:8px 14px 0}
#comparison:empty,#setState:empty,#volume:empty{display:none}
#notice{position:fixed;bottom:84px;left:16px;right:16px;z-index:20;padding:12px 14px;background:var(--surface-3);border:1px solid var(--line-2);color:var(--txt);border-radius:12px;font-size:13px;box-shadow:0 12px 30px rgba(0,0,0,.4)}
</style>`);
$('sessionHero').insertAdjacentHTML('afterend',`<section class="training" id="trainingPanel"><div id="trainingStatus">Equipo</div>
<button type="button" class="gearBtn" id="gearBtn"><span class="col"><span class="lbl">Sesión</span><span class="chips" id="gearChips"></span></span><span class="r"></span></button></section>`);
$('setbar').insertAdjacentHTML('afterend',`<section class="training card" id="setGearCard" hidden>
<button type="button" class="gearBtn" id="setGearBtn"><span class="col"><span class="lbl">Equipación del set</span><span class="chips" id="setGearChips"></span></span><span class="r"></span></button>
<div id="setState"></div></section>`);
$('vProgress').insertAdjacentHTML('afterbegin',`<section class="training card"><label>Equipo <select id="progressProfile" onchange="renderProgress()"></select></label><div id="volume"></div></section>`);
document.body.insertAdjacentHTML('beforeend','<div id="notice" role="status" hidden></div>'+
`<div id="gearSheet" hidden role="dialog" aria-modal="true" aria-labelledby="gearTitle">
<div class="gsPanel">
<div class="gsHead"><b id="gearTitle">Equipación y modo</b><button type="button" class="gsX" id="gearClose" aria-label="Cerrar"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg></button></div>
<div class="gsBody">
<div class="gsLbl">Equipación</div>
<div class="gsCards" id="gearCards"></div>
<div class="gsLbl">Modo</div>
<div class="gsSeg" id="gearModes">
<button type="button" data-v="Indoor">Indoor<small>3 flechas</small></button>
<button type="button" data-v="Outdoor">Outdoor<small>6 flechas</small></button>
<button type="button" data-v="Libre">Libre<small>sin tope</small></button>
</div>
<div class="gsLbl" id="gearFmtLbl">Formato</div>
<div class="gsSeg" id="gearFormats">
<button type="button" data-fmt="wa">WA<small>10, 9</small></button>
<button type="button" data-fmt="vegas">Vegas<small>X, 10, 9</small></button>
<button type="button" data-fmt="lancaster">Lancaster<small>11, 10, 9</small></button>
</div>
<button type="button" class="gsNew" id="gearNew">+ Nueva equipación</button>
<div class="gsForm" id="gearForm" hidden>
<input id="gearBowName" placeholder="Nombre del arco" maxlength="24" aria-label="Nombre del arco">
<input id="gearArrowName" placeholder="Nombre de las flechas" maxlength="24" aria-label="Nombre de las flechas">
<button type="button" class="gsSave" id="gearSave">Guardar y usar</button>
</div>
</div>
<div class="gsConfirm" id="gearConfirm" hidden><button type="button" class="gsGo acc" id="gearConfirmYes">Empezar</button></div>
<div class="gsFoot" id="gsFoot"><button type="button" class="gsGo" id="gearGo">Listo</button><button type="button" class="gsGhost" id="sessEnd" hidden>Cerrar sesión</button></div>
</div></div>`);
const gear={get:()=>{try{const g=JSON.parse(localStorage.getItem('atGear'));return {bows:Array.isArray(g?.bows)?g.bows:[],arrows:Array.isArray(g?.arrows)?g.arrows:[],setups:Array.isArray(g?.setups)?g.setups.filter(x=>x&&typeof x==='object'):null,last:g?.last&&typeof g.last==='object'?g.last:null};}catch(e){return {bows:[],arrows:[],setups:null,last:null};}},
  save:g=>localStorage.setItem('atGear',JSON.stringify(g))};
// Las equipaciones son combinaciones arco + flechas; las viejas se derivan de lo ya tirado.
function setupList(){
  const g=gear.get();
  if(Array.isArray(g.setups)&&g.setups.length) return g.setups;
  const out=[];
  store.list().slice().sort((a,b)=>b.id-a.id).forEach(s=>{const bow=s.bow||'',arrows=s.arrows||'';if(!bow&&!arrows)return;if(!out.some(x=>x.bow===bow&&x.arrows===arrows))out.push({bow,arrows,usedAt:s.id});});
  g.bows.forEach(b=>{if(!out.some(x=>x.bow===b))out.push({bow:b,arrows:g.arrows[0]||'',usedAt:0});});
  if(!out.length&&g.arrows.length)out.push({bow:'',arrows:g.arrows[0],usedAt:0});
  const saved=gear.get(); saved.setups=out.slice(0,12); gear.save(saved);
  return saved.setups;
}
function rememberSetup(bow,arrows){
  if(!bow&&!arrows)return;
  const g=gear.get(), list=Array.isArray(g.setups)&&g.setups.length?g.setups:setupList();
  g.setups=[{bow,arrows,usedAt:Date.now()},...list.filter(x=>!(x.bow===bow&&x.arrows===arrows))].slice(0,12);
  if(bow&&!g.bows.includes(bow))g.bows.push(bow);
  if(arrows&&!g.arrows.includes(arrows))g.arrows.push(arrows);
  gear.save(g);
}
function gearState(){
  const s=displayedSession(), l=gear.get().last||{};
  if(s) return {bow:s.bow||'',arrows:s.arrows||'',mode:s.mode||l.mode||'Indoor',fmt:FMT_NAMES[s.scoreFormat]?s.scoreFormat:(l.fmt||'vegas'),session:s};
  return {bow:l.bow||'',arrows:l.arrows||'',mode:l.mode||'Indoor',fmt:l.fmt||'vegas',session:null};
}
function rememberLast(){const st=gearState(),g=gear.get();g.last={bow:st.bow,arrows:st.arrows,mode:st.mode,fmt:st.fmt};gear.save(g);}
function hydrateGear(s){
  if(!s||s.bow||s.arrows||s.mode) return s;
  const l=gear.get().last;
  if(!l) return s;
  s.bow=l.bow||null; s.arrows=l.arrows||null;
  if(l.mode){s.mode=l.mode;s.target=l.mode==='Indoor'?3:l.mode==='Outdoor'?6:0;if(l.mode==='Indoor')s.scoreFormat=l.fmt||'vegas';}
  return s;
}
function gearChips(st,withMode){
  const bits=[];
  if(st.bow)bits.push(st.bow);
  if(st.arrows)bits.push(st.arrows);
  if(withMode!==false){const m=[st.mode,st.mode==='Indoor'?FMT_NAMES[st.fmt]:''].filter(Boolean).join(' · ');if(m)bits.push(m);}
  return bits;
}
function renderGear(){
  const st=gearState(), bits=gearChips(st), s=displayedSession();
  let stateTxt='Sin sesión', stateCls=' empty';
  if(s){
    const n=(s.shots||[]).filter(x=>!x.candidate).length, nd=n===1?' flecha':' flechas';
    if(s.prepared) stateTxt='Preparada';
    else if(!s.finished&&s.live) stateTxt='En vivo · '+n+nd;
    else stateTxt='Cerrada · '+n+nd;
    stateCls=/^(Preparada|En vivo)/.test(stateTxt)?' mode':'';
  }
  const material=bits.map(t=>`<span class="chip${/^(Indoor|Outdoor|Libre)/.test(t)?' mode':''}">${escapeText(t)}</span>`).join('')
    ||'<span class="chip empty">Elige tu material</span>';
  $('gearChips').innerHTML=material+`<span class="chip${stateCls}">${escapeText(stateTxt)}</span>`;
  $('gearBtn').setAttribute('aria-label','Sesión: '+[...bits,stateTxt].join(', ')+'. Toca para gestionar');
  if(!$('gearSheet').hidden)paintGear();
}
// Tocar un material: si no hay sesión (o está cerrada) se prepara una con él; si hay una en vivo
// con flechas y el material cambia, primero se confirma: la actual se cierra y empieza otra.
let pendingSetup=null;
function applySetup(bow,arrows){
  if(historyMode)return;
  const s=displayedSession();
  if((s?.shots||[]).length&&!s.finished&&!s.prepared&&((s.bow||'')!==(bow||'')||(s.arrows||'')!==(arrows||''))){
    rememberSetup(bow,arrows);  // la equipación queda guardada aunque se cancele
    pendingSetup={bow,arrows};
    paintGearConfirm();
    return;
  }
  applySetupNow(bow,arrows,s);
}
function applySetupNow(bow,arrows,s){
  rememberSetup(bow,arrows);
  let fresh=false;
  if(!s||s.finished){
    startSession(bow,arrows,s&&s.finished?s:null);
    fresh=true;
  }else if((s.shots||[]).length&&((s.bow||'')!==(bow||'')||(s.arrows||'')!==(arrows||''))){
    const prev=s;
    endSensor(prev.sensorId);
    sealAndPrune(prev);
    startSession(bow,arrows,prev);
    notice('Sesión nueva con '+[bow,arrows].filter(Boolean).join(' · '));
    fresh=true;
  }else{
    s.bow=bow||null;s.arrows=arrows||null;s.gearAsked=true;saveSession(s);
    if(bow)sendCmd('profile',bow);
  }
  rememberLast();
  closeGear();
  if(fresh&&view!=='Session')show('Session');
  else render();
}
function paintGearConfirm(){
  const p=pendingSetup;if(!p)return;
  const name=[p.bow,p.arrows].filter(Boolean).join(' · ');
  $('gearConfirmYes').textContent=name?'Empezar con '+name:'Empezar';
  $('gearConfirm').hidden=false;$('gsFoot').hidden=true;
}
function cancelGearConfirm(){
  pendingSetup=null;
  $('gearConfirm').hidden=true;$('gsFoot').hidden=false;
}
function applyMode(mode){
  if(historyMode)return false;
  const s=displayedSession(); if(!s)return false;
  s.mode=mode;s.tanda=false;s.roundDone=Training.roundComplete(s);s.target=mode==='Indoor'?3:mode==='Outdoor'?6:0;
  if(mode==='Indoor'&&!['wa','vegas','lancaster'].includes(s.scoreFormat))s.scoreFormat='vegas';
  saveSession(s);sendCmd('mode',mode);rememberLast();render();return true;
}
function applyFormat(fmt){
  if(historyMode)return false;
  const s=displayedSession(); if(!s||s.mode!=='Indoor')return false;
  s.scoreFormat=fmt;saveSession(s);rememberLast();render();return true;
}
function removeSetup(i){
  if(historyMode)return;
  const list=setupList(), x=list[i]; if(!x)return;
  const rest=list.filter((_,j)=>j!==i), g=gear.get();
  const stillBow=rest.some(y=>y.bow===x.bow), stillArrows=rest.some(y=>y.arrows===x.arrows);
  g.setups=rest;
  if(!stillBow&&x.bow)g.bows=g.bows.filter(n=>n!==x.bow);
  if(!stillArrows&&x.arrows)g.arrows=g.arrows.filter(n=>n!==x.arrows);
  gear.save(g);
  if(x.bow&&!stillBow&&window.Native?.command){
    const s=displayedSession(), error=Native.command(JSON.stringify({sid:s?.sensorId||'',action:'deleteProfile',value:x.bow}));
    if(error){notice('No se pudo eliminar el preset: '+error);paintGear();return;}
  }
  if(calibrationState()?.profile===x.bow)localStorage.removeItem('atCalibration');
  const s=displayedSession();
  if(s&&s.bow===x.bow&&s.arrows===x.arrows){s.bow=null;s.arrows=null;saveSession(s);}
  if(pendingSetup&&pendingSetup.bow===x.bow&&pendingSetup.arrows===x.arrows)cancelGearConfirm();
  paintGear(); render(); notice('Equipación quitada');
}
function openGear(mode){
  const s=displayedSession();
  window.gearAskedMode=mode||'edit';
  if(s&&historyMode)return;
  if(s&&!s.gearAsked){s.gearAsked=true;saveSession(s);}
  cancelGearConfirm();
  $('gearSheet').hidden=false;
  $('gearForm').hidden=!!setupList().length;
  paintGear();
}
function closeGear(){
  if($('gearSheet').hidden)return;
  cancelGearConfirm();
  $('gearSheet').hidden=true;
  const s=displayedSession();
  if(s&&!historyMode&&!s.mode){const st=gearState();applyMode(st.mode);}
}
function paintGear(){
  const st=gearState(), list=setupList();
  $('gearCards').innerHTML=list.length?list.map((x,i)=>{
    const on=x.bow===st.bow&&x.arrows===st.arrows;
    const name=[x.bow,x.arrows].filter(Boolean).join(' · ')||'Equipación';
    return `<div class="gsRow"><button type="button" class="gsCard${on?' on':''}" data-i="${i}"><span class="t"><b>${escapeText(x.bow||'Sin arco')}</b><small>${escapeText(x.arrows||'Sin flechas')}</small></span><span class="tick">${on?CHECK:''}</span></button><button type="button" class="gsDel" data-del="${i}" aria-label="Quitar ${escapeText(name)}">${TRASH}</button></div>`;
  }).join(''):'<p class="gsEmpty">Todavía no tienes ninguna equipación. Crea la primera aquí abajo.</p>';
  $('gearModes').querySelectorAll('[data-v]').forEach(b=>b.classList.toggle('on',b.dataset.v===st.mode));
  $('gearFmtLbl').hidden=st.mode!=='Indoor';
  $('gearFormats').hidden=st.mode!=='Indoor';
  $('gearFormats').querySelectorAll('[data-fmt]').forEach(b=>b.classList.toggle('on',b.dataset.fmt===st.fmt));
  const start=window.gearAskedMode==='start';
  $('gearTitle').textContent=start?'¿Con qué tiras hoy?':'Sesión';
  $('gearGo').textContent=start?'Empezar':'Listo';
  const cur=displayedSession();
  $('sessEnd').hidden=start||!cur||cur.finished||!cur.live;
}
function maybeAskGear(){
  if(historyMode||!$('gearSheet').hidden)return;
  const s=displayedSession();
  if(!s||!s.live||s.gearAsked||(s.shots&&s.shots.length))return;
  if(view!=='Session')return;
  openGear('start');
}
// ----- sesiones: una sesión = un material; cambiar de material con flechas ya tiradas abre otra -----
function endSensor(sid){  // silencioso: el sensor puede no estar conectado
  if(!sid||!window.Native?.command)return;
  try{Native.command(JSON.stringify({sid,action:'end'}));}catch(e){}
}
function sealAndPrune(s){  // cerrar y, si no quedó nada, olvidarla
  Training.seal(s); saveSession(s);
  const L=store.list().filter(x=>x.id!==s.id||x.shots?.length);
  store.save(L);
}
function startSession(bow,arrows,prev){  // sesión preparada ya con su material
  const l=gear.get().last||{};
  const s=Training.newSession(store.list());
  const mode=(prev&&prev.mode)||l.mode||'Indoor';
  s.mode=mode;
  s.target=mode==='Indoor'?3:mode==='Outdoor'?6:0;
  if(mode==='Indoor')s.scoreFormat=(prev&&FMT_NAMES[prev.scoreFormat])?prev.scoreFormat:(FMT_NAMES[l.fmt]?l.fmt:'vegas');
  s.bow=bow||null; s.arrows=arrows||null;
  s.gearAsked=true;  // material elegido: maybeAskGear no vuelve a preguntar
  if(prev&&prev.awaiting)s.awaiting=prev.awaiting;  // no coger reenvíos del tramo anterior
  const NL=store.list(); NL.push(s); store.save(NL);
  curSess=s; data={shots:[]}; live=true; cur=0;
  historyMode=false; histId=0;
}
function closeCurrentSession(){
  const s=displayedSession();
  if(!s||s.finished)return;
  endSensor(s.sensorId);
  sealAndPrune(s);
  curSess=null; data={shots:[]}; live=false; cur=0;
  closeGear(); liveStatus('');
  render();
  notice(s.shots?.length?'Sesión cerrada y guardada':'Sesión vacía descartada');
}
// Equipación de una flecha concreta: las sesiones antiguas pueden llevar material distinto por set.
function shotGear(sh){const st=gearState();return [(sh&&sh.bow)||st.bow,(sh&&sh.arrows)||st.arrows].filter(Boolean).join(' · ');}
function gearMulti(){return new Set((data&&data.shots||[]).map(shotGear)).size>1;}
// "Empezar"/"Listo": sin sesión todavía, elige el último material y arranca; con sesión, cierra.
function gearGo(){
  const s=displayedSession();
  if(!s||s.finished){
    const st=gearState();
    if(!st.bow&&!st.arrows){notice('Elige tu material');return;}
    applySetup(st.bow,st.arrows);
    return;
  }
  closeGear();
}
$('gearBtn').onclick=()=>{if(historyMode)return;openGear(displayedSession()?'edit':'start');};
$('setGearBtn').onclick=()=>{if(historyMode)return;openGear('edit');};
$('gearClose').onclick=closeGear;
$('gearGo').onclick=gearGo;
$('gearConfirmYes').onclick=()=>{
  const p=pendingSetup;if(!p)return;
  cancelGearConfirm();
  applySetupNow(p.bow,p.arrows,displayedSession());
};
$('gearSheet').onclick=e=>{if(e.target.id==='gearSheet')closeGear();};
$('sessEnd').onclick=closeCurrentSession;
$('gearCards').onclick=e=>{
  const del=e.target.closest('[data-del]');
  if(del){removeSetup(+del.dataset.del);return;}
  const b=e.target.closest('[data-i]'); if(!b)return;
  const x=setupList()[+b.dataset.i]; if(!x)return;
  applySetup(x.bow,x.arrows);
};
$('gearModes').onclick=e=>{const b=e.target.closest('[data-v]');if(b)applyMode(b.dataset.v);};
$('gearFormats').onclick=e=>{const b=e.target.closest('[data-fmt]');if(b)applyFormat(b.dataset.fmt);};
$('gearNew').onclick=()=>{const f=$('gearForm');f.hidden=!f.hidden;if(!f.hidden)$('gearBowName').focus();};
function saveNewSetup(){
  const bow=$('gearBowName').value.trim(), arrows=$('gearArrowName').value.trim();
  if(!bow&&!arrows){notice('Ponle nombre al arco o a las flechas');return;}
  applySetup(bow,arrows); $('gearBowName').value=$('gearArrowName').value=''; $('gearForm').hidden=true;
}
$('gearSave').onclick=saveNewSetup;
['gearBowName','gearArrowName'].forEach(id=>$(id).onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();saveNewSetup();}});
addEventListener('keydown',e=>{if(e.key==='Escape'&&!$('gearSheet').hidden){if(!$('gearConfirm').hidden)cancelGearConfirm();else closeGear();}});
let calibrationConfirming = false, calibrationShotKey = '';
function validCalibrationShot(s) { return !!s && !s.manual && Number.isFinite(s.peak_mg) && s.peak_mg > 150 && s.peak_mg <= 100000; }
function calibrationState() {
  try { const s = JSON.parse(localStorage.getItem('atCalibration')); return s && typeof s === 'object' ? s : null; } catch { return null; }
}
// Sin calibración manual: el cero de puntería es automático en cada tanda.
function renderCalibration(s) {
  const panel = $('calibrationPanel'); if (panel) panel.hidden = true; return;
  const valid = validCalibrationShot(s), session = displayedSession(), select = $('calibrationProfile');
  $('calibrationPanel').hidden = !valid;
  if (!valid) return;
  $('calibrationInfo').textContent = `${s.candidate?'Candidato sin puntuar. ':''}${Math.round(s.peak_mg)} mG`;
  const bows = [...new Set(gear.get().bows)];
  if (!bows.length) bows.push('Recurvo', 'Compuesto');
  const keep = select.value;
  select.innerHTML = bows.map(b => `<option value="${escapeText(b)}">${escapeText(b)}</option>`).join('');
  const key = JSON.stringify([session?.id, s.t_ms]);
  if (key !== calibrationShotKey) {
    select.value = [s?.bow, session?.bow, s?.profile, session?.profile].find(b => bows.includes(b)) || bows[0];
    calibrationShotKey = key;
  } else if (bows.includes(keep)) select.value = keep;
}
function saveSession(s){const L=store.list();const i=L.findIndex(x=>x.id===s.id);if(i>=0)L[i]=s;else L.push(s);store.save(L);if(curSess?.id===s.id)curSess=s;}
function sendCmd(action,value){const s=displayedSession();if(s?.live&&s.sensorId&&window.Native?.command){const error=Native.command(JSON.stringify({sid:s.sensorId,action,value}));if(error)notice(error);}}
let noticeTimer;
function notice(message) { $('notice').textContent=message;$('notice').hidden=false;clearTimeout(noticeTimer);noticeTimer=setTimeout(()=>$('notice').hidden=true,6000); }
function displayedSession() { return store.list().find(s=>s.id===(historyMode?histId:curSess?.id)); }
window.liveEvent = e => {
  if (!e || typeof e.sid!=='string' || !Number.isFinite(e.eid) || typeof e.kind!=='string') throw Error('Evento inválido');
  if (e.kind==='shot' && (!Number.isFinite(e.t)||(!e.manual&&!['score','peak','instab'].every(k=>Number.isFinite(e[k]))))) throw Error('Tiro inválido');
  if (e.kind === 'calibration' && typeof e.requestId === 'string') {
    const pending = calibrationState();
    if (pending?.requestId === e.requestId && typeof e.applied === 'boolean') {
      localStorage.setItem('atCalibration', JSON.stringify({...pending, status: e.applied ? 'applied' : 'error', result: e.result}));
      notice(e.result || (e.applied ? 'Calibración aplicada' : 'Calibración no aplicada'));
    }
  }
  const L=store.list();
  let i=Training.route(L,e);
  if(i<0) {
    if(e.kind!=='shot'&&e.kind!=='start')return;  // eco suelto (end/remove viejo): no inventar sesión
    if(L.some(s=>s.awaiting&&s.awaiting.sid===e.sid&&Number.isFinite(e.eid)&&e.eid<=s.awaiting.eid))return;  // reenvío de un tramo cerrado
    const epoch=Number(e.sid.split('-')[0])*1000;
    L.push(hydrateGear(Training.create(e,Number.isFinite(epoch)&&epoch>1e12?epoch:Math.max(Date.now(),...L.map(s=>s.id+1)))));i=L.length-1;
  }
  else if(L[i].prepared){  // adopta el sensor al primer evento
    L[i].sensorId=e.sid; L[i].awaiting=null; delete L[i].prepared;
    if(L[i].bow&&window.Native?.command)try{Native.command(JSON.stringify({sid:e.sid,action:'profile',value:L[i].bow}));}catch(err){}
  }
  if(e.eid<=(L[i].lastEvent??-1))return;
  const openEnds=new Set((L[i].ends||[]).map(x=>x.id)), beforeDone=!!L[i].roundDone;
  if(e.kind==='start')L.forEach((s,j)=>{if(i!==j)s.live=false;});
  const follow=!data?.shots.length||cur===data.shots.length-1, s=Training.apply(L[i],e);
  L[i]=s;store.save(L);
  if(e.kind==='calibration')notice(e.result);  // se calibra desde el sensor; aqui solo informamos
  if(!historyMode) {
    if(s.live) {curSess=s;data={shots:s.shots};live=true;if(follow)cur=Math.max(0,s.shots.length-1);}
    else if(curSess?.sensorId===e.sid) {curSess=null;data={shots:[]};live=false;cur=0;}
  } else if(histId===s.id) {data={shots:s.shots};}
  liveStatus('');
  if(offerEndScore(s, openEnds)) show('Set');
  else if(!beforeDone && s.roundDone && !historyMode){
    const pts=Score.totals((s.shots||[]).filter(x=>!x.candidate));
    const fmt=Score.formatOf(s);
    const ptsTxt=pts.scored?(fmt?Score.scoreText(pts,s.shots,fmt):pts.score+' pts'):'';
    notice(`${Training.roundLabel(s)} ${Training.roundGoal(s)}/${Training.roundGoal(s)}${ptsTxt?' · '+ptsTxt:''}`);
    render();
  }
  else if(!historyMode && (e.kind==='start'||e.kind==='end'))show('Session');
  else render();
};
function offerEndScore(s, openEnds) {
  const closed=(s.ends||[]).filter(e=>e && !openEnds.has(e.id));
  if(!closed.length || historyMode || !s.live) return false;
  const id=closed[closed.length-1].id;
  const idx=s.shots.findIndex(x=>x.set_id===id && !x.candidate);
  if(idx<0) return false;
  cur=idx;
  const blank=s.shots.find(x=>x.set_id===id && !x.candidate && Score.points(x.result?.value)==null);
  scoreFocus=(blank||s.shots[idx]).t_ms;
  const goal=Training.roundGoal(s);
  notice(goal && s.roundDone ? `${Training.roundLabel(s)} ${goal}/${goal}. Anota el valor.` : 'Tanda cerrada. Anota el valor de las flechas.');
  return true;
}
const originalRemove=removeSelection;
removeSelection=function(kind,id=historyMode?histId:curSess?.id) {
  const s=store.list().find(s=>s.id===id);
  if(s?.live&&s.sensorId&&s.metric===2) {
    const group=kind==='session'?s.shots:kind==='set'?sets(s.shots).find(g=>g.includes(cur))?.map(i=>s.shots[i]):[s.shots[cur]];
    if(!group?.length)return;
    const times=group.map(x=>x.t_ms);
    // borrado optimista: fuera ya en el movil; el eco del sensor reconcilia (removed[] ignora reenvios)
    s.removed=[...new Set([...(s.removed||[]),...times])];
    s.shots=s.shots.filter(x=>!times.includes(x.t_ms));
    saveSession(s);
    if(window.Native?.command){Native.command(JSON.stringify({sid:s.sensorId,action:'remove',value:times}));}
    notice(times.length>1?times.length+' flechas eliminadas':'Flecha eliminada');
    if(curSess?.id===s.id){data={shots:s.shots};cur=Math.max(0,Math.min(cur,Math.max(0,s.shots.length-1)));}
    render();return;
  }
  originalRemove(kind,id);
};
const originalRender=render;
render=function() {
  originalRender();const s=displayedSession(), shot=data?.shots[cur];
  const groups=s?sets(s.shots).filter(g=>!s.shots[g[0]].candidate):[], ordinal=groups.findIndex(g=>s.shots[g[0]].set_id===s.currentSet);
  const setNumber=ordinal>=0?ordinal+1:(s?.currentSet==null?Math.max(1,groups.length):groups.length+1);
  const goal=Training.roundGoal(s);
  $('trainingPanel').hidden=!!historyMode;
  if(s && goal){
    const n=s.roundDone?goal:Math.min(setNumber, goal);
    const arrows=s.shots.filter(x=>!x.candidate && x.set_id===(s.currentSet??1)).length;
    const pts=Score.totals(s.shots.filter(x=>!x.candidate));
    const fmt=Score.formatOf(s);
    const ptsTxt=pts.scored?(fmt?Score.scoreText(pts,s.shots,fmt):pts.score+' pts'):'';
    const head=s.paused?'Pausa · ':s.resting&&!s.roundDone?'Descanso · ':'';
    const tail=s.roundDone?ptsTxt:(arrows+(s.target?'/'+s.target:''));
    $('trainingStatus').textContent=`${head}${Training.roundLabel(s)} · ${n}/${goal}${tail?' · '+tail:''}`;
    if(view==='Session' && data?.shots?.length) $('sSets').textContent=`${n}/${goal}`;
  } else $('trainingStatus').textContent=s?`${s.mode?s.mode+' · ':''}${s.paused?'Pausa':s.resting?'Descanso':'Set '+setNumber} · ${s.shots.filter(x=>x.set_id===(s.currentSet??1)).length}${s.target?'/'+s.target:''}`:'Equipo';
  if(!historyMode && s?.calibrating)$('trainingStatus').textContent=`Calibración · ${s.calibrationCount||0}`;
  if(s&&s.mode==='Indoor'&&!['wa','vegas','lancaster'].includes(s.scoreFormat)&&!historyMode){s.scoreFormat='vegas';saveSession(s);}
  renderGear();
  const card=$('setGearCard');
  if(card){
    card.hidden=!shot;
    if(shot){
      const st=gearState(), bits=gearChips({bow:shot.bow||st.bow,arrows:shot.arrows||st.arrows},false);
      $('setGearChips').innerHTML=bits.length?bits.map(t=>`<span class="chip">${escapeText(t)}</span>`).join(''):'<span class="chip empty">Elige tu material</span>';
      $('setGearBtn').classList.toggle('ro',!!historyMode);
      $('setGearBtn').setAttribute('aria-label',bits.length?bits.join(', ')+'. Toca para cambiar':'Elegir equipación');
    }
  }
  if(shot) {
    $('setState').textContent=(s?.ends||[]).some(e=>e.id===shot.set_id)?'Cerrado':'Abierto';
    const group=sets(data.shots).find(g=>g.includes(cur));
    const select=$('compareShot');
    if(select){ const selected=select.value;
    select.innerHTML='<option value="">Ninguna</option>'+group.filter(i=>i!==cur).map(i=>`<option value="${i}">Flecha ${group.indexOf(i)+1}</option>`).join('');select.value=selected;
    $('comparison').textContent='';
    if(view==='Shot'&&anim==null&&select.value!=='') {
      const other=data.shots[+select.value], c=$('aim'), x=c.getContext('2d'), {pts,P}=proj(other,shot);
      x.strokeStyle=C.ref;x.lineWidth=1.5;x.setLineDash([4,4]);x.beginPath();pts.forEach((p,i)=>i?x.lineTo(...P(p)):x.moveTo(...P(p)));x.stroke();x.setLineDash([]);
      const delta=Number.isFinite(shot.aim_score)&&Number.isFinite(other.aim_score)?shot.aim_score-other.aim_score:null;
      $('comparison').textContent=delta==null?'':(delta>0?'+':'')+delta;
    }}
  }
  ['sAvg','sSd'].forEach(id=>{if($(''+id).textContent==='NaN')$(id).textContent='–';});
  maybeAskGear();
};
const PROFILE_LABELS={'Recurvo':'Arco recurvo','Compuesto':'Arco compuesto','Recurvo / arco':'Recurvo (brazo de arco)','Compuesto / arco':'Compuesto (brazo de arco)','Recurvo / cuerda':'Recurvo (brazo de cuerda)','Compuesto / cuerda':'Compuesto (brazo de cuerda)'};
const gearKey=(a,s)=>Training.key({bow:a.bow||s.bow,profile:a.profile||s.profile,metric:a.metric||s.metric});
const originalProgress=renderProgress;
renderProgress=function() {
  const L=store.list(), keys=[...new Set(L.flatMap(s=>s.shots.map(a=>gearKey(a,s))))], select=$('progressProfile'), old=select.value;
  const bases=keys.map(k=>k.replace(/ · v\d+$/,'')), label=(k,i)=>PROFILE_LABELS[k]||(bases.indexOf(bases[i])!==bases.lastIndexOf(bases[i])?k:PROFILE_LABELS[bases[i]]||bases[i]);
  select.innerHTML=keys.map((k,i)=>`<option value="${escapeText(k)}">${escapeText(label(k,i))}</option>`).join('');if(keys.includes(old))select.value=old;
  const filtered=L.map(s=>({...s,shots:s.shots.filter(a=>gearKey(a,s)===select.value)}));
  const week=filtered.filter(s=>s.id>=Date.now()-7*864e5).reduce((n,s)=>n+s.shots.filter(a=>!a.candidate).length,0), total=filtered.reduce((n,s)=>n+s.shots.filter(a=>!a.candidate).length,0);
  $('volume').textContent=`${week} flechas · 7 días · ${total} total`;
  const list=store.list;try {store.list=()=>filtered.map(s=>({...s,shots:s.shots.filter(a=>Number.isFinite(a.aim_score))}));originalProgress();}finally{store.list=list;}
};
