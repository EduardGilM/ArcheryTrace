/* Modo Avanzado: lectura de cada tiro por fases (apunte, final, suelta, seguimiento) y comparación del set. */
const Adv = {
  // Métricas de una flecha a partir de la traza guardada (3 s antes, 2,5 s después).
  metrics(s) {
    const t = s.trace_t || [], y = s.yaw_c?.length ? s.yaw_c : (s.yaw_deg || []), p = s.pitch_deg || [];
    if (!t.length || t.length !== y.length || y.length !== p.length) return null;
    // referencia = dónde apuntabas justo antes de soltar (media de −250 a −30 ms; la última muestra ya puede llevar el golpe)
    const ref = t.map((v, i) => i).filter(i => t[i] >= -250 && t[i] <= -30);
    const n = t.length, y0 = ref.length ? ref.reduce((a, i) => a + y[i], 0) / ref.length : y[n - 1], p0 = ref.length ? ref.reduce((a, i) => a + p[i], 0) / ref.length : p[n - 1];
    const r = t.map((_, i) => Math.hypot(y[i] - y0, p[i] - p0)), keep = t.map(v => v <= -30);
    const last = r.filter((_, i) => t[i] >= -1000 && t[i] <= -30).slice().sort((a, b) => a - b);
    const q = (a, f) => a.length ? a[Math.min(a.length - 1, Math.floor(f * a.length))] : NaN;
    const i300 = t.findIndex(v => v >= -300);
    const drift = i300 >= 0 ? Math.hypot(y[i300] - y0, p[i300] - p0) : NaN;  // de −300 ms a la referencia
    const pt = s.post_t || [], py = s.post_yaw || [], pp = s.post_pitch || [];
    const at = ms => { let k = -1; for (let i = 0; i < pt.length; i++) if (pt[i] <= ms) k = i; return k; };
    const k1 = at(120), k2 = at(1000);
    const flickX = k1 >= 0 ? py[k1] - y0 : NaN, flickY = k1 >= 0 ? pp[k1] - p0 : NaN;
    const follow = k2 >= 0 ? pp[k2] - p0 : NaN, followSide = k2 >= 0 ? py[k2] - y0 : NaN;
    return { t, r, y, p, y0, p0, pt, py, pp,
      hold: Number.isFinite(s.draw_ms) ? s.draw_ms / 1000 : NaN,
      band: q(last, 0.8), drift, flick: Math.hypot(flickX, flickY), flickX, flickY, follow, followSide,
      settle: Number.isFinite(s.settle_ms) ? s.settle_ms / 1000 : NaN, score: s.aim_score, peak: s.peak_mg / 1000 };
  },
  dist(mode) { return mode === 'Indoor' ? 18 : mode === 'Outdoor' ? 70 : 0; },
  cm(deg, d) { return d ? deg * Math.PI / 180 * d * 100 : NaN; },
  sd(a) { a = a.filter(Number.isFinite); if (a.length < 2) return NaN; const m = a.reduce((x, y) => x + y, 0) / a.length; return Math.sqrt(a.reduce((x, y) => x + (y - m) ** 2, 0) / (a.length - 1)); },
  mean(a) { a = a.filter(Number.isFinite); return a.length ? a.reduce((x, y) => x + y, 0) / a.length : NaN; }
};
if (typeof module !== 'undefined') module.exports = Adv;

