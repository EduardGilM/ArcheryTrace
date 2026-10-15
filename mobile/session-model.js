/* Protocolo v2: eventos ordenados, tandas explícitas y métricas versionadas. */
const Training = {
  create(e, id = Date.now()) { return {id, sensorId:e.sid, live:true, shots:[], ends:[], removed:[], lastEvent:-1, target:3, profile:'Recurvo · arco', metric:2}; },
  apply(original, e) {
    const s = JSON.parse(JSON.stringify(original));
    if (Number.isFinite(e.eid) && e.eid <= (s.lastEvent ?? -1)) return s;
    s.ends ||= []; s.removed ||= [];
    if (e.kind === 'shot' && !s.removed.includes(Math.round(e.t)) && !s.shots.some(x=>x.t_ms===Math.round(e.t))) {
      const a = v => Array.isArray(v) ? v.filter(Number.isFinite) : [];
      const pre=a(e.mp),post=a(e.mq);
      const dt = Number.isFinite(e.dt) && e.dt > 0 ? e.dt : 50;
      s.shots.push({t_ms:Math.round(e.t),set_id:e.set,manual:!!e.manual,candidate:!!e.candidate,pose:a(e.pose),metric:e.metric||2,profile:e.profile||s.profile,
        aim_score:e.manual||e.candidate ? null : Math.round(e.score),peak_mg:e.manual ? null : e.peak,instab_mg:e.manual ? null : e.instab,
        settle_ms:e.settle >= 0 ? Math.round(e.settle) : null,hr_bpm:e.hr>0?e.hr:null,tilt_x:a(e.tx),tilt_y:a(e.ty),yaw_deg:a(e.yw),yaw_c:a(e.yw2),pitch_deg:a(e.pt),mag_b:a(e.bm),pos_x:a(e.qx),pos_y:a(e.qy),pos_z:a(e.qz),posp_x:a(e.qx2),posp_y:a(e.qy2),posp_z:a(e.qz2),post_yaw:a(e.pyw),post_pitch:a(e.ppt),draw_ms:e.drawms>=0?Math.round(e.drawms):null,rmssd:Number.isFinite(e.rmssd)?e.rmssd:null,traj_x:a(e.px),traj_y:a(e.py),dt,trace_t:a(e.trace_t),post_t:a(e.post_t),clock:e.clock||"estimated",rate:e.rate||null,
        window:{pre:a(e.pre_t).length===pre.length?a(e.pre_t):pre.map((_,i)=>(i-pre.length)*dt),mag_pre:pre,post:a(e.post_t).length===post.length?a(e.post_t):post.map((_,i)=>(i+1)*dt),mag_post:post}});
      s.shots.sort((a,b)=>a.t_ms-b.t_ms);
    }
    if (e.kind === 'remove') {
      const times = e.times || [e.t]; s.removed = [...new Set([...s.removed,...times])];
      s.shots = s.shots.filter(x=>!times.includes(x.t_ms));
    }
    if (e.kind === 'layout') { const layout=new Map(e.layout);s.shots.forEach(x=>{if(layout.has(x.t_ms))x.set_id=layout.get(x.t_ms);}); }
    if (e.kind === 'end') { s.live=false; s.finished=true; }
    if (e.kind === 'label') { s.labels ||= []; s.labels.push({from_ms:e.from,t_ms:e.t,label:e.label,peak:e.peak}); }
    if (e.kind === 'calibration') { s.calibration=e.result; }
    if (e.kind === 'start') { s.build=e.build||null; if(e.recovery)s.recovery=e.recovery; }
    if (e.state) {
      const kept = new Map(s.shots.filter(x => x && x.result).map(x => [x.t_ms, x.result]));
      const keptPhase = new Map(s.shots.filter(x => x && (x.phase === 'warm' || x.phase === 'score')).map(x => [x.t_ms, x.phase]));
      const phoneTanda = !!s.tanda;
      const state = {...e.state};
      delete state.tanda; delete state.roundDone;
      Object.assign(s, state);
      s.tanda = phoneTanda;
      // Un estado tardío puede traer los tiros sin el valor anotado en el móvil.
      if (Array.isArray(e.state.shots) && Array.isArray(s.shots)) s.shots.forEach(x => {
        const prev = x && kept.get(x.t_ms);
        if (prev) x.result = {...prev, ...(x.result || {})};
        const phase = x && keptPhase.get(x.t_ms);
        if (phase) x.phase = phase;
      });
    }
    if (s.finished) s.live=false;
    s.roundDone = this.roundComplete(s);
    s.lastEvent=e.eid ?? s.lastEvent; s.lastWt=Date.now();
    return s;
  },
  close(s, id, reason='manual') { s.ends ||= []; if (!s.ends.some(e=>e.id===id)) s.ends.push({id,reason}); },
  reopen(s, id) { s.ends=(s.ends||[]).filter(e=>e.id!==id); },
  split(s, t) { const i=s.shots.findIndex(x=>x.t_ms===t); if(i<0)return; const old=s.shots[i].set_id; s.shots.slice(i).forEach(x=>{if(x.set_id===old)x.set_id=t;}); },
  merge(s, id) { const i=s.shots.findIndex(x=>x.set_id===id); if(i<=0)return; const previous=s.shots[i-1].set_id; s.shots.forEach(x=>{if(x.set_id===id)x.set_id=previous;}); s.ends=(s.ends||[]).filter(e=>e.id!==id); },
  key(s) { return (s.profile||'Sin equipo')+' · v'+(s.metric||1); },
  roundGoal(s) {
    if (!s || !s.tanda) return 0;
    if (s.mode === 'Indoor') return 10;
    if (s.mode === 'Outdoor') return 6;
    return 0;
  },
  roundLabel(s) {
    if (!s || !s.tanda) return s?.mode || '';
    if (s.mode === 'Outdoor') return 'Tanda aire libre';
    if (s.mode === 'Indoor') return 'Tanda indoor';
    return 'Tanda';
  },
  roundComplete(s) {
    const goal = this.roundGoal(s);
    if (!goal) return false;
    const ids = [];
    for (const shot of s.shots || []) {
      if (!shot || shot.candidate || !(shot.set_id > 0) || ids.includes(shot.set_id)) continue;
      ids.push(shot.set_id);
    }
    const closed = new Set((s.ends || []).map(e => e && e.id));
    return ids.filter(id => closed.has(id)).length >= goal;
  },
  summary(shots) {
    const score=shots.map(s=>s.aim_score).filter(Number.isFinite), gaps=shots.slice(1).flatMap((s,i)=>s.set_id===shots[i].set_id?[(s.t_ms-shots[i].t_ms)/1000]:[]);
    const median=a=>{a=[...a].sort((a,b)=>a-b);return a.length?(a[Math.floor((a.length-1)/2)]+a[Math.floor(a.length/2)])/2:null;};
    const mean=score.length?score.reduce((a,b)=>a+b,0)/score.length:0;
    return {n:shots.length,score:median(score),rhythm:median(gaps),recovery:median(shots.map(s=>s.settle_ms).filter(Number.isFinite)),spread:score.length?Math.sqrt(score.reduce((v,x)=>v+(x-mean)**2,0)/score.length):null};
  }
};
if (typeof module !== 'undefined') module.exports=Training;
