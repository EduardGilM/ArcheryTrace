// Traza de apunte en vivo desde el sensor del arco (estilo shot-trainer).
(() => {
  const main = document.getElementById('vSession');
  if (!main) return;
  const cmd = (action, extra) => { try { const e = window.Native?.command?.(JSON.stringify({action, ...(extra || {})})); if (e && window.notice) notice(e); } catch (_) {} };
  window.sensorLive = () => {};   // sin tarjeta de apunte en vivo: las sesiones son automáticas
  // ---- Sensor: vincular (solo WIT muy cerca), desconectar, desemparejar ----
  const NEAR_RSSI = -47, NEAR_READS = 3;   // ~<40 cm; media de varias lecturas
  const css2 = document.createElement('style');
  css2.textContent = `
  #sensorSheet { position:fixed; inset:0; z-index:60; background:rgba(0,0,0,.55); display:flex; align-items:flex-end; }
  #sensorSheet[hidden] { display:none; }
  #sensorSheet .box { width:100%; background:#141416; border-radius:22px 22px 0 0; padding:18px 16px calc(18px + env(safe-area-inset-bottom)); }
  #sensorSheet h3 { margin:0 0 4px; font-size:17px; font-weight:600; color:#fff; }
  #sensorSheet p { margin:0 0 14px; font-size:13px; color:var(--txt-3,#888); }
  #sensorSheet .dev { display:flex; align-items:center; gap:10px; width:100%; border:1px solid transparent; border-radius:999px; background:#1c1c1e; color:#fff; padding:12px 16px; margin:0 0 8px; font-size:14px; text-align:left; }
  #sensorSheet .dev small { margin-left:auto; color:var(--acc); font-size:12px; }
  #sensorSheet .acts { display:flex; gap:8px; }
  #sensorSheet .acts button { flex:1; border:0; border-radius:999px; padding:12px 14px; background:#1c1c1e; color:var(--txt-2,#ccc); font-size:14px; }
  #sensorSheet .acts button.main { background:var(--acc); color:#000; font-weight:600; }
  #sensorSheet .pulse { width:8px; height:8px; border-radius:50%; background:var(--acc); display:inline-block; margin-right:8px; animation:snsP 1.2s ease-in-out infinite; }
  @keyframes snsP { 50% { opacity:.25; } }`;
  document.head.appendChild(css2);
  document.body.insertAdjacentHTML('beforeend', '<div id="sensorSheet" hidden><div class="box" id="sensorBox"></div></div>');
  const sheet = document.getElementById('sensorSheet'), box = document.getElementById('sensorBox');
  const esc = t => String(t).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  let scanning = false;
  const diag = () => { try { return JSON.parse(window.Native?.diagnostics?.() || 'null') || {}; } catch (_) { return {}; } };
  function close() { if (scanning) { cmd('stopScan'); scanning = false; } sheet.hidden = true; window.refreshLink && refreshLink(); }
  sheet.onclick = e => { if (e.target === sheet) close(); };
  function scanView(list, done) {
    const near = (list || []).filter(d => d.rssi >= NEAR_RSSI && d.n >= NEAR_READS).sort((a, b) => b.rssi - a.rssi);
    box.innerHTML = `<h3>Vincular sensor</h3><p>${near.length ? 'Toca tu sensor para vincularlo.' : (done ? 'No hay ningún sensor cerca.' : '<span class="pulse"></span>Enciende el sensor y acércalo al móvil.')}</p>`
      + near.map(d => `<button class="dev" data-a="${esc(d.address)}" data-n="${esc(d.name)}">${esc(d.name)}<small>Cerca</small></button>`).join('')
      + `<div class="acts">${done ? '<button class="main" id="snsRetry">Buscar de nuevo</button>' : ''}<button id="snsClose">Cerrar</button></div>`;
    box.querySelectorAll('.dev').forEach(b => b.onclick = () => { cmd('pair', {value: b.dataset.a, name: b.dataset.n}); scanning = false; close(); notice && notice('Sensor vinculado'); });
    const r = document.getElementById('snsRetry'); if (r) r.onclick = startScan;
    document.getElementById('snsClose').onclick = close;
  }
  function startScan() { scanning = true; scanView([], false); cmd('scan'); }
  window.sensorScan = (list, done) => { if (sheet.hidden || !scanning) return; if (done) scanning = false; scanView(list, done); };
  function pairedView(d) {
    const name = esc(d.name || 'Sensor');
    const state = d.connected ? (d.rate ? Math.round(d.rate) + ' Hz' : 'Conectado') : d.paused ? 'Desconectado' : 'Esperando a que se encienda';
    box.innerHTML = `<h3>${name}</h3><p>${state}</p><div class="acts">`
      + (d.connected ? '<button class="main" id="snsOff">Desconectar</button>' : d.paused ? '<button class="main" id="snsOn">Conectar</button>' : '')
      + '<button id="snsForget">Desemparejar</button></div>';
    const off = document.getElementById('snsOff'), on = document.getElementById('snsOn');
    if (off) off.onclick = () => { cmd('disconnect'); close(); };
    if (on) on.onclick = () => { cmd('connect'); close(); };
    document.getElementById('snsForget').onclick = () => { cmd('forget'); startScan(); };
  }
  window.openSensorScan = () => {
    if (!window.Native?.command) return;
    const d = diag();
    sheet.hidden = false;
    if (d.paired) pairedView(d); else startScan();
  };

  // ---- Grabar datos crudos (CSV nativo) ----
  const css3 = document.createElement('style');
  css3.textContent = `
  #rawBtn { display:flex; align-items:center; justify-content:center; gap:8px; width:100%; height:40px; margin:8px 0 0; border:1px solid var(--line-2); border-radius:999px; background:transparent; color:var(--txt-2,#aaa); font-size:13px; font-weight:500; }
  #rawBtn.on { border-color:transparent; background:var(--acc-soft); color:var(--acc); font-weight:600; }
  #rawBtn i { display:none; width:7px; height:7px; border-radius:50%; background:#F0506E; }
  #rawBtn.on.rec i { display:block; animation:snsP 1.2s ease-in-out infinite; }
  #link.rec::after { content:""; width:6px; height:6px; border-radius:50%; background:#F0506E; margin-left:2px; }`;
  document.head.appendChild(css3);
  const anchor = document.getElementById('tandaBar') || document.getElementById('trainingStatus');
  const btnHtml = '<button id="rawBtn" type="button"><i></i><span>Grabar datos</span></button>';
  if (anchor) anchor.insertAdjacentHTML('afterend', btnHtml); else main.insertAdjacentHTML('afterbegin', btnHtml);
  const rawBtn = document.getElementById('rawBtn');
  function paintRaw() {
    const d = diag(), on = !!d.rawLog, rec = !!d.recording;
    rawBtn.hidden = !window.Native?.command;
    rawBtn.className = (on ? 'on' : '') + (rec ? ' rec' : '');
    rawBtn.querySelector('span').textContent = on ? (rec ? 'Grabando datos' : 'Grabar datos · espera sesión') : 'Grabar datos';
    const link = document.getElementById('link'); if (link) link.classList.toggle('rec', rec);
  }
  rawBtn.onclick = () => { const d = diag(); cmd('rawlog', {value: !d.rawLog}); setTimeout(paintRaw, 300); };
  paintRaw();
  setInterval(() => { if (document.visibilityState === 'visible') paintRaw(); }, 3000);
})();
