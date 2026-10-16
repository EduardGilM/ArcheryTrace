/* Medidas numéricas y categorías, sin nombres, identificadores ni trazas completas. */
const CoachTrace = typeof module !== 'undefined' ? require('./trace-geom.js') : Trace;
const Coach = {
  VERSION: 1,
  mean(a) { a=a.filter(Number.isFinite);return a.length?a.reduce((s,n)=>s+n,0)/a.length:null; },
  round(n) { return Number.isFinite(n)?Math.round(n*1000)/1000:null; },
  motion(s) {
    const x=s.yaw_c?.length?s.yaw_c:s.yaw_deg, y=s.pitch_deg, t=s.trace_t;
    if(!x || !y || !t || x.length!==y.length || x.length!==t.length)return null;
    const ref=CoachTrace.magRef(s), pts=[];
    for(let i=0;i<t.length;i++)if(t[i]>=-1000&&t[i]<=-100&&Number.isFinite(x[i])&&Number.isFinite(y[i])&&CoachTrace.trustAt(s,t[i],ref)>=.5)pts.push([t[i],x[i],y[i]]);
    if(pts.length<8 || pts.at(-1)[0]-pts[0][0]<600 || pts.some((p,i)=>i&&(p[0]<=pts[i-1][0]||p[0]-pts[i-1][0]>200)))return null;
    const ux=CoachTrace.unwrap(pts.map(p=>p[1])), py=pts.map(p=>p[2]);
    if(ux.some((v,i)=>i&&Math.abs(v-ux[i-1])>5)||py.some((v,i)=>i&&Math.abs(v-py[i-1])>5))return null;
    return this.round(Math.hypot(CoachTrace.sd(ux),CoachTrace.sd(py)));
  },
  rows(s) {
    const ends=new Map();
    return (s.shots||[]).filter(a=>a&&!a.candidate).map((a,i)=>{
      if(!ends.has(a.set_id))ends.set(a.set_id,ends.size+1);
      const p=a.result?.impact, value=a.result?.value, points=value==='X'?10:value==='M'?0:/^(6|7|8|9|10|11)$/.test(String(value))?+value:null;
      const impact=points!=null&&Number.isFinite(p?.x)&&Number.isFinite(p?.y)&&Math.hypot(p.x,p.y)<=1.041;
      return {id:i+1,end:ends.get(a.set_id),stability:!a.manual&&Number.isFinite(a.aim_score)&&a.aim_score>=0&&a.aim_score<=100?a.aim_score:null,
        hold_s:!a.manual&&Number.isFinite(a.draw_ms)&&a.draw_ms>=0&&a.draw_ms<=30000?this.round(a.draw_ms/1000):null,
        wobble_deg:a.manual?null:this.motion(a),points,x:impact?this.round(p.x):null,y:impact?this.round(p.y):null};
    });
  },
  prepare(session,history=[]) {
    const metric=s=>[...new Set((s.shots||[]).filter(a=>!a.candidate&&!a.manual).map(a=>a.metric||s.metric||1))].sort().join(','),
      same=s=>s.id<session.id&&(s.mode||'Libre')===(session.mode||'Libre')&&(s.scoreFormat||'vegas')===(session.scoreFormat||'vegas')&&
        (s.bow||s.profile||'')===(session.bow||session.profile||'')&&(s.arrows||'')===(session.arrows||'')&&metric(s)===metric(session);
    if(metric(session).includes(','))throw new Error('Esta sesión mezcla versiones de métricas; todavía no se pueden comparar de forma fiable.');
    const previous=history.filter(same).sort((a,b)=>b.id-a.id).slice(0,10), rows=previous.flatMap(s=>this.rows(s));
    const avg=key=>this.round(this.mean(rows.map(a=>a[key])));
    const counts=Object.fromEntries(['stability','hold_s','wobble_deg','points'].map(k=>[k+'_n',rows.filter(a=>a[k]!==null).length]));
    return {version:this.VERSION,mode:['Indoor','Outdoor'].includes(session.mode)?session.mode:'Libre',arrows:this.rows(session),
      baseline:{sessions:previous.length,n:rows.length,stability:avg('stability'),hold_s:avg('hold_s'),wobble_deg:avg('wobble_deg'),points:avg('points'),...counts}};
  },
  validInput(p,min=6) {
    const exact=(o,keys)=>o&&typeof o==='object'&&!Array.isArray(o)&&Object.keys(o).length===keys.length&&keys.every(k=>Object.hasOwn(o,k));
    const bounded=(n,lo,hi)=>n===null||(Number.isFinite(n)&&n>=lo&&n<=hi), count=(n,max)=>Number.isInteger(n)&&n>=0&&n<=max;
    const measures=o=>bounded(o.stability,0,100)&&bounded(o.hold_s,0,30)&&bounded(o.wobble_deg,0,360)&&bounded(o.points,0,11);
    return exact(p,['version','mode','arrows','baseline'])&&p.version===this.VERSION&&['Indoor','Outdoor','Libre'].includes(p.mode)&&
      Array.isArray(p.arrows)&&p.arrows.length>=min&&p.arrows.length<=600&&p.arrows.every((a,i)=>
        exact(a,['id','end','stability','hold_s','wobble_deg','points','x','y'])&&a.id===i+1&&count(a.end,600)&&a.end>0&&measures(a)&&bounded(a.x,-1.041,1.041)&&bounded(a.y,-1.041,1.041)&&
        ((a.x===null&&a.y===null)||(a.x!==null&&a.y!==null&&a.points!==null&&Math.hypot(a.x,a.y)<=1.043)))&&
      exact(p.baseline,['sessions','n','stability','hold_s','wobble_deg','points','stability_n','hold_s_n','wobble_deg_n','points_n'])&&count(p.baseline.sessions,10)&&count(p.baseline.n,100000)&&measures(p.baseline)&&
      ['stability','hold_s','wobble_deg','points'].every(k=>count(p.baseline[k+'_n'],p.baseline.n)&&((p.baseline[k]===null)===(p.baseline[k+'_n']===0)));
  },
  facts(p) {
    const out=[], add=(id,text,rows=[])=>out.push({id,text,arrows:rows.map(a=>a.id)}), fmt=n=>this.round(n), avg=(a,k)=>this.mean(a.map(x=>x[k]));
    const rows=p.arrows, aims=rows.filter(a=>a.stability!==null), holds=rows.filter(a=>a.hold_s!==null), hits=rows.filter(a=>a.x!==null), wobble=rows.filter(a=>a.wobble_deg!==null);
    add('sample',`${rows.length} flechas; ${aims.length} con estabilidad; ${holds.length} con sostenimiento; ${hits.length} con impacto; ${wobble.length} con movimiento medible.`);
    if(aims.length>=6)add('stability',`Estabilidad media ${fmt(avg(aims,'stability'))}/100.`,aims);
    if(holds.length>=6)add('hold',`Sostenimiento quieto medio ${fmt(avg(holds,'hold_s'))} s. No es el tiempo total del tiro.`,holds);
    if(hits.length>=6){
      const x=avg(hits,'x'),y=avg(hits,'y'),spread=this.mean(hits.map(a=>Math.hypot(a.x-x,a.y-y)));
      add('impacts',`Centro de ${hits.length} impactos: x=${fmt(x)}, y=${fmt(y)}; distancia media al centro del grupo ${fmt(spread)}. Coordenadas normalizadas: x positivo=derecha, y positivo=abajo; radio 1=anillo 6. No son centímetros.`,hits);
    }
    if(wobble.length>=6)add('motion',`Dispersión angular media ${fmt(avg(wobble,'wobble_deg'))}° entre 1000 y 100 ms antes de la suelta. El montaje no permite atribuir una dirección física al movimiento.`,wobble);
    const high=rows.filter(a=>a.points>=10),low=rows.filter(a=>a.points!==null&&a.points<10);
    if(high.length>=6&&low.length>=6)for(const k of ['stability','hold_s','wobble_deg']){
      const a=high.filter(r=>r[k]!==null), b=low.filter(r=>r[k]!==null);
      if(a.length>=6&&b.length>=6)add('score_'+k,`${k}: media ${fmt(avg(a,k))} en ${a.length} flechas de 10/11/X; ${fmt(avg(b,k))} en ${b.length} flechas de menor puntuación. Es una asociación, no una causa.`,[...a,...b]);
    }
    const n=Math.floor(rows.length/3), first=rows.slice(0,n),last=rows.slice(-n);
    if(n>=6)for(const k of ['stability','points','wobble_deg']){
      const a=first.filter(r=>r[k]!==null),b=last.filter(r=>r[k]!==null);
      if(a.length>=6&&b.length>=6)add('progress_'+k,`${k}: primer tercio ${fmt(avg(a,k))} (${a.length} flechas); último tercio ${fmt(avg(b,k))} (${b.length} flechas). No demuestra fatiga.`,[...a,...b]);
    }
    if(p.baseline.sessions>=2&&p.baseline.n>=12)for(const k of ['stability','hold_s','wobble_deg','points']){
      const a=rows.filter(r=>r[k]!==null);
      if(a.length>=6&&p.baseline[k+'_n']>=12)add('history_'+k,`${k}: hoy ${fmt(avg(a,k))} (${a.length} flechas); historial ${p.baseline[k]} (${p.baseline[k+'_n']} flechas con esta medida en ${p.baseline.sessions} sesiones comparables).`,a);
    }
    return out;
  },
  schema(facts) {
    const text=maxLength=>({type:'string',minLength:1,maxLength}), object=properties=>({type:'object',properties,required:Object.keys(properties),additionalProperties:false});
    return object({summary:text(600),findings:{type:'array',minItems:1,maxItems:3,items:object({title:text(100),observation:text(500),hypothesis:text(350),action:text(350),fact_ids:{type:'array',minItems:1,maxItems:6,items:{type:'string',enum:facts.map(f=>f.id)}}})},next_session:text(500)});
  },
  validReport(report,facts) {
    if(!Array.isArray(facts)||facts.length>32||facts.some(f=>!f||typeof f.id!=='string'||!/^\w{1,40}$/.test(f.id)||typeof f.text!=='string'||f.text.length>1000||!Array.isArray(f.arrows)||f.arrows.length>600||f.arrows.some(n=>!Number.isInteger(n)||n<1||n>600)))return false;
    const check=(v,s)=>{
      if(s.type==='string')return typeof v==='string'&&v.trim().length>0&&(!s.maxLength||v.length<=s.maxLength)&&(!s.enum||s.enum.includes(v));
      if(s.type==='array')return Array.isArray(v)&&v.length>=s.minItems&&v.length<=s.maxItems&&v.every(x=>check(x,s.items));
      return v&&typeof v==='object'&&!Array.isArray(v)&&Object.keys(v).length===s.required.length&&s.required.every(k=>check(v[k],s.properties[k]));
    };
    return !!check(report,this.schema(facts));
  },
  day(id=Date.now()) { const d=new Date(id);return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-'); },
  context(sessions,current,selected) {
    const all=[...sessions];if(current&&!all.some(s=>s.id===current.id))all.push(current);
    const groups=new Map(),summary=s=>{
      const versions=[...new Set(s.shots.filter(a=>!a.candidate&&!a.manual).map(a=>a.metric||s.metric||1))].sort().join(','),mixed=versions.includes(',');
      const key=JSON.stringify([s.mode,s.bow||s.profile,s.arrows,s.scoreFormat||'vegas',versions]);if(!groups.has(key))groups.set(key,groups.size+1);
      const rows=this.rows(s).map(a=>mixed?{...a,stability:null,hold_s:null,wobble_deg:null}:a),hits=rows.filter(a=>a.x!==null),x=this.mean(hits.map(a=>a.x)),y=this.mean(hits.map(a=>a.y));
      const stats={n:rows.length};for(const k of ['stability','hold_s','wobble_deg','points']){const a=rows.filter(a=>a[k]!==null);stats[k]=this.round(this.mean(a.map(a=>a[k])));stats[k+'_n']=a.length;}
      Object.assign(stats,{x:this.round(x),y:this.round(y),spread:this.round(this.mean(hits.map(a=>Math.hypot(a.x-x,a.y-y)))),impacts_n:hits.length});
      return {day:this.day(s.id),time:new Date(s.id).toTimeString().slice(0,5),mode:['Indoor','Outdoor'].includes(s.mode)?s.mode:'Libre',group:mixed?0:groups.get(key),current:s.id===current?.id,stats};
    };
    let chosen=null;if(selected){chosen=summary(selected);let input=null;try{input=this.prepare(selected,all);if(!this.validInput(input,0))input=null;}catch{}chosen={...chosen,input};}
    const usable=all.filter(s=>s.shots.some(a=>!a.candidate));return {today:this.day(),total:usable.length,selected:chosen,history:usable.sort((a,b)=>b.id-a.id).slice(0,30).map(summary)};
  },
  validChat(p) {
    const exact=(o,keys)=>o&&typeof o==='object'&&!Array.isArray(o)&&Object.keys(o).length===keys.length&&keys.every(k=>Object.hasOwn(o,k));
    const text=(s,n)=>typeof s==='string'&&s.trim().length>0&&s.length<=n,count=(n,max=100000)=>Number.isInteger(n)&&n>=0&&n<=max;
    const bounded=(n,lo,hi)=>n===null||(Number.isFinite(n)&&n>=lo&&n<=hi),day=s=>typeof s==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(s);
    const summary=s=>{
      if(!exact(s,['day','time','mode','group','current','stats'])||!day(s.day)||!/^([01]\d|2[0-3]):[0-5]\d$/.test(s.time)||!['Indoor','Outdoor','Libre'].includes(s.mode)||!count(s.group,100000)||typeof s.current!=='boolean')return false;
      const a=s.stats,keys=['stability','hold_s','wobble_deg','points'];
      return exact(a,['n',...keys.flatMap(k=>[k,k+'_n']),'x','y','spread','impacts_n'])&&count(a.n)&&bounded(a.stability,0,100)&&bounded(a.hold_s,0,30)&&bounded(a.wobble_deg,0,360)&&bounded(a.points,0,11)&&
        keys.every(k=>count(a[k+'_n'],a.n)&&((a[k]===null)===(a[k+'_n']===0)))&&count(a.impacts_n,a.n)&&bounded(a.x,-1.041,1.041)&&bounded(a.y,-1.041,1.041)&&bounded(a.spread,0,2.1)&&[a.x,a.y,a.spread].every(v=>(v===null)===(a.impacts_n===0));
    };
    if(!exact(p,['version','question','messages','context'])||p.version!==this.VERSION||!text(p.question,2000)||!Array.isArray(p.messages)||p.messages.length>12||p.messages.some(m=>!exact(m,['role','content'])||!['user','assistant'].includes(m.role)||!text(m.content,m.role==='user'?2000:6000))||p.messages.reduce((n,m)=>n+m.content.length,0)>24000)return false;
    const c=p.context;if(!exact(c,['today','total','selected','history'])||!day(c.today)||!count(c.total)||!Array.isArray(c.history)||c.history.length>30||!c.history.every(summary))return false;
    if(c.selected!==null){if(!exact(c.selected,['day','time','mode','group','current','stats','input']))return false;const {input,...s}=c.selected;if(!summary(s)||(input!==null&&!this.validInput(input,0)))return false;}
    return true;
  },
  // Huella local para invalidar informes al corregir impactos o cambiar el historial.
  key(p) { let a=2166136261,b=5381;for(const c of JSON.stringify(p)){a=Math.imul(a^c.charCodeAt(0),16777619);b=Math.imul(b,33)^c.charCodeAt(0);}return `${this.VERSION}:${a>>>0}:${b>>>0}`; }
};
if(typeof module!=='undefined')module.exports=Coach;
