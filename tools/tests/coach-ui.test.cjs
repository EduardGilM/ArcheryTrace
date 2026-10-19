const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),Coach=require('../../mobile/coach.js'),CoachAgent=require('../../mobile/coach-agent.js');
function page(initial={}){
  const elements=new Map(),storage=new Map(Object.entries(initial)),calls=[],notes=[],sessions=Array.from({length:35},(_,i)=>({id:Date.now()-i*864e5,mode:'Indoor',bow:'Privado',shots:Array.from({length:9},(_,j)=>({set_id:1,metric:3,aim_score:80,draw_ms:4000,result:{value:'9',impact:{x:0,y:.3}}}))}));
  const ctx={Coach,CoachAgent,TextEncoder,console,Date,Math,JSON,setTimeout:()=>1,clearTimeout(){},render(){},notice:m=>notes.push(m),view:'Coach',curSess:null,
    escapeText:s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])),
    document:{body:{classList:{toggle(){}}},addEventListener(){},getElementById:id=>{if(!elements.has(id))elements.set(id,{textContent:'',innerHTML:'',disabled:false,value:'',style:{},setAttribute(){}});return elements.get(id);}},
    localStorage:{getItem:k=>storage.get(k)??null,setItem:(k,v)=>storage.set(k,String(v)),removeItem:k=>storage.delete(k)},store:{list:()=>JSON.parse(JSON.stringify(sessions))},
    Native:{chatCoach:(id,json)=>{calls.push({id,json});return '';}}};
  ctx.window=ctx;const context=vm.createContext(ctx),run=code=>vm.runInContext(code,context);run(fs.readFileSync(require('node:path').join(__dirname,'../../mobile/coach-ui.js'),'utf8'));
  const html=fs.readFileSync(require('node:path').join(__dirname,'../../mobile/index.html'),'utf8');run(html.slice(html.indexOf('function show(v) {'),html.indexOf('\nfunction render() {')));
  const saved=()=>JSON.parse(storage.get('atCoachChats')||'[]')[0]?.messages||[];
  const ask=q=>{ctx.document.getElementById('coachInput').value=q;run('CoachUI.send()');};
  const deliver=body=>{ctx.id=calls.at(-1).id;ctx.reply=JSON.stringify({version:CoachAgent.VERSION,model:'xiaomi/mimo-v2.6-flash',...body});run("CoachUI.receive(id,reply,'')");};
  const plan=more=>deliver({plan:{scope:'all',start:'',end:'',ids:[],count:1,detail:false,...more}}),reply=answer=>deliver({answer:answer||'Respuesta'});
  return {run,ctx,elements,storage,calls,notes,sessions,ask,plan,reply,deliver,saved};
}
test('chat plans automatically without a selector, login or current session and keeps escaped replies locally',()=>{
  const p=page();p.ask('¿Qué puedo practicar con el arco?');p.ask('Duplicado');assert.equal(p.calls.length,1);assert.equal(JSON.parse(p.calls[0].json).stage,'plan');
  p.plan({scope:'general'});assert.equal(p.calls.length,2);assert.equal(JSON.parse(p.calls[1].json).data.sessions.length,0);
  p.reply('<img src=x onerror=alert(1)> **Consejo**');const saved=p.saved();assert.equal(saved.length,2);assert.equal(saved[0].content,'¿Qué puedo practicar con el arco?');
  assert.match(p.elements.get('coachThread').innerHTML,/&lt;img/);assert.doesNotMatch(p.elements.get('coachThread').innerHTML,/<img/);assert.match(p.elements.get('coachThread').innerHTML,/<strong>Consejo<\/strong>/);
  assert.equal(p.elements.has('coachScope'),false);p.ask('¿Y después?');assert.equal(JSON.parse(p.calls[2].json).messages.length,2);
});
test('today sends only today while a generic analysis includes every old session and remembers follow-up scope',()=>{
  const p=page();p.ask('Analízame la sesión de hoy');p.plan({scope:'dates',start:Coach.day(),end:Coach.day()});let request=JSON.parse(p.calls[1].json);
  assert.equal(request.data.sessions.length,1);assert.equal(request.catalog.sessions[request.data.sessions[0].id-1].day,Coach.day());assert.doesNotMatch(p.calls[1].json,/Privado/);p.reply();
  p.ask('¿Y qué mejoro?');assert.equal(JSON.parse(p.calls[2].json).previous.length,1);p.plan({scope:'previous'});assert.equal(JSON.parse(p.calls[3].json).data.sessions.length,1);p.reply();
  p.ask('Analiza mis tiros, dime cosas');p.plan();request=JSON.parse(p.calls[5].json);assert.equal(request.data.sessions.length,35);assert.equal(request.data.sessions[0].id,1);p.reply();
  assert.equal(p.saved().at(-2).selection,'all');
});
test('refusal sends no measurements, failed requests restore the question and stale plans are ignored',()=>{
  const p=page();p.ask('Escríbeme una receta');p.deliver({answer:'Solo puedo ayudarte con el tiro con arco.'});assert.equal(p.calls.length,1);assert.equal(p.saved().length,2);
  p.ask('Analiza mis flechas');p.ctx.id='stale';p.run("CoachUI.receive(id,'','Error antiguo')");assert.equal(p.run('!!CoachUI.pending'),true);
  p.ctx.id=p.calls.at(-1).id;p.run("CoachUI.receive(id,'','Sin conexión')");assert.equal(p.elements.get('coachInput').value,'Analiza mis flechas');assert.equal(p.saved().length,2);
  p.ask('Analiza hoy');p.plan({scope:'dates',start:Coach.day(),end:Coach.day()});p.deliver({answer:''});assert.equal(p.saved().length,2);assert.match(p.elements.get('coachThread').innerHTML,/no es válida/);
});
test('entering the coach again starts empty and the new chat button clears the previous context',()=>{
  const p=page();p.ask('Analiza hoy');p.plan({scope:'dates',start:Coach.day(),end:Coach.day()});p.reply('Respuesta de hoy');
  const first=p.run('CoachUI.current.id');p.elements.get('coachInput').value='Borrador anterior';
  p.run("show('Session');show('Coach')");
  assert.notEqual(p.run('CoachUI.current.id'),first);assert.equal(p.elements.get('coachInput').value,'');
  assert.equal(p.run('CoachUI.messages().length'),0);assert.doesNotMatch(p.elements.get('coachThread').innerHTML,/Respuesta de hoy/);
  p.ask('Analiza todos mis tiros');let request=JSON.parse(p.calls[2].json);assert.deepEqual(request.messages,[]);assert.deepEqual(request.previous,[]);p.plan();p.reply();
  p.elements.get('coachNewChat').onclick();assert.equal(p.run('CoachUI.messages().length'),0);
  p.ask('¿Qué practico?');request=JSON.parse(p.calls[4].json);assert.deepEqual(request.messages,[]);assert.deepEqual(request.previous,[]);
  assert.equal(JSON.parse(p.storage.get('atCoachChats')).length,3);
});
test('history reopens the selected conversation and continues with only its own scope',()=>{
  const p=page();p.ask('Analiza hoy');p.plan({scope:'dates',start:Coach.day(),end:Coach.day()});p.reply('Consejo de hoy');
  const first=p.run('CoachUI.current.id');p.run('CoachUI.newChat()');p.ask('Analiza todos mis tiros');p.plan();p.reply('Consejo global');
  p.elements.get('coachHistoryToggle').onclick();assert.equal(p.elements.get('coachForm').hidden,true);assert.match(p.elements.get('coachThread').innerHTML,/Historial de chats/);
  p.ctx.selected=first;p.elements.get('coachThread').onclick({target:{closest:selector=>selector==='[data-coach-chat]'?{dataset:{coachChat:first}}:null}});
  assert.equal(p.elements.get('coachForm').hidden,false);assert.match(p.elements.get('coachThread').innerHTML,/Consejo de hoy/);assert.doesNotMatch(p.elements.get('coachThread').innerHTML,/Consejo global/);
  p.ask('¿Y qué mejoro?');const request=JSON.parse(p.calls[4].json);assert.equal(request.messages.length,2);assert.equal(request.previous.length,1);assert.doesNotMatch(JSON.stringify(request.messages),/Consejo global/);
});
test('existing chat migrates once to history and reopening the app still starts a new chat',()=>{
  const old=[{role:'user',content:'<script>alert(1)</script>',scope:'Tiro con arco',selection:'all'},{role:'assistant',content:'Consejo guardado',scope:'Tiro con arco'}];
  const p=page({atCoachChat:JSON.stringify(old)});assert.equal(p.storage.has('atCoachChat'),false);assert.deepEqual(p.saved(),old);assert.equal(p.run('CoachUI.messages().length'),0);
  p.run('CoachUI.toggleHistory()');assert.match(p.elements.get('coachThread').innerHTML,/&lt;script&gt;/);assert.doesNotMatch(p.elements.get('coachThread').innerHTML,/<script>/);
  const reopened=page(Object.fromEntries(p.storage));assert.equal(JSON.parse(reopened.storage.get('atCoachChats')).length,1);assert.equal(reopened.run('CoachUI.messages().length'),0);
  reopened.run("CoachUI.openChat('legacy')");assert.match(reopened.elements.get('coachThread').innerHTML,/Consejo guardado/);
  const backup=require('../../mobile/backup.js').build({get length(){return reopened.storage.size;},key:i=>[...reopened.storage.keys()][i],getItem:k=>reopened.storage.get(k)});
  assert.deepEqual(backup.storage.atCoachChats[0].messages,old);
});
test('late replies stay in their original chat after starting another one, including the selection stage',()=>{
  const p=page();p.ask('Analiza todos mis tiros');const first=p.run('CoachUI.current.id');p.run('CoachUI.newChat()');
  p.plan();assert.equal(JSON.parse(p.calls[1].json).data.sessions.length,35);p.reply('Respuesta antigua');
  assert.equal(p.run('CoachUI.messages().length'),0);assert.doesNotMatch(p.elements.get('coachThread').innerHTML,/Respuesta antigua/);
  assert.equal(p.saved()[1].content,'Respuesta antigua');p.ctx.selected=first;p.run('CoachUI.openChat(selected)');assert.match(p.elements.get('coachThread').innerHTML,/Respuesta antigua/);
  p.run('CoachUI.newChat()');p.ask('Otra pregunta');const other=p.run('CoachUI.current.id');p.run('CoachUI.resume()');
  p.ctx.id=p.calls.at(-1).id;p.run("CoachUI.receive(id,'','Sin conexión')");assert.equal(p.elements.get('coachInput').value,'');assert.equal(p.run('CoachUI.error'),'');
  p.ctx.selected=other;p.run('CoachUI.openChat(selected)');assert.equal(p.elements.get('coachInput').value,'Otra pregunta');assert.match(p.elements.get('coachThread').innerHTML,/Sin conexión/);
});
test('unanswered questions survive a reload in history and a failed save preserves the old chat',()=>{
  const p=page();p.ask('Pregunta pendiente');const id=p.run('CoachUI.current.id'),reopened=page(Object.fromEntries(p.storage));
  reopened.ctx.selected=id;reopened.run('CoachUI.openChat(selected)');assert.equal(reopened.elements.get('coachInput').value,'Pregunta pendiente');
  const old=[{role:'user',content:'Historial anterior',scope:''}],q=page();q.storage.set('atCoachChat',JSON.stringify(old));q.ctx.localStorage.setItem=()=>{throw Error('QuotaExceededError');};
  q.run('CoachUI.chats=null;CoachUI.load()');assert.equal(q.storage.has('atCoachChat'),true);assert.match(q.notes.at(-1),/No se pudo guardar/);
});
test('long answers display and persist in history without breaking the following question',()=>{
  const p=page(),answer='射'.repeat(40000);p.ask('Analiza mis tiros');p.plan();p.reply(answer);
  assert.equal(p.saved()[1].content,answer);assert.ok(p.elements.get('coachThread').innerHTML.includes(answer));
  const id=p.run('CoachUI.current.id'),reopened=page(Object.fromEntries(p.storage));reopened.ctx.selected=id;reopened.run('CoachUI.openChat(selected)');
  assert.ok(reopened.elements.get('coachThread').innerHTML.includes(answer));reopened.ask('¿Y después?');
  const request=JSON.parse(reopened.calls[0].json);assert.equal(CoachAgent.validPacket(request),true);assert.equal(request.messages[1].content.length,6000);
});
test('model-selected detail is read locally without replacing the overview of the whole history',()=>{
  const p=page();p.ask('Analiza mis tiros');p.plan({reads:[{session:1,ends:[],arrows:[2],trace:false,fields:'metrics'}]});
  const request=JSON.parse(p.calls[1].json);assert.equal(request.data.kind,'overview');assert.equal(request.data.sessions.length,35);
  assert.deepEqual(request.data.sessions[0].detail.rows.map(r=>r[0]),[2]);assert.ok(request.data.sessions.slice(1).every(s=>s.detail===null));
  assert.equal(CoachAgent.validPacket(request),true);
});
test('a fitted general query remembers the included sessions for follow-up questions',()=>{
  const p=page();p.ask('Analiza mis tiros');const max=CoachAgent.MAX_BYTES;
  try{
    CoachAgent.MAX_BYTES=18000;p.plan();const request=JSON.parse(p.calls[1].json);assert.ok(request.omitted.length>0);assert.equal(CoachAgent.validPacket(request),true);
    p.reply('Análisis de las sesiones incluidas.');const saved=p.saved()[0];assert.ok(Array.isArray(saved.selection));assert.equal(saved.selection.length,request.data.sessions.length);assert.match(saved.scope,/Últimas/);
    assert.equal(p.sessions.length,35);assert.ok(p.sessions.every(s=>s.shots.length===9));
  }finally{CoachAgent.MAX_BYTES=max;}
});
