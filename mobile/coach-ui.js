/* Conversación local; Android realiza las consultas sin exponer credenciales a la WebView. */
const CoachUI = {
  pending:null,error:'',chats:null,current:null,historyOpen:false,
  cleanMessages(value) {
    return Array.isArray(value)?value.filter(m=>m&&['user','assistant'].includes(m.role)&&typeof m.content==='string'&&m.content.length<=CoachAgent.MAX_ANSWER_CHARS&&typeof m.scope==='string'&&m.scope.length<=100).slice(-80):[];
  },
  load() {
    if(this.chats)return this.chats;
    const read=key=>{try{return JSON.parse(localStorage.getItem(key)||'[]');}catch{return [];}};
    const saved=read('atCoachChats');
    this.chats=Array.isArray(saved)?saved.filter(c=>c&&typeof c.id==='string'&&c.id.length<=100&&Number.isFinite(c.createdAt)&&Number.isFinite(c.updatedAt)).map(c=>({id:c.id,createdAt:c.createdAt,updatedAt:c.updatedAt,messages:this.cleanMessages(c.messages),draft:typeof c.draft==='string'?c.draft.slice(0,1800):''})).filter(c=>c.messages.length||c.draft):[];
    const legacy=this.cleanMessages(read('atCoachChat'));
    if(legacy.length){
      if(!this.chats.some(c=>c.id==='legacy'))this.chats.push({id:'legacy',createdAt:Date.now(),updatedAt:Date.now(),messages:legacy,draft:''});
      if(this.save())try{localStorage.removeItem('atCoachChat');}catch{}
    }
    return this.chats;
  },
  save() {
    try{localStorage.setItem('atCoachChats',JSON.stringify(this.chats));return true;}
    catch{notice('No se pudo guardar el chat. Revisa el espacio disponible.');return false;}
  },
  messages() { return this.current?.messages||[]; },
  newChat() {
    this.load();
    this.current={id:Date.now()+'-'+Math.random().toString(36).slice(2),createdAt:Date.now(),updatedAt:Date.now(),messages:[],draft:''};
    this.historyOpen=false;this.error='';
    const field=document.getElementById('coachInput');field.value='';field.style.height='';
    this.render();
  },
  resume() { if(view==='Coach')this.newChat(); },
  toggleHistory() { this.historyOpen=!this.historyOpen;this.render(); },
  openChat(id) {
    const chat=this.load().find(c=>c.id===id);if(!chat)return;
    this.current=chat;this.historyOpen=false;this.error=chat.error||'';
    const field=document.getElementById('coachInput');field.value=this.pending?.chat===chat?'':chat.draft||'';field.style.height='';
    this.render();
  },
  historyHTML() {
    const chats=this.load().slice().sort((a,b)=>b.updatedAt-a.updatedAt),esc=escapeText;
    return '<div class="chatHistory"><h2>Historial de chats</h2>'+(!chats.length?'<p>No hay conversaciones guardadas.</p>':chats.map(c=>{
      const title=c.messages.find(m=>m.role==='user')?.content||c.draft||'Conversación';
      const date=new Date(c.updatedAt).toLocaleString('es',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'});
      return `<button type="button" data-coach-chat="${esc(c.id)}"><span><b>${esc(title)}</b><small>${esc(date)}${this.pending?.chat===c?' · Respondiendo…':''}</small></span><i aria-hidden="true">↗</i></button>`;
    }).join(''))+'</div>';
  },
  format(text) { return escapeText(text).replace(/^#{1,3} (.+)$/gm,'<strong>$1</strong>').replace(/\*\*([^*\n]+)\*\*/g,'<strong>$1</strong>').replace(/^[-*] /gm,'• '); },
  render() {
    if(view!=='Coach')return;
    const messages=this.messages(),esc=escapeText,thread=document.getElementById('coachThread'),pending=this.pending?.chat===this.current?this.pending:null;
    let html=this.historyOpen?this.historyHTML():messages.length?messages.map(m=>`<article class="chatMessage ${m.role}">${m.role==='assistant'?'<small>Entrenador</small>':''}<div>${this.format(m.content)}</div></article>`).join(''):pending?'':`<div class="chatWelcome"><svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M38 8H10a5 5 0 0 0-5 5v18a5 5 0 0 0 5 5h6l8 7v-7h14a5 5 0 0 0 5-5V13a5 5 0 0 0-5-5Z"/><path d="M15 19h18M15 25h11"/></svg><h2>Revisa tus entrenamientos</h2><p>Pregunta por tus fallos, compara sesiones o prepara la siguiente.</p><div class="chatSuggestions">${['Analízame la sesión de hoy','Analiza todos mis tiros','¿Cuándo tiro mejor?'].map(q=>`<button type="button" data-coach-prompt="${esc(q)}">${esc(q)}<span aria-hidden="true">↗</span></button>`).join('')}</div></div>`;
    if(!this.historyOpen&&pending)html+=`<article class="chatMessage user"><div>${this.format(pending.question)}</div></article><article class="chatMessage assistant chatThinking" role="status" aria-label="El entrenador está pensando"><small>Entrenador</small><i></i><i></i><i></i></article>`;
    if(!this.historyOpen&&this.error)html+=`<p class="chatError" role="alert">${esc(this.error)}</p>`;
    if(this.lastHTML!==html){thread.innerHTML=html;this.lastHTML=html;thread.scrollTop=this.historyOpen?0:thread.scrollHeight;}
    thread.setAttribute('role',this.historyOpen?'region':'log');
    thread.setAttribute('aria-label',this.historyOpen?'Historial de chats':'Conversación con el entrenador');
    document.getElementById('coachForm').hidden=this.historyOpen;
    document.getElementById('coachHistoryToggle').setAttribute('aria-expanded',String(this.historyOpen));
    document.getElementById('coachHistoryToggle').textContent=this.historyOpen?'Volver al chat':'Historial';
    document.getElementById('coachBusy').hidden=this.historyOpen||!this.pending||!!pending;
    document.getElementById('coachSend').disabled=!!this.pending||!document.getElementById('coachInput').value.trim();
    document.getElementById('coachInput').setAttribute('aria-busy',String(!!this.pending));
  },
  send() {
    const field=document.getElementById('coachInput'),question=field.value.trim();if(this.pending||this.historyOpen||!question)return;
    if(!this.current)this.newChat();
    if(!window.Native?.chatCoach){this.error='Abre el entrenador desde la app Android.';this.render();return;}
    const previous=this.messages().slice(-12).map(m=>({role:m.role,content:(m.role==='user'?`Sobre ${m.scope}: ${m.content}`:m.content).slice(0,m.role==='user'?2000:6000)}));
    while(previous.reduce((n,m)=>n+m.content.length,0)>24000)previous.shift();
    const sessions=CoachAgent.local(store.list(),curSess),catalog=CoachAgent.catalog(sessions,curSess),last=this.messages().slice().reverse().find(m=>m.role==='user'&&m.selection);
    const selection=last?.selection==='all'?catalog.sessions.map(s=>s.id):Array.isArray(last?.selection)?last.selection.map(id=>sessions.findIndex(s=>s.id===id)+1).filter(id=>id>0):[];
    const payload={version:CoachAgent.VERSION,stage:'plan',question,messages:previous,catalog,previous:selection,plan:null,data:null};
    this.error='';this.current.error='';this.current.draft=question;this.current.updatedAt=Date.now();
    if(!this.chats.includes(this.current))this.chats.push(this.current);
    this.save();
    this.pending={id:Date.now()+'-'+Math.random().toString(36).slice(2),question,scope:'',sessions,current:curSess,payload,chat:this.current};
    field.value='';field.style.height='';this.render();
    this.request(payload);
  },
  request(payload) {
    const p=this.pending;try{
      if(!CoachAgent.validPacket(payload))throw Error('No se pudo preparar la pregunta con estos datos.');const json=JSON.stringify(payload);
      if(new TextEncoder().encode(json).length>CoachAgent.MAX_BYTES)throw Error('Estos datos superan el tamaño admitido. No se ha omitido ninguna sesión: puedes pedir un intervalo de fechas.');
      p.timer=setTimeout(()=>this.receive(p.id,'','La respuesta está tardando demasiado. Vuelve a intentarlo.'),CoachAgent.UI_TIMEOUT_MS);
      const error=Native.chatCoach(p.id,json);if(error)this.receive(p.id,'',error);
    }catch(e){this.receive(p.id,'',e.message||'No se pudo enviar la pregunta.');}
  },
  receive(id,json,error) {
    const pending=this.pending;if(!pending||pending.id!==id)return;clearTimeout(pending.timer);
    try {
      if(error)throw Error(error);const result=JSON.parse(json);
      if(result.version!==CoachAgent.VERSION||typeof result.model!=='string'||result.model.length>100)throw Error('La respuesta recibida no es válida.');
      if(result.plan&&pending.payload.stage==='plan'){
        const plan=result.plan,p= pending.payload;if(!CoachAgent.validPlan(plan,p.catalog)||plan.scope==='refuse')throw Error('No se pudo identificar qué sesiones revisar.');
        if(!CoachAgent.validReads(plan,p.catalog,p.previous))throw Error('El detalle solicitado no corresponde a estas sesiones.');
        pending.payload=CoachAgent.fit({...p,stage:'answer',plan,data:CoachAgent.answerData(pending.sessions,pending.current,plan,p.catalog,p.previous)});
        const ids=CoachAgent.included(pending.payload);pending.selection=plan.scope==='all'&&!pending.payload.omitted?.length?'all':ids.map(id=>pending.sessions[id-1].id);
        pending.scope=pending.payload.omitted?.length?`Últimas ${ids.length} sesiones`:plan.scope==='all'?'Todas las sesiones':plan.scope==='general'?'Tiro con arco':plan.scope==='dates'?`${plan.start} a ${plan.end}`:ids.map(id=>p.catalog.sessions[id-1].day).join(', ').slice(0,100);
        pending.id+='-answer';this.request(pending.payload);return;
      }
      if(typeof result.answer!=='string'||!result.answer.trim()||result.answer.length>CoachAgent.MAX_ANSWER_CHARS)throw Error('La respuesta recibida no es válida.');
      pending.chat.messages=[...pending.chat.messages,{role:'user',content:pending.question,scope:pending.scope,selection:pending.selection||null},{role:'assistant',content:result.answer,scope:pending.scope}].slice(-80);
      pending.chat.draft='';pending.chat.updatedAt=Date.now();this.save();
    }catch(e){
      pending.chat.error=e.message||'No se pudo recibir la respuesta.';
      if(pending.chat===this.current){this.error=pending.chat.error;const field=document.getElementById('coachInput');if(!field.value)field.value=pending.question;}
    }
    this.pending=null;this.render();
  }
};
document.getElementById('coachForm').onsubmit=e=>{e.preventDefault();CoachUI.send();};
document.getElementById('coachInput').oninput=e=>{e.target.style.height='auto';e.target.style.height=Math.min(e.target.scrollHeight,120)+'px';CoachUI.render();};
document.getElementById('coachInput').onkeydown=e=>{if(e.key==='Enter'&&!e.shiftKey&&!e.isComposing){e.preventDefault();CoachUI.send();}};
document.getElementById('coachNewChat').onclick=()=>CoachUI.newChat();
document.getElementById('coachHistoryToggle').onclick=()=>CoachUI.toggleHistory();
document.getElementById('coachThread').onclick=e=>{
  const id=e.target.closest('[data-coach-chat]')?.dataset.coachChat;if(id){CoachUI.openChat(id);return;}
  const q=e.target.closest('[data-coach-prompt]')?.dataset.coachPrompt;if(q){document.getElementById('coachInput').value=q;CoachUI.send();}
};
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'&&!window.Native)CoachUI.resume();});
window.visualViewport?.addEventListener('resize',()=>{if(view==='Coach'){const t=document.getElementById('coachThread');t.scrollTop=t.scrollHeight;}});
const coachBaseRender=render;
render=function(){coachBaseRender();CoachUI.render();};
CoachUI.newChat();
