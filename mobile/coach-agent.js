const AgentCoach=typeof module!=='undefined'?require('./coach.js'):Coach;
const CoachAgent={
  VERSION:3,MAX_BYTES:4000000,
  PLAN_TOKENS:5000,ANSWER_TOKENS:10000,MAX_ANSWER_CHARS:100000,MAX_PROVIDER_BYTES:2000000,
  REQUEST_TIMEOUT_MS:300000,UI_TIMEOUT_MS:360000,
  scalars:['peak_mg','instab_mg','settle_ms','hr_bpm','rmssd','aim_sd_deg','aim_dx_deg','aim_dy_deg','dt','rate','metric'],
  signals:['yaw_c','yaw_deg','pitch_deg','tilt_x','tilt_y','pos_x','pos_y','pos_z','posp_x','posp_y','posp_z','traj_x','traj_y','mag_b','post_yaw','post_pitch','trace_t','post_t','window.pre','window.mag_pre','window.post','window.mag_post'],
  columns() {return ['id','end','stability','hold_s','wobble_deg','points','x','y','elapsed_s','manual',...this.scalars,...this.signals.flatMap(k=>['n','mean','sd','min','max'].map(s=>k+'.'+s))];},
  overviewKeys:['stability','hold_s','wobble_deg','points','x','y','peak_mg','instab_mg','settle_ms'],
  overview(session,mixed=false) {
    const shots=session.shots.filter(s=>s&&!s.candidate),rows=AgentCoach.rows(session).map((r,i)=>({...r,...Object.fromEntries(['peak_mg','instab_mg','settle_ms'].map(k=>[k,shots[i].manual?null:shots[i][k]])),...mixed?{stability:null,hold_s:null,wobble_deg:null}:{}}));
    const statsFor=(a,keys)=>Object.fromEntries(keys.map(k=>[k,this.signal(a.map(r=>r[k]))]));
    const n=Math.floor(rows.length/3),ends=[];rows.forEach(r=>{ends[r.end-1]=(ends[r.end-1]||0)+1;});
    const measured=rows.filter(r=>Number.isFinite(r.stability)).slice().sort((a,b)=>a.stability-b.stability);
    const examples=[...new Set([...measured.slice(0,3),...measured.slice(-3)])].map(r=>['id','end','stability','hold_s','wobble_deg','points','x','y'].map(k=>r[k]));
    return {stats:statsFor(rows,this.overviewKeys),ends,manual:shots.filter(s=>s.manual).length,thirds:n?{first:statsFor(rows.slice(0,n),this.overviewKeys.slice(0,4)),last:statsFor(rows.slice(-n),this.overviewKeys.slice(0,4))}:null,examples};
  },
  local(sessions,current) {const a=[...sessions];if(current&&!a.some(s=>s.id===current.id))a.push({...current,shots:current.shots.slice()});return a.filter(s=>s.id===current?.id||s.shots.some(a=>a&&!a.candidate)).sort((a,b)=>a.id-b.id);},
  catalog(sessions,current) {
    const groups=new Map(),today=AgentCoach.day();return {today,sessions:this.local(sessions,current).map((s,i)=>{
      const versions=[...new Set(s.shots.filter(a=>a&&!a.candidate&&!a.manual).map(a=>a.metric||s.metric||1))].sort().join(','),key=JSON.stringify([s.mode,s.bow||s.profile,s.arrows,s.scoreFormat||'vegas',versions]);if(!groups.has(key))groups.set(key,groups.size+1);
      const day=AgentCoach.day(s.id),mixed=versions.includes(',');return {id:i+1,day,time:new Date(s.id).toTimeString().slice(0,5),ago:Math.round((Date.parse(today)-Date.parse(day))/864e5),current:s.id===current?.id,arrows:s.shots.filter(a=>a&&!a.candidate).length,mode:['Indoor','Outdoor'].includes(s.mode)?s.mode:'Libre',group:mixed?0:groups.get(key),overview:this.overview(s,mixed)};
    })};
  },
  schema(withReads=false) {
    const properties={scope:{type:'string',enum:['refuse','general','all','current','latest','dates','sessions','previous']},start:{type:'string'},end:{type:'string'},ids:{type:'array',items:{type:'integer'},maxItems:100000},count:{type:'integer',minimum:1,maximum:100000},detail:{type:'boolean'}};
    if(withReads){const ints={type:'array',items:{type:'integer',minimum:1},uniqueItems:true};properties.reads={type:'array',maxItems:8,items:{type:'object',properties:{session:{type:'integer',minimum:1},ends:ints,arrows:{...ints,maxItems:12},trace:{type:'boolean'},fields:{type:'string',enum:['metrics','signals']}},required:['session','ends','arrows','trace','fields'],additionalProperties:false}};}
    return {type:'object',properties,required:Object.keys(properties),additionalProperties:false};
  },
  exact(o,keys) {return o&&typeof o==='object'&&!Array.isArray(o)&&Object.keys(o).length===keys.length&&keys.every(k=>Object.hasOwn(o,k));},
  day(s) {return typeof s==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(s)&&Number.isFinite(Date.parse(s))&&new Date(s+'T00:00:00Z').toISOString().slice(0,10)===s;},
  validPlan(p,catalog) {
    if(!this.exact(p,['scope','start','end','ids','count','detail',...p&&Object.hasOwn(p,'reads')?['reads']:[]])||!this.schema().properties.scope.enum.includes(p.scope)||typeof p.detail!=='boolean'||typeof p.start!=='string'||typeof p.end!=='string'||p.start.length>10||p.end.length>10||!Number.isInteger(p.count)||p.count<1||p.count>100000||!Array.isArray(p.ids)||p.ids.length>100000||new Set(p.ids).size!==p.ids.length||!p.ids.every(id=>catalog.sessions.some(s=>s.id===id))||(p.scope==='dates'&&(!this.day(p.start)||!this.day(p.end)||p.start>p.end)))return false;
    if(!Object.hasOwn(p,'reads'))return true;
    return Array.isArray(p.reads)&&p.reads.length<=8&&new Set(p.reads.map(r=>r?.session)).size===p.reads.length&&p.reads.every(r=>{
      const s=catalog.sessions.find(s=>s.id===r?.session),ints=(a,max)=>Array.isArray(a)&&a.length<=max&&new Set(a).size===a.length&&a.every(n=>Number.isInteger(n)&&n>=1&&n<=max);
      return !!s&&this.exact(r,['session','ends','arrows','trace',...Object.hasOwn(r,'fields')?['fields']:[]])&&(!Object.hasOwn(r,'fields')||['metrics','signals'].includes(r.fields))&&typeof r.trace==='boolean'&&ints(r.ends,s.overview?.ends.length??100000)&&ints(r.arrows,s.arrows)&&r.arrows.length<=12&&(!r.trace||(r.arrows.length>0&&r.arrows.length<=3));
    });
  },
  validReads(plan,catalog,previous=[]) {const ids=this.select(plan,catalog,previous);return (plan.reads||[]).every(r=>ids.includes(r.session));},
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
  read(session,request,allRows=false) {
    const plan={scope:'all',start:'',end:'',ids:[],count:1,detail:true},catalog=this.catalog([session],null),data=this.data([session],null,plan,catalog);
    const keep=data.columns.map((k,i)=>({k,i})).filter(p=>request.fields==='signals'||p.k<10+this.scalars.length),columns=keep.map(p=>p.k);
    const rows=data.sessions[0].rows.filter(r=>allRows||(!request.ends.length&&!request.arrows.length)||request.ends.includes(r[1])||request.arrows.includes(r[0])).map(r=>keep.map(p=>r[p.i]));
    const shots=session.shots.filter(s=>s&&!s.candidate),traces=[];
    if(request.trace)for(const id of request.arrows){
      const shot=shots[id-1],signals={};
      if(!shot.manual)for(const key of this.signals){const a=key.split('.').reduce((o,k)=>o?.[k],shot);if(Array.isArray(a)&&a.length){if(a.length>20000||!a.every(n=>Number.isFinite(n)&&Math.abs(n)<=1e12))throw Error('Una señal guardada no se puede enviar completa.');signals[key]=a.slice();}}
      traces.push({id,signals});
    }
    return {columns,rows,traces};
  },
  answerData(sessions,current,plan,catalog,previous=[]) {
    const all=this.local(sessions,current),ids=this.select(plan,catalog,previous);
    return {kind:'overview',sessions:ids.map(id=>{const read=(plan.reads||[]).find(r=>r.session===id);return {id,detail:plan.detail||read?this.read(all[id-1],read||{ends:[],arrows:[],trace:false},plan.detail):null};})};
  },
  included(packet) {return this.select(packet.plan,packet.catalog,packet.previous).filter(id=>!(packet.omitted||[]).includes(id));},
  canTrim(packet) {return packet.plan.scope==='all'&&!/\d|\b(hoy|ayer|anteayer|actual|ultim[ao]s?|esas?|esos?|semana|mes|ano|lunes|martes|miercoles|jueves|viernes|sabado|domingo)\b/.test(packet.question.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase());},
  fit(packet,maxBytes=this.MAX_BYTES) {
    const bytes=p=>new TextEncoder().encode(JSON.stringify(p)).length;
    if(bytes(packet)<=maxBytes)return packet;
    if(!this.canTrim(packet))throw Error('Esta selección concreta supera el tamaño admitido. Pide menos sesiones, tandas o flechas; no se ha dejado ninguna fuera.');
    const ids=packet.data.sessions.map(s=>s.id),candidate=n=>({...packet,catalog:{...packet.catalog,sessions:packet.catalog.sessions.map(s=>({...s,overview:s.id<=n?null:s.overview}))},data:{...packet.data,sessions:packet.data.sessions.slice(n)},omitted:ids.slice(0,n)});
    let lo=1,hi=packet.data.sessions.findLastIndex(s=>packet.catalog.sessions[s.id-1].arrows>0);
    if(hi<1||bytes(candidate(hi))>maxBytes)throw Error('La sesión más reciente no cabe completa. Pide una tanda o unas flechas concretas; no se han recortado sus flechas.');
    while(lo<hi){const mid=Math.floor((lo+hi)/2);if(bytes(candidate(mid))<=maxBytes)hi=mid;else lo=mid+1;}
    return candidate(lo);
  },
  validStats(a,max) {return Array.isArray(a)&&a.length===5&&Number.isInteger(a[0])&&a[0]>=0&&a[0]<=max&&(a[0]===0?a.slice(1).every(v=>v===null):a.slice(1).every(v=>Number.isFinite(v)&&Math.abs(v)<=1e12)&&a[2]>=0&&a[3]<=a[1]&&a[1]<=a[4]);},
  validOverview(o,n) {
    const stats=(s,keys,max)=>this.exact(s,keys)&&keys.every(k=>this.validStats(s[k],max));
    return this.exact(o,['stats','ends','manual','thirds','examples'])&&stats(o.stats,this.overviewKeys,n)&&Array.isArray(o.ends)&&o.ends.every(v=>Number.isInteger(v)&&v>0)&&o.ends.reduce((a,b)=>a+b,0)===n&&Number.isInteger(o.manual)&&o.manual>=0&&o.manual<=n&&
      (Math.floor(n/3)?this.exact(o.thirds,['first','last'])&&['first','last'].every(k=>stats(o.thirds[k],this.overviewKeys.slice(0,4),Math.floor(n/3))):o.thirds===null)&&Array.isArray(o.examples)&&o.examples.length<=6&&new Set(o.examples.map(r=>r?.[0])).size===o.examples.length&&o.examples.every(r=>Array.isArray(r)&&r.length===8&&Number.isInteger(r[0])&&r[0]>=1&&r[0]<=n&&Number.isInteger(r[1])&&r[1]>=1&&r[1]<=o.ends.length&&r.every(v=>v===null||(Number.isFinite(v)&&Math.abs(v)<=1e12)));
  },
  validDetail(d,meta,read,allRows) {
    if(!this.exact(d,['columns','rows','traces'])||!Array.isArray(d.columns)||d.columns.length<8||d.columns.some((k,i)=>!Number.isInteger(k)||k<0||k>=this.columns().length||(i<8?k!==i:k<=d.columns[i-1]))||!Array.isArray(d.rows))return false;
    const rows=d.rows,ids=rows.map(r=>r?.[0]);
    if(new Set(ids).size!==ids.length||rows.some((r,i)=>!Array.isArray(r)||r.length!==d.columns.length||!Number.isInteger(r[0])||r[0]<1||r[0]>meta.arrows||(i&&r[0]<=rows[i-1][0])||!Number.isInteger(r[1])||r[1]<1||r[1]>meta.overview.ends.length||r.some(v=>v!==null&&(!Number.isFinite(v)||Math.abs(v)>1e12))))return false;
    if(allRows||(!read.ends.length&&!read.arrows.length)){if(rows.length!==meta.arrows)return false;}
    else if(!read.arrows.every(id=>ids.includes(id))||rows.some(r=>!read.ends.includes(r[1])&&!read.arrows.includes(r[0])))return false;
    for(const end of allRows||(!read.ends.length&&!read.arrows.length)?meta.overview.ends.map((_,i)=>i+1):read.ends)if(rows.filter(r=>r[1]===end).length!==meta.overview.ends[end-1])return false;
    const traces=d.traces;if(!Array.isArray(traces)||traces.length!==(read.trace?read.arrows.length:0))return false;
    return traces.every((t,i)=>this.exact(t,['id','signals'])&&t.id===read.arrows[i]&&t.signals&&typeof t.signals==='object'&&!Array.isArray(t.signals)&&Object.entries(t.signals).every(([k,a])=>this.signals.includes(k)&&Array.isArray(a)&&a.length>0&&a.length<=20000&&a.every(v=>Number.isFinite(v)&&Math.abs(v)<=1e12)));
  },
  validPacket(p) {
    if(!this.exact(p,['version','stage','question','messages','catalog','previous','plan','data',...p&&Object.hasOwn(p,'omitted')?['omitted']:[]])||![2,this.VERSION].includes(p.version)||!['plan','answer'].includes(p.stage)||typeof p.question!=='string'||!p.question.trim()||p.question.length>2000||!Array.isArray(p.messages)||p.messages.length>12||p.messages.some(m=>!this.exact(m,['role','content'])||!['user','assistant'].includes(m.role)||typeof m.content!=='string'||!m.content.trim()||m.content.length>(m.role==='user'?2000:6000))||p.messages.reduce((n,m)=>n+m.content.length,0)>24000)return false;
    if(Object.hasOwn(p,'omitted')&&(!Array.isArray(p.omitted)||p.version!==this.VERSION||p.stage!=='answer'||p.data?.kind!=='overview'))return false;
    const omitted=p.omitted||[];if(omitted.some((id,i)=>id!==i+1)||omitted.length&&(!p.plan||!this.canTrim(p)))return false;
    const c=p.catalog;if(!this.exact(c,['today','sessions'])||!this.day(c.today)||!Array.isArray(c.sessions)||c.sessions.length>100000||omitted.length>=c.sessions.length&&omitted.length||c.sessions.some((s,i)=>!this.exact(s,['id','day','time','ago','current','arrows','mode','group',...p.version===this.VERSION?['overview']:[]])||s.id!==i+1||!this.day(s.day)||!/^([01]\d|2[0-3]):[0-5]\d$/.test(s.time)||!Number.isInteger(s.ago)||Math.abs(s.ago)>100000||typeof s.current!=='boolean'||!Number.isInteger(s.arrows)||s.arrows<0||s.arrows>1000000||!['Indoor','Outdoor','Libre'].includes(s.mode)||!Number.isInteger(s.group)||s.group<0||s.group>100000||(p.version===this.VERSION&&(omitted.includes(s.id)?s.overview!==null:!this.validOverview(s.overview,s.arrows))))||!Array.isArray(p.previous)||p.previous.some(id=>!c.sessions.some(s=>s.id===id)))return false;
    if(p.stage==='plan')return p.plan===null&&p.data===null;
    if(p.version===this.VERSION&&p.data?.kind==='overview'){
      if(!this.validPlan(p.plan,c)||!this.validReads(p.plan,c,p.previous)||p.plan.scope==='refuse'||!this.exact(p.data,['kind','sessions'])||!Array.isArray(p.data.sessions))return false;
      const ids=this.included(p);return p.data.sessions.length===ids.length&&p.data.sessions.every((s,i)=>{
        if(!this.exact(s,['id','detail'])||s.id!==ids[i])return false;
        const read=(p.plan.reads||[]).find(r=>r.session===s.id);return p.plan.detail||read?this.validDetail(s.detail,c.sessions[s.id-1],read||{ends:[],arrows:[],trace:false},p.plan.detail):s.detail===null;
      });
    }
    if(!this.validPlan(p.plan,c)||['refuse'].includes(p.plan.scope)||!this.exact(p.data,['columns','sessions'])||!Array.isArray(p.data.sessions)||!Array.isArray(p.data.columns)||p.data.columns.length<8||p.data.columns.some((k,i)=>!Number.isInteger(k)||k<0||k>=this.columns().length||(i<8?k!==i:k<=p.data.columns[i-1])))return false;
    const ids=this.select(p.plan,c,p.previous),n=p.data.columns.length;return p.data.sessions.length===ids.length&&p.data.sessions.every((s,i)=>this.exact(s,['id','rows'])&&s.id===ids[i]&&Array.isArray(s.rows)&&s.rows.length===c.sessions[s.id-1].arrows&&s.rows.every((r,j)=>Array.isArray(r)&&r.length===n&&r[0]===j+1&&Number.isInteger(r[1])&&r[1]>0&&r.every(v=>v===null||(Number.isFinite(v)&&Math.abs(v)<=1e12))));
  },
  context(packet) {
    if(packet.data.kind==='overview')return this.overviewContext(packet);
    const names=this.columns(),columns=packet.data.columns.map(i=>names[i]),c=packet.catalog;
    const statsFor=rows=>Object.fromEntries(columns.flatMap((key,i)=>packet.data.columns[i]>=2?[[key,this.signal(rows.map(r=>r[i]).filter(Number.isFinite))]]:[]));
    const sessions=packet.data.sessions.map(s=>{
      const meta=c.sessions[s.id-1],rows=s.rows.map(r=>Object.fromEntries(columns.slice(0,8).map((k,i)=>[k,r[i]]))),n=Math.floor(rows.length/3),facts=[];
      // Procesa todas las flechas; cada tramo conserva sus índices originales en la tabla completa.
      if(packet.plan.detail||packet.data.sessions.length<=3)for(let i=0;i<rows.length;i+=600){const part=rows.slice(i,i+600).map((a,j)=>({...a,id:j+1}));facts.push(...AgentCoach.facts({arrows:part,baseline:{sessions:0,n:0}}).map(f=>({id:'bloque_'+(i/600+1)+'_'+f.id,text:f.text})));}
      const stats=statsFor(s.rows);
      const third=a=>({n:a.length,...Object.fromEntries(['stability','hold_s','wobble_deg','points'].map(k=>[k,this.signal(a.map(r=>r[k]).filter(Number.isFinite))]))});
      const measured=s.rows.filter(r=>r[2]!==null).slice().sort((a,b)=>a[2]-b[2]),examples=[...new Set([...measured.slice(0,3),...measured.slice(-3)])].map(r=>r.slice(0,8));
      const {overview,...info}=meta;return {...info,stats,facts,...packet.plan.detail?{rows:s.rows}:{examples},thirds:n?{first:third(rows.slice(0,n)),last:third(rows.slice(-n))}:null};
    });return {today:c.today,scope:packet.plan.scope,columns,example_columns:columns.slice(0,8),sessions,total_arrows:sessions.reduce((n,s)=>n+s.arrows,0),groups:[...new Set(sessions.map(s=>s.group))].map(group=>{const a=packet.data.sessions.filter(s=>c.sessions[s.id-1].group===group),rows=a.flatMap(s=>s.rows);return {group,sessions:a.length,arrows:rows.length,stats:statsFor(rows)};})};
  },
  mergeStats(parts) {
    let n=0,mean=0,m2=0,min=Infinity,max=-Infinity;
    for(const p of parts){if(!p[0])continue;const next=n+p[0],delta=p[1]-mean;m2+=p[0]*p[2]**2+delta**2*n*p[0]/next;mean+=delta*p[0]/next;n=next;min=Math.min(min,p[3]);max=Math.max(max,p[4]);}
    return n?[n,...[mean,Math.sqrt(m2/n),min,max].map(AgentCoach.round)]:[0,null,null,null,null];
  },
  signalUnit(key) {
    if(['trace_t','post_t','window.pre','window.post'].includes(key))return 'ms';
    if(['window.mag_pre','window.mag_post'].includes(key))return 'mG';
    if(/yaw|pitch/.test(key))return '°';
    if(['tilt_x','tilt_y'].includes(key))return 'mrad';
    return 'unidad no documentada';
  },
  overviewContext(packet) {
    const catalog=packet.catalog,sessions=packet.data.sessions.map(s=>{
      const {overview,...meta}=catalog.sessions[s.id-1],detail=s.detail?{columns:s.detail.columns.map(i=>this.columns()[i]),rows:s.detail.rows,traces:s.detail.traces.map(t=>({...t,units:Object.fromEntries(Object.keys(t.signals).map(k=>[k,this.signalUnit(k)]))}))}:null;
      return {...meta,...overview,detail};
    }),requested=this.select(packet.plan,catalog,packet.previous),omitted=packet.omitted||[];
    return {today:catalog.today,scope:packet.plan.scope,example_columns:this.columns().slice(0,8),sessions,total_arrows:sessions.reduce((n,s)=>n+s.arrows,0),coverage:{requested_sessions:requested.length,requested_arrows:requested.reduce((n,id)=>n+catalog.sessions[id-1].arrows,0),included_sessions:sessions.length,omitted_sessions:omitted.length,omitted_arrows:omitted.reduce((n,id)=>n+catalog.sessions[id-1].arrows,0),from:sessions[0]?.day||'',until:sessions.at(-1)?.day||''},groups:[...new Set(sessions.map(s=>s.group))].map(group=>{const a=sessions.filter(s=>s.group===group);return {group,sessions:a.length,arrows:a.reduce((n,s)=>n+s.arrows,0),stats:Object.fromEntries(this.overviewKeys.map(k=>[k,this.mergeStats(a.map(s=>s.stats[k]))]))};})};
  },
  coverageNote(packet) {
    if(!packet.omitted?.length)return '';
    const c=this.overviewContext(packet).coverage;return `He analizado ${c.included_sessions} de ${c.requested_sessions} sesiones, del ${c.from} al ${c.until}. Se han dejado fuera ${c.omitted_sessions} sesiones más antiguas (${c.omitted_arrows} flechas) por el límite de tamaño.\n\n`;
  }
};
const AgentCoachTrace=typeof module!=='undefined'?require('./trace-geom.js'):Trace;
if(typeof module!=='undefined')module.exports=CoachAgent;
