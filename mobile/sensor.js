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
    <div class="pills"><button id="aimEnd">Terminar</button><button id="aimScan">Buscar</button></div></div><canvas id="aimCanvas"></canvas></section>`);
  const card = document.getElementById('aimLive'), cv = document.getElementById('aimCanvas');
  const cmd = action => { try { const e = window.Native?.command?.(JSON.stringify({action})); if (e && window.notice) notice(e); } catch (_) {} };
  document.getElementById('aimEnd').onclick = () => cmd('end');
  document.getElementById('aimScan').onclick = () => cmd('rescan');
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
})();
