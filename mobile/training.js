// Equipo y calibracion del sensor desde el movil.
const $ = id => document.getElementById(id), escapeText = s => String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
document.head.insertAdjacentHTML('beforeend',`<style>
.training{display:grid;gap:10px;font-size:13px;color:var(--txt-2);line-height:1.5}
.training.card{padding:14px}
.training label{display:flex;align-items:center;justify-content:space-between;gap:10px;color:var(--txt);font-size:14px;font-weight:600}
.training b{color:var(--txt)}
#trainingPanel{background:var(--surface);border:1px solid var(--line);border-radius:16px;padding:14px 14px 4px}
#trainingStatus{font-size:15px;font-weight:600;color:var(--txt);margin-bottom:4px}
.picker+.picker{border-top:1px solid var(--line)}
.pickRow{display:flex;justify-content:space-between;align-items:center;width:100%;background:none;border:none;color:var(--txt-2);padding:12px 0;font-size:14px;min-height:48px}
.pickRow b{color:var(--txt);font-weight:500;display:flex;align-items:center;gap:6px}
.pickRow b::after{content:'';width:12px;height:12px;background:var(--txt-3);-webkit-mask:var(--i-caret) center/contain no-repeat;mask:var(--i-caret) center/contain no-repeat;transform:rotate(90deg)}
.sheet{display:flex;flex-direction:column;gap:6px;padding:0 0 12px}
.sheet[hidden]{display:none}
.sheet button{display:flex;justify-content:space-between;align-items:center;background:var(--surface-2);color:var(--txt);border:1px solid var(--line);border-radius:12px;padding:12px 14px;font-size:14px;min-height:46px;text-align:left}
.sheet button span{color:var(--txt-3);font-size:12.5px}
.sheet button.on{border-color:var(--acc-line);background:var(--acc-soft);color:var(--acc);font-weight:600}
#bowList,#arrowList{display:flex;flex-direction:column;gap:6px}
.gearRow{display:flex;gap:6px}.gearRow>[data-n]{flex:1;min-width:0}.sheet .deleteGear{flex:none;width:46px;justify-content:center;color:var(--danger)}.deleteGear svg{width:18px;height:18px}.sheet .deleteGear.confirm{width:auto;padding:0 14px;background:var(--danger);color:#fff;font-size:13px;font-weight:600}
.addItem{display:flex;gap:6px}
.addItem input{flex:1;min-width:0;background:var(--surface-2);color:var(--txt);border:1px solid var(--line-2);border-radius:12px;padding:10px 12px;min-height:44px}
.addItem input::placeholder{color:var(--txt-3)}
.addItem button{background:var(--acc-soft);color:var(--acc);border:1px solid var(--acc-line);border-radius:12px;padding:10px 16px;font-weight:600;min-height:44px}
#comparison:empty,#setState:empty,#volume:empty{display:none}
#notice{position:fixed;bottom:84px;left:16px;right:16px;z-index:20;padding:12px 14px;background:var(--surface-3);border:1px solid var(--line-2);color:var(--txt);border-radius:12px;font-size:13px;box-shadow:0 12px 30px rgba(0,0,0,.4)}
</style>`);
$('sessionHero').insertAdjacentHTML('afterend',`<section class="training" id="trainingPanel"><div id="trainingStatus">Equipo</div>
<div class="picker" id="modePicker">
<button class="pickRow" id="modeRow"><span>Modo</span><b id="modeVal">–</b></button>
<div class="sheet" id="modeSheet" hidden>
<button data-v="Indoor">Indoor<span>3 flechas</span></button>
<button data-v="Outdoor">Outdoor<span>6 flechas</span></button>
<button data-v="Libre">Libre<span>sin tope</span></button>
</div></div>
<div class="picker" id="formatPicker" hidden>
<button class="pickRow" id="formatRow"><span>Formato</span><b id="formatVal">Vegas</b></button>
<div class="sheet" id="formatSheet" hidden>
<button data-fmt="wa">World Archery<span>10, 9</span></button>
<button data-fmt="vegas">Vegas<span>X, 10, 9</span></button>
<button data-fmt="lancaster">Lancaster<span>11, 10, 9</span></button>
</div></div>
<div class="picker" id="bowPicker">
<button class="pickRow" id="bowRow"><span>Arco</span><b id="bowVal">–</b></button>
<div class="sheet" id="bowSheet" hidden><div id="bowList"></div>
<div class="addItem"><input id="bowName" placeholder="Nombre del arco" maxlength="24"><button id="bowAdd">Añadir</button></div></div>
</div>
<div class="picker" id="arrowPicker">
<button class="pickRow" id="arrowRow"><span>Flechas</span><b id="arrowVal">–</b></button>
<div class="sheet" id="arrowSheet" hidden><div id="arrowList"></div>
<div class="addItem"><input id="arrowName" placeholder="Nombre de las flechas" maxlength="24"><button id="arrowAdd">Añadir</button></div></div>
</div></section>`);
$('vSet').querySelector('.deleteAction').insertAdjacentHTML('beforebegin',`<section class="training"><div id="setState"></div></section>`);
$('vProgress').insertAdjacentHTML('afterbegin',`<section class="training card"><label>Equipo <select id="progressProfile" onchange="renderProgress()"></select></label><div id="volume"></div></section>`);
document.body.insertAdjacentHTML('beforeend','<div id="notice" role="status" hidden></div>');
const gear={get:()=>{try{const g=JSON.parse(localStorage.getItem('atGear'));return {bows:Array.isArray(g?.bows)?g.bows:[],arrows:Array.isArray(g?.arrows)?g.arrows:[]};}catch(e){return {bows:[],arrows:[]};}},
  save:g=>localStorage.setItem('atGear',JSON.stringify(g))};
