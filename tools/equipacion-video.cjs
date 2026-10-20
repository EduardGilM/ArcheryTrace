// Vídeo del flujo de material: pregunta al arrancar → elegir → flechas → cambiar → sesión nueva.
// Uso: node tools/equipacion-video.cjs [dirSalida]  (escribe dirSalida/equipacion.mp4)
const {spawn} = require('node:child_process');
const fs = require('node:fs'), os = require('node:os'), path = require('node:path');
const root = path.resolve(__dirname, '..');
const out = process.argv[2] || path.join(root, 'screenshots', 'equipacion');
const frames = path.join(out, '.frames');
const chromium = process.env.CHROMIUM || '/usr/bin/chromium';
const ff = process.env.FFMPEG || '/home/agent/.cache/ffmpeg-static/ffmpeg-master-latest-linux64-gpl/bin/ffmpeg';
const url = 'file://' + path.join(root, 'mobile', 'index.html');
const sleep = ms => new Promise(r => setTimeout(r, ms));

// Sensor en vivo sin material: la hoja pregunta sola; después llegan flechas.
function seed(now) {
  const base = {sensorId: 'demo-live', live: true, lastWt: now, metric: 2, lastEvent: 49, mode: 'Indoor', target: 3, scoreFormat: 'vegas', profile: 'Recurvo', currentSet: 1};
  return {
    atProfile: {name: 'Arquero demo', club: 'Club de tiro con arco'},
    atGear: {
      bows: ['Recurvo 68"', 'Compuesto 38"'], arrows: ['X10 470', 'ACE 470'],
      setups: [{bow: 'Recurvo 68"', arrows: 'X10 470', usedAt: now}, {bow: 'Compuesto 38"', arrows: 'ACE 470', usedAt: now - 864e5}]
    },
    atSessions: [{...base, id: now - 60000, bow: null, arrows: null, shots: [], ends: [], removed: []}]
  };
}

(async () => {
  fs.mkdirSync(frames, {recursive: true});
  const port = 9900 + Math.floor(Math.random() * 100);
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'at-eqv-'));
  const browser = spawn(chromium, ['--headless=new', '--no-sandbox', '--disable-dev-shm-usage', '--allow-file-access-from-files', '--disable-gpu', '--no-first-run', '--hide-scrollbars', `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, 'about:blank'], {stdio: 'ignore'});
  try {
    let target;
    for (let i = 0; i < 50 && !target; i++) { await sleep(200); try { target = (await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()).find(t => t.type === 'page'); } catch {} }
    if (!target) throw Error('no CDP');
    const ws = new WebSocket(target.webSocketDebuggerUrl); await new Promise(r => ws.onopen = r);
    let id = 0; const waits = new Map(), errs = [];
    ws.onmessage = e => { const m = JSON.parse(e.data); if (m.id && waits.has(m.id)) { waits.get(m.id)(m); waits.delete(m.id); }
      if (m.method === 'Runtime.exceptionThrown') errs.push(m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text); };
    const send = (method, params = {}) => new Promise(r => { waits.set(++id, r); ws.send(JSON.stringify({id, method, params})); });
    const run = async expr => { const r = await send('Runtime.evaluate', {expression: expr, awaitPromise: true, returnByValue: true});
      if (r.result?.exceptionDetails) throw Error(JSON.stringify(r.result.exceptionDetails).slice(0, 400)); return r.result?.result?.value; };
    await send('Runtime.enable'); await send('Page.enable');
    await send('Emulation.setDeviceMetricsOverride', {width: 390, height: 844, deviceScaleFactor: 2, mobile: true});

    let n = 0, capturing = false;
    const snap = async () => { const r = await send('Page.captureScreenshot', {format: 'jpeg', quality: 82});
      n++; fs.writeFileSync(path.join(frames, 'f' + String(n).padStart(4, '0') + '.jpg'), Buffer.from(r.result.data, 'base64')); };
    const ticker = setInterval(async () => { if (!capturing) return; capturing = false; try { await snap(); } catch {} capturing = true; }, 125);

    await send('Page.navigate', {url}); await sleep(900);
    await run(`(data => { for (const [k,v] of Object.entries(data)) localStorage.setItem(k, JSON.stringify(v)); })(${JSON.stringify(seed(Date.now()))})`);
    await send('Page.navigate', {url}); await sleep(1400);
    await run('document.fonts.ready');
    capturing = true;
    const step = async (ms, expr) => { if (expr) await run(expr); await sleep(ms); };

    await step(2000);                                                              // «¿Con qué tiras hoy?» (se abre sola)
    await step(1500, "document.querySelectorAll('#gearCards .gsCard')[1].click()"); // elijo Compuesto/ACE: la hoja se cierra sola
    await step(1200);                                                              // fila «Sesión» ya con el material
    await step(900,  "liveEvent({sid:'demo-live',eid:50,kind:'shot',t:Date.now(),set:1,score:84,peak:1720,instab:95,dt:50})");
    await step(1100, "liveEvent({sid:'demo-live',eid:51,kind:'shot',t:Date.now()+1000,set:1,score:91,peak:1650,instab:80,dt:50})");
    await step(1100, "liveEvent({sid:'demo-live',eid:52,kind:'shot',t:Date.now()+2000,set:1,score:77,peak:1900,instab:110,dt:50})");
    await step(1500, "document.getElementById('gearBtn').click()");                 // hoja en modo edición
    await step(1400, "[...document.querySelectorAll('#gearCards .gsCard')].find(c=>c.textContent.includes('Recurvo')).click()"); // tocar Recurvo/X10 pide confirmación
    await step(1500);                                                              // «Cancelar · Empezar con Recurvo 68 · X10 470»
    await step(400, "document.getElementById('gearConfirmYes').click()");           // confirmar: sesión nueva
    await step(1800);                                                              // aviso «Sesión nueva con Recurvo 68 · X10 470»
    await step(900,  "liveEvent({sid:'demo-live',eid:53,kind:'shot',t:Date.now()+3000,set:1,score:88,peak:1690,instab:70,dt:50})"); // el sensor la adopta
    await step(1400);                                                              // fila «En vivo · 1 flecha»
    await step(1300, "show('History')");                                           // el día: cada arco, su sesión
    await step(2200);
    await step(1200, "show('Session')");
    await step(1600);
    capturing = false;
    await sleep(300); clearInterval(ticker);
    if (errs.length) console.log('Excepciones:', errs.slice(0, 5).join('\n')); else console.log('Sin excepciones JS');
    console.log('fotogramas:', n);
    ws.close();
  } finally { browser.kill(); await sleep(400); try { fs.rmSync(profile, {recursive: true, force: true}); } catch {} }

  const mp4 = path.join(out, 'equipacion.mp4');
  await new Promise((res, rej) => {
    const p = spawn(ff, ['-y', '-framerate', '8', '-i', path.join(frames, 'f%04d.jpg'), '-c:v', 'libx264', '-preset', 'slow', '-crf', '23', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', mp4], {stdio: ['ignore', 'ignore', 'pipe']});
    let err = ''; p.stderr.on('data', d => err += d);
    p.on('close', c => c === 0 ? res() : rej(Error('ffmpeg ' + c + '\n' + err.slice(-1500))));
  });
  try { fs.rmSync(frames, {recursive: true, force: true}); } catch {}
  console.log('vídeo:', mp4, fs.statSync(mp4).size, 'bytes');
})().catch(e => { console.error(e); process.exitCode = 1; });
