/* Conversación local; Android realiza las consultas sin exponer credenciales a la WebView. */
const CoachUI = {
  pending:null,error:'',memory:null,
  messages() {
    if(this.memory)return this.memory;
    try {const a=JSON.parse(localStorage.getItem('atCoachChat')||'[]');return Array.isArray(a)?a.filter(m=>m&&['user','assistant'].includes(m.role)&&typeof m.content==='string'&&m.content.length<=10000&&typeof m.scope==='string'&&m.scope.length<=100).slice(-80):[];}catch{return [];}
  },
  format(text) { return escapeText(text).replace(/^#{1,3} (.+)$/gm,'<strong>$1</strong>').replace(/\*\*([^*\n]+)\*\*/g,'<strong>$1</strong>').replace(/^[-*] /gm,'• '); },
  render() {
    if(view!=='Coach')return;
    const messages=this.messages(),esc=escapeText,thread=document.getElementById('coachThread');
    let html=messages.length?messages.map(m=>`<article class="chatMessage ${m.role}">${m.role==='assistant'?'<small>Entrenador</small>':''}<div>${this.format(m.content)}</div></article>`).join(''):this.pending?'':`<div class="chatWelcome"><svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M38 8H10a5 5 0 0 0-5 5v18a5 5 0 0 0 5 5h6l8 7v-7h14a5 5 0 0 0 5-5V13a5 5 0 0 0-5-5Z"/><path d="M15 19h18M15 25h11"/></svg><h2>Revisa tus entrenamientos</h2><p>Pregunta por tus fallos, compara sesiones o prepara la siguiente.</p><div class="chatSuggestions">${['Analízame la sesión de hoy','Analiza todos mis tiros','¿Cuándo tiro mejor?'].map(q=>`<button type="button" data-coach-prompt="${esc(q)}">${esc(q)}<span aria-hidden="true">↗</span></button>`).join('')}</div></div>`;
    if(this.pending)html+=`<article class="chatMessage user"><div>${this.format(this.pending.question)}</div></article><article class="chatMessage assistant chatThinking" role="status" aria-label="El entrenador está pensando"><small>Entrenador</small><i></i><i></i><i></i></article>`;
    if(this.error)html+=`<p class="chatError" role="alert">${esc(this.error)}</p>`;
    if(this.lastHTML!==html){thread.innerHTML=html;this.lastHTML=html;thread.scrollTop=thread.scrollHeight;}
    document.getElementById('coachSend').disabled=!!this.pending||!document.getElementById('coachInput').value.trim();
    document.getElementById('coachInput').setAttribute('aria-busy',String(!!this.pending));
  },
  send() {
    const field=document.getElementById('coachInput'),question=field.value.trim();if(this.pending||!question)return;
    if(!window.Native?.chatCoach){this.error='Abre el entrenador desde la app Android.';this.render();return;}
    const previous=this.messages().slice(-12).map(m=>({role:m.role,content:(m.role==='user'?`Sobre ${m.scope}: ${m.content}`:m.content).slice(0,m.role==='user'?2000:6000)}));
    while(previous.reduce((n,m)=>n+m.content.length,0)>24000)previous.shift();
    const sessions=CoachAgent.local(store.list(),curSess),catalog=CoachAgent.catalog(sessions,curSess),last=this.messages().slice().reverse().find(m=>m.role==='user'&&m.selection);
    const selection=last?.selection==='all'?catalog.sessions.map(s=>s.id):Array.isArray(last?.selection)?last.selection.map(id=>sessions.findIndex(s=>s.id===id)+1).filter(id=>id>0):[];
    const payload={version:CoachAgent.VERSION,stage:'plan',question,messages:previous,catalog,previous:selection,plan:null,data:null};
    this.error='';this.pending={id:Date.now()+'-'+Math.random().toString(36).slice(2),question,scope:'',sessions,current:curSess,payload};
    field.value='';field.style.height='';this.render();
    this.request(payload);
  },
  request(payload) {
    const p=this.pending;try{
      if(!CoachAgent.validPacket(payload))throw Error('No se pudo preparar la pregunta con estos datos.');const json=JSON.stringify(payload);
      if(new TextEncoder().encode(json).length>CoachAgent.MAX_BYTES)throw Error('Estos datos superan el tamaño admitido. No se ha omitido ninguna sesión: puedes pedir un intervalo de fechas.');
      p.timer=setTimeout(()=>this.receive(p.id,'','La respuesta está tardando demasiado. Vuelve a intentarlo.'),90000);
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
        const ids=CoachAgent.select(plan,p.catalog,p.previous);pending.selection=plan.scope==='all'?'all':ids.map(id=>pending.sessions[id-1].id);
        pending.scope=plan.scope==='all'?'Todas las sesiones':plan.scope==='general'?'Tiro con arco':plan.scope==='dates'?`${plan.start} a ${plan.end}`:ids.map(id=>p.catalog.sessions[id-1].day).join(', ').slice(0,100);
        pending.payload={...p,stage:'answer',plan,data:CoachAgent.data(pending.sessions,pending.current,plan,p.catalog,p.previous)};pending.id+='-answer';this.request(pending.payload);return;
      }
      if(typeof result.answer!=='string'||!result.answer.trim()||result.answer.length>10000)throw Error('La respuesta recibida no es válida.');
      this.memory=[...this.messages(),{role:'user',content:pending.question,scope:pending.scope,selection:pending.selection||null},{role:'assistant',content:result.answer,scope:pending.scope}].slice(-80);
      try{localStorage.setItem('atCoachChat',JSON.stringify(this.memory));}catch{notice('La respuesta se muestra, pero no queda espacio para guardar el chat.');}
    }catch(e){this.error=e.message||'No se pudo recibir la respuesta.';const field=document.getElementById('coachInput');if(!field.value)field.value=pending.question;}
    this.pending=null;this.render();
  }
};
document.getElementById('coachForm').onsubmit=e=>{e.preventDefault();CoachUI.send();};
document.getElementById('coachInput').oninput=e=>{e.target.style.height='auto';e.target.style.height=Math.min(e.target.scrollHeight,120)+'px';CoachUI.render();};
document.getElementById('coachInput').onkeydown=e=>{if(e.key==='Enter'&&!e.shiftKey&&!e.isComposing){e.preventDefault();CoachUI.send();}};
document.getElementById('coachThread').onclick=e=>{const q=e.target.closest('[data-coach-prompt]')?.dataset.coachPrompt;if(q){document.getElementById('coachInput').value=q;CoachUI.send();}};
window.visualViewport?.addEventListener('resize',()=>{if(view==='Coach'){const t=document.getElementById('coachThread');t.scrollTop=t.scrollHeight;}});
const coachBaseRender=render;
render=function(){coachBaseRender();CoachUI.render();};
