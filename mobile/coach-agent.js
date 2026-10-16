const AgentCoach=typeof module!=='undefined'?require('./coach.js'):Coach;
const CoachAgent={
  VERSION:2,MAX_BYTES:4000000,
  scalars:['peak_mg','instab_mg','settle_ms','hr_bpm','rmssd','aim_sd_deg','aim_dx_deg','aim_dy_deg','dt','rate','metric'],
  signals:['yaw_c','yaw_deg','pitch_deg','tilt_x','tilt_y','pos_x','pos_y','pos_z','posp_x','posp_y','posp_z','traj_x','traj_y','mag_b','post_yaw','post_pitch','trace_t','post_t','window.pre','window.mag_pre','window.post','window.mag_post'],
  columns() {return ['id','end','stability','hold_s','wobble_deg','points','x','y','elapsed_s','manual',...this.scalars,...this.signals.flatMap(k=>['n','mean','sd','min','max'].map(s=>k+'.'+s))];},
  local(sessions,current) {const a=[...sessions];if(current&&!a.some(s=>s.id===current.id))a.push({...current,shots:current.shots.slice()});return a.filter(s=>s.id===current?.id||s.shots.some(a=>a&&!a.candidate)).sort((a,b)=>a.id-b.id);},
  catalog(sessions,current) {
    const groups=new Map(),today=AgentCoach.day();return {today,sessions:this.local(sessions,current).map((s,i)=>{
      const versions=[...new Set(s.shots.filter(a=>a&&!a.candidate&&!a.manual).map(a=>a.metric||s.metric||1))].sort().join(','),key=JSON.stringify([s.mode,s.bow||s.profile,s.arrows,s.scoreFormat||'vegas',versions]);if(!groups.has(key))groups.set(key,groups.size+1);
      const day=AgentCoach.day(s.id);return {id:i+1,day,time:new Date(s.id).toTimeString().slice(0,5),ago:Math.round((Date.parse(today)-Date.parse(day))/864e5),current:s.id===current?.id,arrows:s.shots.filter(a=>a&&!a.candidate).length,mode:['Indoor','Outdoor'].includes(s.mode)?s.mode:'Libre',group:versions.includes(',')?0:groups.get(key)};
    })};
  },
  schema() {const properties={scope:{type:'string',enum:['refuse','general','all','current','latest','dates','sessions','previous']},start:{type:'string'},end:{type:'string'},ids:{type:'array',items:{type:'integer'},maxItems:100000},count:{type:'integer',minimum:1,maximum:100000},detail:{type:'boolean'}};return {type:'object',properties,required:Object.keys(properties),additionalProperties:false};},
  exact(o,keys) {return o&&typeof o==='object'&&!Array.isArray(o)&&Object.keys(o).length===keys.length&&keys.every(k=>Object.hasOwn(o,k));},
  day(s) {return typeof s==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(s)&&Number.isFinite(Date.parse(s))&&new Date(s+'T00:00:00Z').toISOString().slice(0,10)===s;},
  validPlan(p,catalog) {return this.exact(p,['scope','start','end','ids','count','detail'])&&this.schema().properties.scope.enum.includes(p.scope)&&typeof p.detail==='boolean'&&typeof p.start==='string'&&typeof p.end==='string'&&p.start.length<=10&&p.end.length<=10&&Number.isInteger(p.count)&&p.count>=1&&p.count<=100000&&Array.isArray(p.ids)&&p.ids.length<=100000&&new Set(p.ids).size===p.ids.length&&p.ids.every(id=>catalog.sessions.some(s=>s.id===id))&&(p.scope!=='dates'||(this.day(p.start)&&this.day(p.end)&&p.start<=p.end));},
  resolvePlan(p,question,catalog) {
    if(p.scope==='refuse')return p;const q=question.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase(),records=/\b(sesion|sesiones|tiros|flechas|entrenamiento|entrenamientos)\b/.test(q),analysis=/\b(analiza|analizame|analisis|analice|analices|revisa|revisame|evalua|evaluame|dime cosas)\b/.test(q);
    if(records&&analysis&&/\bhoy\b/.test(q)&&!/\b(compara|comparar|comparame|ayer|anteayer|semana|mes|historial|hora|horas)\b|\d{1,2}[:h]|a las \d/.test(q))return {...p,scope:'dates',start:catalog.today,end:catalog.today,ids:[],count:1};
    if(records&&analysis&&!/\b(hoy|ayer|anteayer|actual|ultima|ultimas|ultimo|ultimos|esa|esas|ese|esos|lunes|martes|miercoles|jueves|viernes|sabado|domingo)\b|\d/.test(q))return {...p,scope:'all',start:'',end:'',ids:[],count:1};
    return p;
  },
  select(plan,catalog,previous=[]) {return catalog.sessions.filter((s,i,a)=>plan.scope==='all'||plan.scope==='current'&&s.current||plan.scope==='latest'&&i>=a.length-plan.count||plan.scope==='dates'&&s.day>=plan.start&&s.day<=plan.end||plan.scope==='sessions'&&plan.ids.includes(s.id)||plan.scope==='previous'&&previous.includes(s.id)).map(s=>s.id);},
  signal(a,angular=false) {
    if(!Array.isArray(a))return [0,null,null,null,null];let v=a.filter(n=>Number.isFinite(n)&&Math.abs(n)<=1e12);if(angular)v=AgentCoachTrace.unwrap(v);
    if(!v.length)return [0,null,null,null,null];const mean=AgentCoach.mean(v);let min=Infinity,max=-Infinity,sum=0;for(const n of v){min=Math.min(min,n);max=Math.max(max,n);sum+=(n-mean)**2;}return [v.length,...[mean,Math.sqrt(sum/v.length),min,max].map(n=>AgentCoach.round(n))];
  },
  data(sessions,current,plan,catalog,previous=[]) {
    const all=this.local(sessions,current),ids=this.select(plan,catalog,previous),sessionsData=ids.map(id=>{
      const s=all[id-1],shots=s.shots.filter(a=>a&&!a.candidate),rows=AgentCoach.rows(s),first=shots.find(a=>Number.isFinite(a.t_ms))?.t_ms;
      return {id,rows:rows.map((a,i)=>{
        const shot=shots[i],num=n=>Number.isFinite(n)&&Math.abs(n)<=1e12?AgentCoach.round(n):null;
        if(catalog.sessions[id-1].group===0){a.stability=null;a.hold_s=null;a.wobble_deg=null;}
        return [...['id','end','stability','hold_s','wobble_deg','points','x','y'].map(k=>a[k]),num((shot.t_ms-first)/1000),shot.manual?1:0,...this.scalars.map(k=>shot.manual?null:num(shot[k])),...this.signals.flatMap(k=>this.signal(shot.manual?null:k.split('.').reduce((o,k)=>o?.[k],shot),/yaw/.test(k)))];
      })};
    });const names=this.columns(),columns=names.map((_,i)=>i).filter(i=>i<8||sessionsData.some(s=>s.rows.some(r=>r[i]!==null&&(!names[i].endsWith('.n')||r[i]!==0))));
    return {columns,sessions:sessionsData.map(s=>({...s,rows:s.rows.map(r=>columns.map(i=>r[i]))}))};
  },
  validPacket(p) {
    if(!this.exact(p,['version','stage','question','messages','catalog','previous','plan','data'])||p.version!==this.VERSION||!['plan','answer'].includes(p.stage)||typeof p.question!=='string'||!p.question.trim()||p.question.length>2000||!Array.isArray(p.messages)||p.messages.length>12||p.messages.some(m=>!this.exact(m,['role','content'])||!['user','assistant'].includes(m.role)||typeof m.content!=='string'||!m.content.trim()||m.content.length>(m.role==='user'?2000:6000))||p.messages.reduce((n,m)=>n+m.content.length,0)>24000)return false;
    const c=p.catalog;if(!this.exact(c,['today','sessions'])||!this.day(c.today)||!Array.isArray(c.sessions)||c.sessions.length>100000||c.sessions.some((s,i)=>!this.exact(s,['id','day','time','ago','current','arrows','mode','group'])||s.id!==i+1||!this.day(s.day)||!/^([01]\d|2[0-3]):[0-5]\d$/.test(s.time)||!Number.isInteger(s.ago)||Math.abs(s.ago)>100000||typeof s.current!=='boolean'||!Number.isInteger(s.arrows)||s.arrows<0||s.arrows>1000000||!['Indoor','Outdoor','Libre'].includes(s.mode)||!Number.isInteger(s.group)||s.group<0||s.group>100000)||!Array.isArray(p.previous)||p.previous.some(id=>!c.sessions.some(s=>s.id===id)))return false;
    if(p.stage==='plan')return p.plan===null&&p.data===null;
    if(!this.validPlan(p.plan,c)||['refuse'].includes(p.plan.scope)||!this.exact(p.data,['columns','sessions'])||!Array.isArray(p.data.sessions)||!Array.isArray(p.data.columns)||p.data.columns.length<8||p.data.columns.some((k,i)=>!Number.isInteger(k)||k<0||k>=this.columns().length||(i<8?k!==i:k<=p.data.columns[i-1])))return false;
    const ids=this.select(p.plan,c,p.previous),n=p.data.columns.length;return p.data.sessions.length===ids.length&&p.data.sessions.every((s,i)=>this.exact(s,['id','rows'])&&s.id===ids[i]&&Array.isArray(s.rows)&&s.rows.length===c.sessions[s.id-1].arrows&&s.rows.every((r,j)=>Array.isArray(r)&&r.length===n&&r[0]===j+1&&Number.isInteger(r[1])&&r[1]>0&&r.every(v=>v===null||(Number.isFinite(v)&&Math.abs(v)<=1e12))));
  },
  context(packet) {
    const names=this.columns(),columns=packet.data.columns.map(i=>names[i]),c=packet.catalog;
    const statsFor=rows=>Object.fromEntries(columns.flatMap((key,i)=>packet.data.columns[i]>=2?[[key,this.signal(rows.map(r=>r[i]).filter(Number.isFinite))]]:[]));
    const sessions=packet.data.sessions.map(s=>{
      const meta=c.sessions[s.id-1],rows=s.rows.map(r=>Object.fromEntries(columns.slice(0,8).map((k,i)=>[k,r[i]]))),n=Math.floor(rows.length/3),facts=[];
      // Procesa todas las flechas; cada tramo conserva sus índices originales en la tabla completa.
      if(packet.plan.detail||packet.data.sessions.length<=3)for(let i=0;i<rows.length;i+=600){const part=rows.slice(i,i+600).map((a,j)=>({...a,id:j+1}));facts.push(...AgentCoach.facts({arrows:part,baseline:{sessions:0,n:0}}).map(f=>({id:'bloque_'+(i/600+1)+'_'+f.id,text:f.text})));}
      const stats=statsFor(s.rows);
      const third=a=>({n:a.length,...Object.fromEntries(['stability','hold_s','wobble_deg','points'].map(k=>[k,this.signal(a.map(r=>r[k]).filter(Number.isFinite))]))});
      const measured=s.rows.filter(r=>r[2]!==null).slice().sort((a,b)=>a[2]-b[2]),examples=[...new Set([...measured.slice(0,3),...measured.slice(-3)])].map(r=>r.slice(0,8));
      return {...meta,stats,facts,...packet.plan.detail?{rows:s.rows}:{examples},thirds:n?{first:third(rows.slice(0,n)),last:third(rows.slice(-n))}:null};
    });return {today:c.today,scope:packet.plan.scope,columns,example_columns:columns.slice(0,8),sessions,total_arrows:sessions.reduce((n,s)=>n+s.arrows,0),groups:[...new Set(sessions.map(s=>s.group))].map(group=>{const a=packet.data.sessions.filter(s=>c.sessions[s.id-1].group===group),rows=a.flatMap(s=>s.rows);return {group,sessions:a.length,arrows:rows.length,stats:statsFor(rows)};})};
  }
};
const AgentCoachTrace=typeof module!=='undefined'?require('./trace-geom.js'):Trace;
if(typeof module!=='undefined')module.exports=CoachAgent;
