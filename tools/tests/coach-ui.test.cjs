const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),Coach=require('../../mobile/coach.js'),CoachAgent=require('../../mobile/coach-agent.js');
function page(){
  const elements=new Map(),storage=new Map(),calls=[],notes=[],sessions=Array.from({length:35},(_,i)=>({id:Date.now()-i*864e5,mode:'Indoor',bow:'Privado',shots:Array.from({length:9},(_,j)=>({set_id:1,metric:3,aim_score:80,draw_ms:4000,result:{value:'9',impact:{x:0,y:.3}}}))}));
  const ctx={Coach,CoachAgent,TextEncoder,console,Date,Math,JSON,setTimeout:()=>1,clearTimeout(){},render(){},notice:m=>notes.push(m),view:'Coach',curSess:null,
    escapeText:s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])),
    document:{getElementById:id=>{if(!elements.has(id))elements.set(id,{textContent:'',innerHTML:'',disabled:false,value:'',style:{},setAttribute(){}});return elements.get(id);}},
    localStorage:{getItem:k=>storage.get(k)??null,setItem:(k,v)=>storage.set(k,String(v))},store:{list:()=>JSON.parse(JSON.stringify(sessions))},
    Native:{chatCoach:(id,json)=>{calls.push({id,json});return '';}}};
  ctx.window=ctx;const context=vm.createContext(ctx),run=code=>vm.runInContext(code,context);run(fs.readFileSync(require('node:path').join(__dirname,'../../mobile/coach-ui.js'),'utf8'));
  const ask=q=>{ctx.document.getElementById('coachInput').value=q;run('CoachUI.send()');};
  const deliver=body=>{ctx.id=calls.at(-1).id;ctx.reply=JSON.stringify({version:2,model:'xiaomi/mimo-v2.6-flash',...body});run("CoachUI.receive(id,reply,'')");};
  const plan=more=>deliver({plan:{scope:'all',start:'',end:'',ids:[],count:1,detail:false,...more}}),reply=answer=>deliver({answer:answer||'Respuesta'});
  return {run,ctx,elements,storage,calls,notes,sessions,ask,plan,reply,deliver};
}
test('chat plans automatically without a selector, login or current session and keeps escaped replies locally',()=>{
  const p=page();p.ask('¿Qué puedo practicar con el arco?');p.ask('Duplicado');assert.equal(p.calls.length,1);assert.equal(JSON.parse(p.calls[0].json).stage,'plan');
  p.plan({scope:'general'});assert.equal(p.calls.length,2);assert.equal(JSON.parse(p.calls[1].json).data.sessions.length,0);
  p.reply('<img src=x onerror=alert(1)> **Consejo**');const saved=JSON.parse(p.storage.get('atCoachChat'));assert.equal(saved.length,2);assert.equal(saved[0].content,'¿Qué puedo practicar con el arco?');
  assert.match(p.elements.get('coachThread').innerHTML,/&lt;img/);assert.doesNotMatch(p.elements.get('coachThread').innerHTML,/<img/);assert.match(p.elements.get('coachThread').innerHTML,/<strong>Consejo<\/strong>/);
  assert.equal(p.elements.has('coachScope'),false);p.ask('¿Y después?');assert.equal(JSON.parse(p.calls[2].json).messages.length,2);
});
test('today sends only today while a generic analysis includes every old session and remembers follow-up scope',()=>{
  const p=page();p.ask('Analízame la sesión de hoy');p.plan({scope:'dates',start:Coach.day(),end:Coach.day()});let request=JSON.parse(p.calls[1].json);
  assert.equal(request.data.sessions.length,1);assert.equal(request.catalog.sessions[request.data.sessions[0].id-1].day,Coach.day());assert.doesNotMatch(p.calls[1].json,/Privado/);p.reply();
  p.ask('¿Y qué mejoro?');assert.equal(JSON.parse(p.calls[2].json).previous.length,1);p.plan({scope:'previous'});assert.equal(JSON.parse(p.calls[3].json).data.sessions.length,1);p.reply();
  p.ask('Analiza mis tiros, dime cosas');p.plan();request=JSON.parse(p.calls[5].json);assert.equal(request.data.sessions.length,35);assert.equal(request.data.sessions[0].id,1);p.reply();
  assert.equal(JSON.parse(p.storage.get('atCoachChat')).at(-2).selection,'all');
});
test('refusal sends no measurements, failed requests restore the question and stale plans are ignored',()=>{
  const p=page();p.ask('Escríbeme una receta');p.deliver({answer:'Solo puedo ayudarte con el tiro con arco.'});assert.equal(p.calls.length,1);assert.equal(JSON.parse(p.storage.get('atCoachChat')).length,2);
  p.ask('Analiza mis flechas');p.ctx.id='stale';p.run("CoachUI.receive(id,'','Error antiguo')");assert.equal(p.run('!!CoachUI.pending'),true);
  p.ctx.id=p.calls.at(-1).id;p.run("CoachUI.receive(id,'','Sin conexión')");assert.equal(p.elements.get('coachInput').value,'Analiza mis flechas');assert.equal(JSON.parse(p.storage.get('atCoachChat')).length,2);
  p.ask('Analiza hoy');p.plan({scope:'dates',start:Coach.day(),end:Coach.day()});p.deliver({answer:''});assert.equal(JSON.parse(p.storage.get('atCoachChat')).length,2);assert.match(p.elements.get('coachThread').innerHTML,/no es válida/);
});