function closeSheets(except){['modeSheet','formatSheet','bowSheet','arrowSheet'].forEach(id=>{const n=$(id);if(n)n.hidden=id!==except;});}
['modeRow','formatRow','bowRow','arrowRow'].forEach(id=>{const n=$(id);if(n)n.onclick=()=>{const sh=$(id.replace('Row','Sheet'));closeSheets(sh.hidden?sh.id:null);};});
function sendCmd(action,value){const s=displayedSession();if(s?.live&&s.sensorId&&window.Native?.command){const error=Native.command(JSON.stringify({sid:s.sensorId,action,value}));if(error)notice(error);}}
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
$('modeSheet').onclick=e=>{const b=e.target.closest('[data-v]');if(!b)return;const s=displayedSession();if(!s||historyMode)return;
  const mode=['Indoor','Outdoor','Libre'].includes(b.dataset.v)?b.dataset.v:'Libre', tanda=false;
  s.mode=mode;s.tanda=tanda;s.roundDone=Training.roundComplete(s);s.target=mode==='Indoor'?3:mode==='Outdoor'?6:0;
  if(mode==='Indoor' && !['wa','vegas','lancaster'].includes(s.scoreFormat)) s.scoreFormat='vegas';
  saveSession(s);sendCmd('mode',mode);closeSheets(null);render();};
$('formatSheet').onclick=e=>{const b=e.target.closest('[data-fmt]');if(!b)return;const s=displayedSession();if(!s||historyMode||s.mode!=='Indoor')return;
  s.scoreFormat=b.dataset.fmt;saveSession(s);closeSheets(null);render();};
