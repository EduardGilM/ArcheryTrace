// Ejecutar esta función en el navegador de pruebas, nunca sobre una sesión real.
async () => {
  const saved = localStorage.getItem('atSessions'), receipt = localStorage.getItem('atReceipt'), results = [], originalConfirm = window.confirm;
  const check = (ok, message) => { if (!ok) throw Error(message); results.push(message); };
  const shot = (t = 1000, score = 80, trace = true) => ({t, score, peak:2200, instab:120, settle:100, tx:trace ? [1,2,3] : [], ty:trace ? [3,2,1] : []});
  const reset = () => { localStorage.removeItem('atSessions'); curSess = null; liveStart(); };
  try {
    reset(); liveShot(shot()); show('Session'); show('Set'); liveEnd();
    check(!document.querySelectorAll('#setList details,#setArrows [data-jump],#legend span,#trend [data-shot]').length, 'Vaciar elimina flechas, sets, leyendas y barras');
    show('Shot'); step(1); play();
    check(cur === 0 && document.getElementById('play').disabled && document.getElementById('mScore').textContent === '–', 'Tiro vacío no reproduce ni navega');
    show('History'); document.querySelector('#histList [data-sess]').click(); show('Set'); backToCurrent(); show('Set');
    check(!data.shots.length && !document.querySelector('#setArrows [data-jump]'), 'Salir del historial recupera el estado vacío en Set');
    reset(); liveShot(shot(1000)); liveShot(shot(62001,70));
    show('History'); document.querySelector('#histList [data-sess]').click();
    check(cur === 0 && historyMode, 'Abrir historial reinicia la flecha seleccionada');
    const selected = data.shots.length; liveShot(shot(64001,90));
    check(historyMode && data.shots.length === selected, 'Un tiro en vivo no sustituye la sesión que se está consultando');
    backToCurrent(); check(data.shots.length === 3 && !historyMode, 'Volver a actual recupera tiros recibidos durante la consulta');
    liveStart(); check(store.list().some(s => s.shots.length === 3 && !s.live), 'Iniciar actividad conserva la sesión anterior');
    liveShot(shot(1000,75,false)); show('Set');
    check(document.querySelectorAll('#setArrows [data-jump]').length === 1, 'Set admite una flecha sin traza');
    liveShot(shot(3000)); show('Shot'); play(); show('History');
    check(anim === null && document.getElementById('play').textContent === 'Reproducir', 'Cambiar de página detiene la reproducción');
    show('Shot');
    const raf = window.requestAnimationFrame; let frame;
    try { window.requestAnimationFrame = f => { frame = f; return 123; }; play(); frame(performance.now()+4000); }
    finally { window.requestAnimationFrame = raf; }
    check(anim === null, 'Reproducción llega al último punto sin excepción');
    liveEnd(); const sample = store.list().find(s => s.shots.length).shots[0];
    store.save([{id:100000,shots:[{...sample,aim_score:50}]},{id:200000,shots:[{...sample,aim_score:90}]}]);
    show('Progress');
    check(document.getElementById('progSum').textContent.includes('última 90') && document.getElementById('progSum').textContent.includes('▲40'), 'Progreso compara las últimas sesiones en orden cronológico');
    check(document.getElementById('nShot').nextElementSibling.id === 'nProgress' && document.getElementById('nProgress').nextElementSibling.id === 'nSet' && !document.querySelector('#vHistory #progress'), 'Casita entre Tiro y Set y progreso separado del historial');
    store.save([]); render();
    check(!document.getElementById('progSum').textContent && document.getElementById('progress').style.display === 'none', 'Progreso vacío no conserva resumen ni gráfica');
    data = {shots:Array.from({length:200},(_,i)=>({...sample,t_ms:i*2000}))}; show('Session');
    document.querySelectorAll('#setList details').forEach(d => { d.open = true; });
    check(document.querySelectorAll('#setList .trendRow').length === 200 && [...document.querySelectorAll('#setList .trendRow')].every(b=>b.offsetHeight>=44), 'Sesiones largas conservan una fila legible por flecha');
    check(!document.querySelectorAll('[id="aimwrap"]').length, 'Sin identificadores duplicados de la diana');
    reset(); liveShot(shot(1000)); liveShot(shot(3000)); liveShot(shot(70001));
    removeSelection('shot');
    check(data.shots.length === 2, 'Eliminar la flecha actual la quita de la sesión');
    liveShot(shot(70001));
    check(data.shots.length === 2, 'Eliminar flecha en vivo ignora reenvíos del sensor');
    show('Set'); removeSelection('set');
    check(data.shots.length === 0 && !document.querySelector('#setArrows [data-jump]'), 'Eliminar set elimina sus flechas y limpia la vista');
    curSess = null; liveShot(shot(1000));
    check(data.shots.length === 0, 'Marcas de eliminación sobreviven a restaurar la sesión');
    liveShot(shot(90001)); removeSelection('session'); liveShot(shot(90001));
    check(data.shots.length === 0 && !store.list().some(s => s.live && s.shots.length), 'Eliminar sesión en vivo no reaparece por un reenvío');
    liveShot(shot(95001)); liveShot(shot(100001)); liveShot(shot(105001)); liveShot(shot(170001)); liveEnd(); show('History');
    document.querySelector('#histList [data-sess]').click(); removeSelection('set');
    check(data.shots.length === 1 && historyMode, 'Eliminar set del historial conserva el resto de la sesión');
    removeSelection('shot');
    check(view === 'History' && !store.list().some(s => s.shots.length), 'Eliminar última flecha archivada retira la sesión vacía');
    reset(); liveShot(shot()); liveEnd(); show('History');
    document.querySelector('#histList [data-delete]').click();
    check(!store.list().some(s => s.shots.length), 'Papelera del historial elimina la sesión completa');
    reset(); liveShot(shot(1000)); liveShot(shot(41000)); liveShot(shot(81000));
    cur = 1; removeSelection('shot');
    check(sets(data.shots).length === 1 && sets(store.list().find(s => s.live).shots).length === 1, 'Borrar flecha intermedia conserva identidad de tanda al recargar');
    show('Set'); cur = 0; liveShot(shot(90000));
    check(view === 'Set' && cur === 0, 'Recibir un tiro conserva pantalla y flecha en revisión');
    reset(); liveStart('test-sensor'); liveShot({...shot(),sid:'test-sensor'}); liveStart('test-sensor');
    check(store.list().filter(s=>s.sensorId==='test-sensor').length === 1 && data.shots.length === 1, 'Reenviar inicio con sid no vacía ni duplica sesión');
    liveEnd('test-sensor'); show('History'); document.querySelector('#histList [data-sess]').click();
    removeSelection('session'); liveShot({...shot(),sid:'test-sensor'});
    check(!store.list().some(s=>s.shots.length), 'Borrado archivado con sid resiste retransmisión del sensor');
    localStorage.removeItem('atReceipt'); let applied = 0;
    check(receiveNative(1,()=>applied++) && receiveNative(1,()=>applied++) && applied === 1, 'Recibo nativo evita doble aplicación');
    check(!receiveNative(2,()=>{throw Error('test');}) && localStorage.getItem('atReceipt') === '1', 'Evento fallido no confirma recibo');
    check(receiveNative(2,()=>applied++) && applied === 2, 'Evento fallido se puede reintentar');
    return {passed:results.length, results};
  } finally {
    window.confirm = originalConfirm;
    stopPlayback(); if (saved === null) localStorage.removeItem('atSessions'); else localStorage.setItem('atSessions',saved);
    if (receipt === null) localStorage.removeItem('atReceipt'); else localStorage.setItem('atReceipt',receipt);
    data = {shots:[]}; curSess = null; live = false; historyMode = false; show('Session');
    liveStatus('');
  }
}
