// Traza de apunte en vivo desde el sensor del arco (estilo shot-trainer).
(() => {
  const main = document.getElementById('vSession');
  if (!main) return;
  const css = document.createElement('style');
  css.textContent = `
  #aimLive { background:#141416; border-radius:18px; padding:12px 14px; margin:0 0 12px; display:none; }
  #aimLive .row { display:flex; align-items:center; gap:10px; }
  #aimLive canvas { width:100%; height:180px; display:block; border-radius:12px; background:#0e0e10; margin-top:10px; }
  #aimLive b { font-size:22px; font-weight:600; color:#fff; font-variant-numeric:tabular-nums; }
  #aimLive small { color:var(--txt-3,#888); font-size:12px; }
  #aimLive .pills { margin-left:auto; display:flex; gap:6px; }
  #aimLive .pills button { border:0; border-radius:999px; padding:6px 12px; background:var(--surface-2,#1e1e22); color:var(--txt-2,#ccc); font-size:12px; }`;
  document.head.appendChild(css);
  main.insertAdjacentHTML('afterbegin', `<section id="aimLive"><div class="row"><b id="aimHold">0.0 s</b><small id="aimRate"></small>
    <div class="pills"><button id="aimEnd">Terminar</button></div></div><canvas id="aimCanvas"></canvas></section>`);
  const card = document.getElementById('aimLive'), cv = document.getElementById('aimCanvas');
  const cmd = (action, extra) => { try { const e = window.Native?.command?.(JSON.stringify({action, ...(extra || {})})); if (e && window.notice) notice(e); } catch (_) {} };
  document.getElementById('aimEnd').onclick = () => cmd('end');
  const trail = [];
  let raf = 0, lastAt = 0;
  function draw() {
    raf = 0;
    const dpr = window.devicePixelRatio || 1, w = cv.clientWidth, h = cv.clientHeight;
    if (cv.width !== w * dpr) { cv.width = w * dpr; cv.height = h * dpr; }
    const g = cv.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, w, h);
    const acc = getComputedStyle(document.documentElement).getPropertyValue('--acc').trim() || '#FF8A1F';
    const cx = w / 2, cy = h / 2, r = Math.min(w, h) / 2 - 8;
    g.strokeStyle = 'rgba(255,255,255,.08)'; g.lineWidth = 1;
    [1, .66, .33].forEach(k => { g.beginPath(); g.arc(cx, cy, r * k, 0, 7); g.stroke(); });
    if (!trail.length) return;
    const last = trail[trail.length - 1], scale = r / 1.5;   // radio exterior = 1,5°
    g.lineWidth = 2; g.lineCap = 'round';
    for (let i = 1; i < trail.length; i++) {
      const a = trail[i - 1], b = trail[i];
      g.strokeStyle = b.steady ? acc : 'rgba(255,255,255,.35)';
      g.globalAlpha = i / trail.length;
      g.beginPath();
      g.moveTo(cx + (a.x - last.x) * scale, cy - (a.y - last.y) * scale);
      g.lineTo(cx + (b.x - last.x) * scale, cy - (b.y - last.y) * scale);
      g.stroke();
    }
    g.globalAlpha = 1; g.fillStyle = acc; g.beginPath(); g.arc(cx, cy, 4, 0, 7); g.fill();
  }
  window.sensorLive = (x, y, steady, hold, rate) => {
    const now = Date.now();
    trail.push({x, y, steady, t: now});
    while (trail.length && now - trail[0].t > 3000) trail.shift();
    if (now - lastAt > 250) {
      lastAt = now;
      card.style.display = 'block';
      document.getElementById('aimHold').textContent = (hold / 1000).toFixed(1) + ' s';
      document.getElementById('aimRate').textContent = rate ? Math.round(rate) + ' Hz' : '';
    }
    if (!raf) raf = requestAnimationFrame(draw);
  };

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
})();