function gearSheet(listId,sheetId,field,cmd){
  $(sheetId).onclick=e=>{const remove=e.target.closest('.deleteGear');if(remove){if(remove.dataset.deleteBow!=null)deleteBow(remove.dataset.deleteBow);else deleteArrow(remove.dataset.deleteArrow);return;}const b=e.target.closest('[data-n]');if(!b)return;const s=displayedSession();if(!s||historyMode)return;
    s[field]=b.dataset.n;saveSession(s);if(cmd)sendCmd(cmd,s[field]);closeSheets(null);render();};
}
function deleteBow(name){
  const g=gear.get();if(!g.bows.includes(name))return;
  const s=displayedSession(), error=window.Native?.command?.(JSON.stringify({sid:s?.sensorId||'',action:'deleteProfile',value:name}));
  if(error){notice('No se pudo eliminar el preset: '+error);return;}
  g.bows=g.bows.filter(n=>n!==name);gear.save(g);
  if(s?.live&&!historyMode&&(s.bow===name||s.profile===name)){s.bow=null;s.profile='Recurvo';saveSession(s);}
  if(calibrationState()?.profile===name)localStorage.removeItem('atCalibration');
  render();notice(error===undefined?'Preset eliminado del móvil':'Preset eliminado; borrado del sensor pendiente de sincronización');
}
function deleteArrow(name){
  const g=gear.get();if(!g.arrows.includes(name))return;
  g.arrows=g.arrows.filter(n=>n!==name);gear.save(g);
  const s=displayedSession();if(s&&!historyMode&&s.arrows===name){s.arrows=null;saveSession(s);}
  render();notice('Flechas eliminadas');
}
gearSheet('bowList','bowSheet','bow','profile');
gearSheet('arrowList','arrowSheet','arrows',null);
function addGear(inputId,btnId,listName,field){
  $(btnId).onclick=()=>{const n=$(inputId).value.trim();if(!n)return;
    const g=gear.get();if(!g[listName].includes(n)){g[listName].push(n);gear.save(g);}
    const s=displayedSession();if(s&&!historyMode){s[field]=n;saveSession(s);if(field==='bow')sendCmd('profile',n);}
    $(inputId).value='';render();};
}
addGear('bowName','bowAdd','bows','bow');
addGear('arrowName','arrowAdd','arrows','arrows');
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
  const L=store.list();let i=L.findIndex(s=>s.sensorId===e.sid);
  if(i<0) { const epoch=Number(e.sid.split('-')[0])*1000;L.push(Training.create(e,Number.isFinite(epoch)&&epoch>1e12?epoch:Math.max(Date.now(),...L.map(s=>s.id+1))));i=L.length-1; }
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
  ['modePicker','bowPicker','arrowPicker'].forEach(id=>$(id).hidden=historyMode);
  $('modeVal').textContent=s?.mode||'–';
  const indoor=!!(s&&s.mode==='Indoor');
  $('formatPicker').hidden=!indoor||!!historyMode;
  if(indoor){
    if(!historyMode && !['wa','vegas','lancaster'].includes(s.scoreFormat)){s.scoreFormat='vegas';saveSession(s);}
    const fmt=Score.formatOf(s);
    $('formatVal').textContent=Score.FORMATS[fmt]?.name||'Vegas';
    $('formatSheet').querySelectorAll('[data-fmt]').forEach(b=>b.classList.toggle('on',b.dataset.fmt===fmt));
  }
  $('bowVal').textContent=s?.bow||s?.profile||'–';
  $('arrowVal').textContent=s?.arrows||'–';
  const modeKey=s?.mode||'';
  $('modeSheet').querySelectorAll('[data-v]').forEach(b=>b.classList.toggle('on',b.dataset.v===modeKey));
  const g=gear.get();
  $('bowList').innerHTML=g.bows.map(n=>`<div class="gearRow"><button data-n="${escapeText(n)}"${n===(s?.bow||s?.profile)?' class="on"':''}>${escapeText(n)}<span>‹</span></button><button class="deleteGear" data-delete-bow="${escapeText(n)}" aria-label="Eliminar preset ${escapeText(n)}">${TRASH}</button></div>`).join('');
  $('arrowList').innerHTML=g.arrows.map(n=>`<div class="gearRow"><button data-n="${escapeText(n)}"${n===s?.arrows?' class="on"':''}>${escapeText(n)}<span>‹</span></button><button class="deleteGear" data-delete-arrow="${escapeText(n)}" aria-label="Eliminar flechas ${escapeText(n)}">${TRASH}</button></div>`).join('')||'';
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
};
const PROFILE_LABELS={'Recurvo':'Arco recurvo','Compuesto':'Arco compuesto','Recurvo / arco':'Recurvo (brazo de arco)','Compuesto / arco':'Compuesto (brazo de arco)','Recurvo / cuerda':'Recurvo (brazo de cuerda)','Compuesto / cuerda':'Compuesto (brazo de cuerda)'};
const originalProgress=renderProgress;
renderProgress=function() {
  const L=store.list(), keys=[...new Set(L.flatMap(s=>s.shots.map(a=>Training.key({profile:a.profile||s.profile,metric:a.metric||s.metric}))))], select=$('progressProfile'), old=select.value;
  const bases=keys.map(k=>k.replace(/ · v\d+$/,'')), label=(k,i)=>PROFILE_LABELS[k]||(bases.indexOf(bases[i])!==bases.lastIndexOf(bases[i])?k:PROFILE_LABELS[bases[i]]||bases[i]);
  select.innerHTML=keys.map((k,i)=>`<option value="${escapeText(k)}">${escapeText(label(k,i))}</option>`).join('');if(keys.includes(old))select.value=old;
  const filtered=L.map(s=>({...s,shots:s.shots.filter(a=>Training.key({profile:a.profile||s.profile,metric:a.metric||s.metric})===select.value)}));
  const week=filtered.filter(s=>s.id>=Date.now()-7*864e5).reduce((n,s)=>n+s.shots.filter(a=>!a.candidate).length,0), total=filtered.reduce((n,s)=>n+s.shots.filter(a=>!a.candidate).length,0);
  $('volume').textContent=`${week} flechas · 7 días · ${total} total`;
  const list=store.list;try {store.list=()=>filtered.map(s=>({...s,shots:s.shots.filter(a=>Number.isFinite(a.aim_score))}));originalProgress();}finally{store.list=list;}
};