(function () {
  if (typeof document === 'undefined' || !document.getElementById('vShot')) return;
  const $ = id => document.getElementById(id);
  const on = () => localStorage.getItem('atAdvanced') === '1';
  const f1 = v => Number.isFinite(v) ? v.toFixed(1).replace('.', ',') : '–';
  const f2 = v => Number.isFinite(v) ? v.toFixed(2).replace('.', ',') : '–';
  const css = document.createElement('style');
  css.textContent = `
  .advToggle{display:flex;align-items:center;justify-content:space-between;padding:4px 4px 0;color:var(--txt-2);font-size:13px}
  .advToggle button{height:30px;padding:0 14px;border-radius:999px;border:1px solid var(--line-2);background:transparent;color:var(--txt-2);font:inherit;font-size:12px;font-weight:600}
  .advToggle button.on{background:var(--acc-soft);color:var(--acc);border-color:transparent}
  .adv .cardTitle{display:flex;align-items:center;gap:6px}
  .adv canvas{width:100%;display:block}
  .adv .nums{display:grid;grid-template-columns:1fr 1fr;gap:10px 14px;margin-top:12px}
  .adv .nums div{display:flex;flex-direction:column;gap:2px}
  .adv .nums .lbl{font-size:11px;color:var(--txt-3);text-transform:none}
  .adv .nums b{font-size:20px;font-weight:600}
  .adv .nums small{font-size:11px;color:var(--txt-2)}
  .adv details.i{margin-top:10px;color:var(--txt-2);font-size:12px;line-height:1.45}
  .adv details.i summary{list-style:none;cursor:pointer;color:var(--txt-3);font-size:12px}
  .adv details.i summary::-webkit-details-marker{display:none}
  .adv .rows{display:grid;grid-template-columns:auto repeat(4,1fr);gap:6px 8px;font-size:12px;margin-top:10px;align-items:center}
  .adv .rows .h{color:var(--txt-3);font-size:11px}
  .adv .rows .o{color:var(--acc)}
  .adv .read{margin:10px 0 0;color:var(--txt-2);font-size:13px;line-height:1.5}`;
  document.head.appendChild(css);

  function toggleHtml(id) { return `<div class="advToggle" id="${id}"><span>Vista</span><button type="button">Avanzado</button></div>`; }
  $('vShot').insertAdjacentHTML('afterbegin', toggleHtml('advTgShot'));
  $('vSession').insertAdjacentHTML('afterbegin', toggleHtml('advTgSess'));
  $('shotScore').insertAdjacentHTML('afterend', '<section class="card adv" id="advShot" hidden></section>');
  $('setList').insertAdjacentHTML('beforebegin', '<section class="card adv" id="advSet" hidden></section>');
  ['advTgShot', 'advTgSess'].forEach(id => $(id).querySelector('button').onclick = () => {
    localStorage.setItem('atAdvanced', on() ? '0' : '1'); window.render();
  });

  function canvas(el, h) {
    const dpr = window.devicePixelRatio || 1, w = el.clientWidth || 340;
    el.width = w * dpr; el.height = h * dpr; el.style.height = h + 'px';
    const x = el.getContext('2d'); x.setTransform(dpr, 0, 0, dpr, 0, 0); return [x, w, h];
  }
  const FONT = '11px Geist, system-ui, sans-serif';
  const ACC = () => getComputedStyle(document.documentElement).getPropertyValue('--acc').trim() || '#FF8A1F';

  // Línea temporal de una flecha: arriba la distancia al punto de suelta (apunte), abajo el seguimiento.
  function drawShot(el, m) {
    const [x, W, H] = canvas(el, 230), acc = ACC();
    const L = 30, R = W - 8, T0 = -3000, T1 = 2500, X = t => L + (t - T0) / (T1 - T0) * (R - L);
    const top = 14, mid = 120, bot = 214;
    const hold = Number.isFinite(m.hold) ? m.hold * 1000 : 0;
    // fases
    const ph = [[Math.max(T0, -hold), -1000, 'Apunte', 'rgba(255,255,255,.03)'], [-1000, 0, 'Final', 'rgba(255,138,31,.07)'], [0, 120, '', 'rgba(255,138,31,.25)'], [120, T1, 'Seguimiento', 'rgba(255,255,255,.03)']];
    if (hold < 3000) ph.unshift([T0, -hold, 'Subida', 'rgba(255,255,255,.015)']);
    x.font = FONT; x.textBaseline = 'top';
    ph.forEach(([a, b, l, c]) => { if (b <= a) return; x.fillStyle = c; x.fillRect(X(a), top, X(b) - X(a), bot - top); if (l) { x.fillStyle = '#5c5c64'; x.fillText(l, X(a) + 4, top + 2); } });
    // apunte: distancia (°) al punto de suelta
    const rMax = Math.max(0.3, Math.min(2, Math.max(...m.r.filter((_, i) => m.t[i] >= -3000)) * 1.05));
    const Y = v => mid - Math.min(v, rMax) / rMax * (mid - top - 16);
    // banda de estabilidad (80 % del último segundo)
    x.fillStyle = 'rgba(255,138,31,.16)'; x.fillRect(X(-1000), Y(m.band), X(0) - X(-1000), mid - Y(m.band));
    x.beginPath(); m.t.forEach((t, i) => { if (t > -30) return; i ? x.lineTo(X(t), Y(m.r[i])) : x.moveTo(X(t), Y(m.r[i])); }); x.strokeStyle = '#fff'; x.lineWidth = 1.6; x.stroke();
    x.fillStyle = '#9a9aa2'; x.fillText(f1(rMax) + '°', 2, top + 14); x.fillText('0', 2, mid - 12);
    // seguimiento: subida/caída y lado (°) tras soltar
    const fm = Math.max(5, ...m.pp.map(v => Math.abs(v - m.p0)), ...m.py.map(v => Math.abs(v - m.y0)));
    const c0 = (mid + bot) / 2 + 6, FY = v => c0 - v / fm * (bot - mid - 18) / 2;
    x.strokeStyle = 'rgba(255,255,255,.12)'; x.lineWidth = 1; x.beginPath(); x.moveTo(X(0), c0); x.lineTo(R, c0); x.stroke();
    const line = (arr, ref, col) => { x.beginPath(); m.pt.forEach((t, i) => i ? x.lineTo(X(t), FY(arr[i] - ref)) : x.moveTo(X(t), FY(arr[i] - ref))); x.strokeStyle = col; x.lineWidth = 1.6; x.stroke(); };
    line(m.pp, m.p0, acc); line(m.py, m.y0, '#9a9aa2');
    x.fillStyle = '#9a9aa2'; x.fillText('±' + Math.round(fm) + '°', 2, c0 - 6);
    // suelta
    x.strokeStyle = acc; x.lineWidth = 2; x.beginPath(); x.moveTo(X(0), top); x.lineTo(X(0), bot); x.stroke();
    x.fillStyle = acc; x.fillText('Suelta', X(0) + 4, bot - 14);
    x.fillStyle = '#5c5c64'; x.textBaseline = 'alphabetic';
    [[-3000, '−3 s'], [-1000, '−1'], [1000, '+1'], [2000, '+2']].forEach(([t, l]) => x.fillText(l, X(t) - 6, H - 2));
  }

  function shotCard(s) {
    const m = Adv.metrics(s), el = $('advShot');
    if (!m) { el.innerHTML = '<div class="cardTitle">Avanzado</div><p class="read">Esta flecha no tiene traza guardada.</p>'; return; }
    const d = Adv.dist(window.curSessMode || '');
    const cm = v => d ? ` <small>≈ ${f1(Adv.cm(v, d))} cm a ${d} m</small>` : '';
    const fdir = !Number.isFinite(m.follow) ? '' : Math.abs(m.follow) < 3 ? 'quieto' : m.follow > 0 ? 'sube' : 'cae';
    el.innerHTML = `<div class="cardTitle">Avanzado · fases del tiro</div><canvas id="advShotC"></canvas>
      <div class="nums">
        <div><span class="lbl">Sostenido</span><b class="num">${f1(m.hold)} s</b></div>
        <div><span class="lbl">Estabilidad final</span><b class="num">${f2(m.band)}°</b>${cm(m.band)}</div>
        <div><span class="lbl">Deriva final</span><b class="num">${f2(m.drift)}°</b><small>últimos 0,3 s</small></div>
        <div><span class="lbl">Suelta</span><b class="num">${f2(m.flick)}°</b><small>salto en 0,12 s</small></div>
        <div><span class="lbl">Seguimiento</span><b class="num">${f1(Math.abs(m.follow))}°</b><small>${fdir} a 1 s</small></div>
        <div><span class="lbl">Estabilizado</span><b class="num">${f1(m.settle)} s</b><small>tras soltar</small></div>
      </div>
      <details class="i"><summary>ⓘ Cómo leerlo</summary>
        Línea blanca: lo lejos que estaba la mira del punto donde soltaste (en grados). Cuanto más baja y plana al final, más quieto estabas.
        La franja naranja es tu <b>estabilidad final</b>: el 80 % del último segundo cabe dentro.
        <b>Deriva final</b>: cuánto se movió la mira en los últimos 0,3 s; si es alta, soltaste mientras te movías.
        <b>Suelta</b>: salto de la mira justo al soltar; cuanto menor, más limpia.
        Abajo, tras la línea de suelta: naranja = el arco sube/cae, gris = se va a un lado. Un <b>seguimiento</b> parecido flecha a flecha indica una suelta repetible.</details>`;
    requestAnimationFrame(() => drawShot($('advShotC'), m));
  }

  // Comparación del set/sesión: superpone el último 1,5 s de cada flecha y resume la consistencia.
  function setCard(shots) {
    const el = $('advSet');
    const L = shots.filter(s => !s.candidate).map(s => ({ s, m: Adv.metrics(s) })).filter(o => o.m);
    if (!L.length) { el.innerHTML = '<div class="cardTitle">Avanzado</div><p class="read">Sin trazas en esta sesión.</p>'; return; }
    const ids = [...new Set(L.map(o => o.s.set_id))];
    const col = k => ['#FF8A1F', '#FFC15E', '#fff', '#9a9aa2', '#F0506E', '#6fb3ff', '#7be0a6'][k % 7];
    const H = L.map(o => o.m.hold), B = L.map(o => o.m.band), F = L.map(o => o.m.follow), K = L.map(o => o.m.flick);
    const mB = Adv.mean(B), sB = Adv.sd(B), mH = Adv.mean(H), sH = Adv.sd(H), mF = Adv.mean(F), sF = Adv.sd(F), mK = Adv.mean(K);
    const out = (v, m, sd) => Number.isFinite(sd) && Math.abs(v - m) > 1.5 * sd;
    const rows = L.map((o, i) => `<span style="color:${col(ids.indexOf(o.s.set_id))}">${ids.indexOf(o.s.set_id) + 1}·${L.slice(0, i + 1).filter(z => z.s.set_id === o.s.set_id).length}</span>` +
      `<span class="${out(o.m.hold, mH, sH) ? 'o' : ''}">${f1(o.m.hold)} s</span><span class="${out(o.m.band, mB, sB) ? 'o' : ''}">${f2(o.m.band)}°</span>` +
      `<span>${f2(o.m.flick)}°</span><span class="${out(o.m.follow, mF, sF) ? 'o' : ''}">${f1(o.m.follow)}°</span>`).join('');
    const read = [];
    if (Number.isFinite(sH)) read.push(`Sostienes ${f1(mH)} s de media (±${f1(sH)} s).`);
    if (Number.isFinite(mB)) read.push(`Estabilidad final media ${f2(mB)}°${Adv.dist(window.curSessMode) ? ` (≈ ${f1(Adv.cm(mB, Adv.dist(window.curSessMode)))} cm)` : ''}.`);
    if (Number.isFinite(sF)) read.push(sF > 12 ? `El seguimiento cambia mucho entre flechas (±${f1(sF)}°): la suelta no es igual siempre.` : `Seguimiento repetible (±${f1(sF)}°).`);
    el.innerHTML = `<div class="cardTitle">Avanzado · consistencia</div><canvas id="advSetC"></canvas>
      <div class="rows"><span class="h">Set</span><span class="h">Sostenido</span><span class="h">Estab.</span><span class="h">Suelta</span><span class="h">Seguim.</span>${rows}</div>
      <p class="read">${read.join(' ')}</p>
      <details class="i"><summary>ⓘ Cómo leerlo</summary>Cada línea es una flecha (color = set): lo lejos que estaba la mira del punto de suelta durante el último 1,5 s. Líneas juntas y bajas = apunte consistente. En la tabla, en naranja los valores que se salen de tu media.</details>`;
    requestAnimationFrame(() => {
      const [x, W, Hh] = canvas($('advSetC'), 150), Lm = 30, R = W - 8, T0 = -1500, X = t => Lm + (t - T0) / -T0 * (R - Lm);
      const rMax = Math.max(0.2, ...L.map(o => Math.max(...o.m.r.filter((_, i) => o.m.t[i] >= T0)))) * 1.05;
      const Y = v => Hh - 18 - v / rMax * (Hh - 30);
      x.font = FONT; x.fillStyle = '#5c5c64'; x.fillText(f1(rMax) + '°', 2, 14); x.fillText('−1,5 s', Lm, Hh - 3); x.fillText('Suelta', R - 34, Hh - 3);
      L.forEach(o => { x.beginPath(); let f = true; o.m.t.forEach((t, i) => { if (t < T0 || t > -30) return; f ? x.moveTo(X(t), Y(o.m.r[i])) : x.lineTo(X(t), Y(o.m.r[i])); f = false; });
        x.strokeStyle = col(ids.indexOf(o.s.set_id)); x.globalAlpha = .8; x.lineWidth = 1.3; x.stroke(); x.globalAlpha = 1; });
    });
  }

  const base = window.render;
  window.render = render = function () {
    const r = base.apply(this, arguments);
    try {
      const a = on();
      ['advTgShot', 'advTgSess'].forEach(id => $(id).querySelector('button').className = a ? 'on' : '');
      const sess = historyMode ? store.list().find(x => x.id === histId) : curSess;
      window.curSessMode = sess?.mode || '';
      const shots = data?.shots || [];
      $('advShot').hidden = !(a && view === 'Shot' && shots[cur]);
      $('advSet').hidden = !(a && view === 'Session' && shots.length);
      if (!$('advShot').hidden) shotCard(shots[cur]);
      if (!$('advSet').hidden) setCard(shots);
    } catch (e) { console.error(e); }
    return r;
  };
})();
