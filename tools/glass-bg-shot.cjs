// Captura el fondo del acabado Cristal antes/después del rediseño estilo Nothing.
// Uso: node tools/glass-bg-shot.cjs [dirSalida]
const {spawn, execFileSync} = require('node:child_process');
const fs = require('node:fs'), os = require('node:os'), path = require('node:path');
const root = path.resolve(__dirname, '..');
const outDir = path.resolve(process.argv[2] || path.join(root, 'screenshots', 'glass-bg'));
const chromium = process.env.CHROMIUM || '/usr/bin/chromium';
const port = 9400 + Math.floor(Math.random() * 400);
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'at-glass-'));
const url = 'file://' + path.join(root, 'mobile/index.html');
const sleep = ms => new Promise(r => setTimeout(r, ms));

function seed() {
  const now = Date.now(), day = 864e5;
  const values = ['X', '10', '9', 'X', '10', '8', '10', '9', 'X', '10', '7', '10'];
  const shot = (t, set, i) => {
    const n = 40, tilt_x = [], tilt_y = [], pos_x = [], pos_y = [], trace_t = [];
    for (let k = 0; k < n; k++) {
      const a = k / n, settle = Math.min(1, a * 1.6);
      tilt_x.push(Math.round(260 * (1 - settle) * Math.cos(a * 5 + i) + 18 * Math.sin(k * 1.7 + i)));
      tilt_y.push(Math.round(-180 * (1 - settle) + 14 * Math.cos(k * 1.3 + i)));
      pos_x.push(+(9 * (1 - settle) * Math.cos(a * 4 + i) + 0.6 * Math.sin(k * 1.9 + i)).toFixed(2));
      pos_y.push(+(-7 * (1 - settle) + 0.5 * Math.cos(k * 1.1 + i)).toFixed(2));
      trace_t.push(Math.round(-3800 + a * 3750));
    }
    const pre = Array.from({length: 24}, (_, k) => 1000 + Math.round(30 * Math.sin(k + i)));
    const post = [2400 + i * 180, 1600, 1200, ...Array.from({length: 21}, (_, k) => 1000 + Math.round(90 * Math.exp(-k / 4) * Math.cos(k)))];
    const value = values[i % values.length];
    const r = value === 'X' ? 0.04 : value === '10' ? 0.12 : value === '9' ? 0.22 : 0.35;
    const ang = i * 1.1;
    return {
      t_ms: t, set_id: set, metric: 2, profile: 'Recurvo', aim_score: 72 + (i % 5) * 3,
      peak_mg: 1650 + i * 40, instab_mg: 90 + i * 8, settle_ms: 210 + i * 12,
      tilt_x, tilt_y, pos_x, pos_y, trace_t, dt: 50, draw_ms: 2600 + i * 40,
      result: {value, impact: {x: +(r * Math.cos(ang)).toFixed(3), y: +(r * Math.sin(ang)).toFixed(3)}},
      window: {pre: pre.map((_, k) => (k - pre.length) * 50), mag_pre: pre, post: post.map((_, k) => (k + 1) * 50), mag_post: post}
    };
  };
  const session = (id, n) => ({
    id, sensorId: 'demo-' + id, live: false, lastWt: now, metric: 2, lastEvent: 1,
    mode: 'Indoor', bow: 'Recurvo 68"', arrows: 'X10 470', profile: 'Recurvo', target: 3,
    currentSet: Math.ceil(n / 3),
    shots: Array.from({length: n}, (_, i) => shot(id + 1000 + i * 45000, id + Math.floor(i / 3), i))
  });
  localStorage.setItem('atSessions', JSON.stringify([
    session(now - 9 * day, 18), session(now - 6 * day, 18),
    session(now - 2 * day, 24), session(now - 3600e3, 24)
  ]));
  const fx = {foot: true, grain: true, foil: false, mark: false, duo: false};
  localStorage.setItem('atCardLayouts', JSON.stringify({
    glass: {photo: 'tall', fx}, editorial: {photo: 'tall', fx}, obsidian: {photo: 'tall', fx}
  }));
}

// Reescribe studioPaintGlass en el navegador con el fondo viejo (focos de acento en esquinas).
function installOldGlass() {
  let src = studioPaintGlass.toString();
  src = src.replace(/ctx\.filter = 'blur\(46px\)'/, "ctx.filter = 'blur(42px)'");
  src = src.replace(/ctx\.globalAlpha = 0\.48/, 'ctx.globalAlpha = 0.6');
  src = src.replace(/bright: 0\.52/, 'bright: 0.62');
  const neuvo = /  \/\/ Atmósfera tipo Nothing[\s\S]*?ctx\.fillRect\(0, 0, W, H\);\n  const cx/;
  const viejo = `  [[W * 0.1, H * 0.94, 760, 0.3], [W * 0.96, H * 0.04, 600, 0.14]].forEach(b => {
    const g = ctx.createRadialGradient(b[0], b[1], 0, b[0], b[1], b[2]);
    g.addColorStop(0, studioRgba(acc, b[3]));
    g.addColorStop(1, studioRgba(acc, 0));
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  });
  const cx`;
  if (!neuvo.test(src)) throw Error('no se encontró el bloque nuevo del fondo');
  src = src.replace(neuvo, viejo);
  src = src.replace(/studioRgba\(acc, 0\.07\)/, 'studioRgba(acc, 0.13)');
  // eslint-disable-next-line no-eval
  (0, eval)('studioPaintGlass = ' + src);
}

