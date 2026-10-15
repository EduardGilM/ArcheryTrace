// Solo navegador de pruebas; conserva y restaura sesiones, recibos y puente.
async () => {
  const saved=localStorage.getItem('atSessions'), native=window.Native, confirmation=window.confirm, results=[];
  const check=(condition,name)=>{if(!condition)throw Error(name);results.push(name);};
  const sid='training-test', shot=(eid,t,set=1,manual=false)=>({sid,kind:'shot',eid,t,set,manual,score:80,peak:4000,instab:100,settle:200,dt:50,tx:[10,20,30],ty:[-20,10,0],mp:[1000,1010],mq:[4000,1100],state:{currentSet:set,target:3,profile:'Equipo A',metric:2}});
  try {
    store.save([]);curSess=null;data={shots:[]};historyMode=false;window.confirm=()=>true;
    liveEvent({sid,kind:'start',eid:1,state:{currentSet:1,target:3,profile:'Equipo A'}});
    check(view==='Session'&&live&&curSess.sensorId===sid&&!data.shots.length,'Inicio del sensor abre sesión móvil antes de la primera flecha');
    curSess=null;live=false;data={shots:[]};await boot();
    check(live&&curSess.sensorId===sid&&!data.shots.length,'Reabrir móvil restaura actividad sin flechas');
    liveEvent(shot(2,1000));liveEvent(shot(3,3000));liveEvent({...shot(4,5000),state:{currentSet:1,target:3,ends:[{id:1,reason:'target'}],resting:true}});
    check(curSess.ends.length===1&&data.shots.length===3,'Objetivo cierra tanda sin perder última flecha');
    liveEvent(shot(4,5000));check(data.shots.length===3,'Evento duplicado no duplica flecha');
    show('Set');cur=0;liveEvent(shot(5,9000,2));check(view==='Set'&&cur===0,'Nuevo set no cambia selección de revisión');
    let sent;window.Native={command:json=>{sent=JSON.parse(json);return '';}};
    trainingAction('target',6);check(sent.action==='target'&&sent.value===6&&curSess.target===3,'Cambio remoto espera confirmación del sensor');
    removeSelection('shot');check(sent.action==='remove'&&sent.value[0]===1000&&data.shots.length===4,'Borrado remoto conserva datos hasta confirmación');
    liveEvent({sid,kind:'remove',eid:6,times:[1000]});check(data.shots.length===3,'Confirmación aplica eliminación');
    liveEvent({...shot(7,1000),state:undefined});check(data.shots.length===3,'Reenvío de flecha borrada permanece eliminado');
    liveEvent({...shot(8,11000,2,true),state:{currentSet:2,target:3}});show('Shot');cur=data.shots.length-1;render();
    check($('mScore').textContent==='Manual'&&$('mPeak').textContent==='–','Manual carece de métricas inventadas');
    check(Training.summary(data.shots).score===80,'Manual no reduce la estabilidad media');
    liveEvent({sid,kind:'layout',eid:9,layout:[[3000,1],[5000,2],[9000,2],[11000,2]]});
    check(data.shots.find(s=>s.t_ms===5000).set_id===2,'Corrección de límites actualiza flechas existentes');
    liveEvent({sid,kind:'end',eid:10});check(!data.shots.length&&!curSess&&view==='Session','Finalizar deja sesión actual vacía');
    liveEvent({sid,kind:'end',eid:10});check(!store.list()[0].live&&store.list()[0].shots.length===4,'Final duplicado conserva historial y sesión cerrada');
    show('History');document.querySelector('#histList [data-sess]').click();
    cur=2;trainingAction('split');check(sets(data.shots).length===3,'Dividir tanda archivada conserva otras tandas');
    trainingAction('merge');check(sets(data.shots).length===2,'Unir tanda archivada al anterior');
    trainingAction('close');trainingAction('reopen');check(!displayedSession().ends.some(e=>e.id===data.shots[cur].set_id),'Reabrir tanda archivada persiste');
    const before=store.list().length,json=JSON.stringify({format:'ArcheryTrace',version:2,sessions:store.list()});
    restoreBackup(json);check(store.list().length===before,'Importar copia existente no duplica sesiones');
    restoreBackup('{bad');check(store.list().length===before,'Copia inválida no modifica historial');
    const session=store.list()[0];session.shots.push({...session.shots[0],t_ms:20000,profile:'Equipo B'});store.save([session]);
    show('Progress');check($('progressProfile').options.length===2,'Progreso separa perfiles de equipo');
    show('Shot');cur=0;render();$('compareShot').value='1';render();
    check(![...document.querySelectorAll('main,header,nav')].some(x=>x.textContent.includes('NaN')),'Interfaz no muestra NaN');
    return {passed:results.length,results};
  } finally {
    window.Native=native;window.confirm=confirmation;
    if(saved===null)localStorage.removeItem('atSessions');else localStorage.setItem('atSessions',saved);
    historyMode=false;curSess=null;data={shots:[]};live=false;show('Session');liveStatus('');$('notice').hidden=true;
  }
}

