// Capturas de la interfaz móvil con datos sintéticos en un perfil de Edge aislado.
// Uso: node tools/screenshots.cjs <carpeta-salida>
const {spawn} = require('node:child_process');
const fs = require('node:fs'), os = require('node:os'), path = require('node:path');
const root = path.resolve(__dirname, '..');
const out = path.resolve(process.argv[2] || path.join(os.tmpdir(), 'at-shots'));
const edge = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const port = 9300 + Math.floor(Math.random() * 400);
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'at-edge-'));
const url = 'file:///' + path.join(root, 'mobile/index.html').replace(/\\/g, '/');
const sleep = ms => new Promise(r => setTimeout(r, ms));

function seed() {
  const now = Date.now(), day = 864e5;
  const shot = (t, set, score, k) => {
    const n = 40, tilt_x = [], tilt_y = [], pos_x = [], pos_y = [], trace_t = [];
    for (let i = 0; i < n; i++) {
      const a = i / n, settle = Math.min(1, a * 1.6);
      tilt_x.push(Math.round(260 * (1 - settle) * Math.cos(a * 5 + k) + 18 * Math.sin(i * 1.7 + k)));
      tilt_y.push(Math.round(-180 * (1 - settle) + 14 * Math.cos(i * 1.3 + k)));
      pos_x.push(+(9 * (1 - settle) * Math.cos(a * 4 + k) + 0.6 * Math.sin(i * 1.9 + k)).toFixed(2));
      pos_y.push(+(-7 * (1 - settle) + 0.5 * Math.cos(i * 1.1 + k)).toFixed(2));
      trace_t.push(Math.round(-3800 + a * 3750));
    }
    const pre = Array.from({length: 24}, (_, i) => 1000 + Math.round(30 * Math.sin(i + k)));
    const post = [2400 + k * 180, 1600, 1200, ...Array.from({length: 21}, (_, i) => 1000 + Math.round(90 * Math.exp(-i / 4) * Math.cos(i)))];
    return {t_ms: t, set_id: set, metric: 2, profile: 'Recurvo', aim_score: score, peak_mg: 1650 + k * 130, instab_mg: 90 + k * 25,
      settle_ms: 210 + k * 40, hr_bpm: 92 + k, tilt_x, tilt_y, pos_x, pos_y, trace_t, dt: 50, draw_ms: 2600 + k * 150,
      window: {pre: pre.map((_, i) => (i - pre.length) * 50), mag_pre: pre, post: post.map((_, i) => (i + 1) * 50), mag_post: post}};
  };
  const session = (id, scores, live) => ({id, sensorId: live ? 'demo-live' : 'demo-' + id, live, lastWt: now, metric: 2, lastEvent: 1,
    mode: 'Indoor', bow: 'Recurvo 68"', arrows: 'X10 470', profile: 'Recurvo', target: 3, currentSet: Math.ceil(scores.length / 3),
    shots: scores.map((s, i) => shot(id + 1000 + i * 45000, id + Math.floor(i / 3), s, i))});
  localStorage.setItem('atSessions', JSON.stringify([
    session(now - 9 * day, [58, 64, 61, 70, 66, 63]), session(now - 6 * day, [66, 71, 69, 74, 62, 77]),
    session(now - 2 * day, [72, 79, 70, 81, 76, 74]), session(now - 3600e3, [84, 77, 91, 68, 88, 73], true)]));
}

(async () => {
  fs.mkdirSync(out, {recursive: true});
  const browser = spawn(edge, ['--headless=new', '--disable-gpu', '--no-first-run', '--hide-scrollbars', `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, 'about:blank'], {stdio: 'ignore'});
  try {
    let target;
    for (let i = 0; i < 50 && !target; i++) { await sleep(200); try { target = (await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()).find(t => t.type === 'page'); } catch {} }
    const ws = new WebSocket(target.webSocketDebuggerUrl); await new Promise(r => ws.onopen = r);
    let id = 0; const waits = new Map();
    ws.onmessage = e => { const m = JSON.parse(e.data); if (m.id && waits.has(m.id)) { waits.get(m.id)(m); waits.delete(m.id); } };
    const send = (method, params = {}) => new Promise(r => { waits.set(++id, r); ws.send(JSON.stringify({id, method, params})); });
    const run = async expr => { const r = await send('Runtime.evaluate', {expression: expr, awaitPromise: true, returnByValue: true}); if (r.result?.exceptionDetails) throw Error(JSON.stringify(r.result.exceptionDetails)); return r.result?.result?.value; };
    const shoot = async (name, h = 844) => {
      await send('Emulation.setDeviceMetricsOverride', {width: 390, height: h, deviceScaleFactor: 2, mobile: true});
      await run('render()'); await sleep(350);
      const r = await send('Page.captureScreenshot', {format: 'png'});
      fs.writeFileSync(path.join(out, name + '.png'), Buffer.from(r.result.data, 'base64'));
    };
    await send('Emulation.setDeviceMetricsOverride', {width: 390, height: 844, deviceScaleFactor: 2, mobile: true});
    await send('Page.navigate', {url}); await sleep(1200);
    await run(`(${seed})()`); await send('Page.navigate', {url}); await sleep(1500);
    const errors = await run(`document.getElementById('jserr')?.textContent || ''`);
    await run("show('Session')"); await shoot('1-sesion'); await shoot('1-sesion-larga', 1500);
    await run("cur=2;show('Shot')"); await shoot('2-tiro'); await shoot('2-tiro-largo', 1900);
    await run("show('Set')"); await shoot('3-set', 1400);
    await run("show('Progress')"); await shoot('4-progreso');
    await run("show('History')"); await shoot('5-historial');
    await run("void askConfirm('¿Confirmas que esta flecha fue una suelta real? Perfil: Recurvo. Pico: 1910 mG. Umbral propuesto: 1146 mG.')"); await shoot('6-dialogo');
    await run("document.getElementById('askNo').click();localStorage.setItem('atSessions','[]');location.reload()"); await sleep(1500);
    await run("show('Shot')"); await shoot('7-vacio');
    console.log(JSON.stringify({out, errors}));
    ws.close();
  } finally { browser.kill(); await sleep(500); try { fs.rmSync(profile, {recursive: true, force: true}); } catch {} }
})().catch(e => { console.error(e); process.exitCode = 1; });