function magick(...args) {
  try { execFileSync('magick', args, {stdio: 'pipe'}); } catch (e) { console.error('magick fail', e.stderr?.toString() || e.message); }
}

(async () => {
  fs.mkdirSync(outDir, {recursive: true});
  const browser = spawn(chromium, [
    '--headless=new', '--disable-gpu', '--no-sandbox', '--no-first-run', '--hide-scrollbars',
    '--allow-file-access-from-files', `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, 'about:blank'
  ], {stdio: 'ignore'});
  try {
    let target;
    for (let i = 0; i < 50 && !target; i++) {
      await sleep(200);
      try { target = (await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()).find(t => t.type === 'page'); } catch {}
    }
    if (!target) throw Error('no CDP');
    const ws = new WebSocket(target.webSocketDebuggerUrl);
    await new Promise(r => ws.onopen = r);
    let id = 0; const waits = new Map();
    ws.onmessage = e => { const m = JSON.parse(e.data); if (m.id && waits.has(m.id)) { waits.get(m.id)(m); waits.delete(m.id); } };
    const send = (method, params = {}) => new Promise(r => { waits.set(++id, r); ws.send(JSON.stringify({id, method, params})); });
    const run = async expr => {
      const r = await send('Runtime.evaluate', {expression: expr, awaitPromise: true, returnByValue: true});
      if (r.result?.exceptionDetails) throw Error(JSON.stringify(r.result.exceptionDetails));
      return r.result?.result?.value;
    };
    await send('Emulation.setDeviceMetricsOverride', {width: 390, height: 844, deviceScaleFactor: 2, mobile: true});
    await send('Page.navigate', {url}); await sleep(1500);
    await run(`(${seed})()`);
    await send('Page.navigate', {url}); await sleep(1800);
    await run(`(async () => { show('Session'); await new Promise(r => setTimeout(r, 200)); studioOpenShare('session'); await studioPhotoReady(); })()`);

    const capture = async label => run(`(async () => {
      Studio.card.finish = 'glass';
      Studio.card.tilt = {x: 0, y: 0};
      studioDrawShare(false);
      await new Promise(r => setTimeout(r, 400));
      return document.getElementById('shareCanvas').toDataURL('image/png').split(',')[1];
    })()`);

    const after = await capture('despues');
    fs.writeFileSync(path.join(outDir, 'despues.png'), Buffer.from(after, 'base64'));

    await run(`(${installOldGlass.toString()})()`);
    const before = await capture('antes');
    fs.writeFileSync(path.join(outDir, 'antes.png'), Buffer.from(before, 'base64'));

    const a = path.join(outDir, 'antes.png');
    const b = path.join(outDir, 'despues.png');
    magick(a, '-crop', '420x320+660+0', '+repage', path.join(outDir, 'antes-esquina-tr.png'));
    magick(b, '-crop', '420x320+660+0', '+repage', path.join(outDir, 'despues-esquina-tr.png'));
    magick(path.join(outDir, 'antes-esquina-tr.png'), path.join(outDir, 'despues-esquina-tr.png'),
      '+append', '-background', '#111', '-gravity', 'south', '-splice', '0x36',
      '-pointsize', '22', '-fill', 'white', '-annotate', '+0+8',
      'ANTES (foco de acento)                         DESPUÉS (nube neutra)',
      path.join(outDir, 'comparativa-esquina-tr.png'));
    magick(a, '-crop', '420x320+0+1030', '+repage', path.join(outDir, 'antes-esquina-bi.png'));
    magick(b, '-crop', '420x320+0+1030', '+repage', path.join(outDir, 'despues-esquina-bi.png'));
    magick(path.join(outDir, 'antes-esquina-bi.png'), path.join(outDir, 'despues-esquina-bi.png'),
      '+append', '-background', '#111', '-gravity', 'south', '-splice', '0x36',
      '-pointsize', '22', '-fill', 'white', '-annotate', '+0+8',
      'ANTES (foco de acento)                         DESPUÉS (nube neutra)',
      path.join(outDir, 'comparativa-esquina-bi.png'));
    magick(a, '-resize', '480x', path.join(outDir, '.a.png'));
    magick(b, '-resize', '480x', path.join(outDir, '.b.png'));
    magick(path.join(outDir, '.a.png'), path.join(outDir, '.b.png'), '+append',
      '-background', '#111', '-gravity', 'south', '-splice', '0x36',
      '-pointsize', '22', '-fill', 'white', '-annotate', '+0+8',
      'ANTES                                                    DESPUÉS',
      path.join(outDir, 'comparativa.png'));
    try { fs.unlinkSync(path.join(outDir, '.a.png')); fs.unlinkSync(path.join(outDir, '.b.png')); } catch {}

    console.log(JSON.stringify({outDir, files: fs.readdirSync(outDir)}));
    ws.close();
  } finally {
    browser.kill(); await sleep(500);
    try { fs.rmSync(profile, {recursive: true, force: true}); } catch {}
  }
})().catch(e => { console.error(e); process.exitCode = 1; });
