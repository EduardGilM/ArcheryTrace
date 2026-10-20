// Capturas de la selección de material (equipación): una fila, una hoja; cambiar de material
// con flechas ya tiradas empieza una sesión nueva. Genera antes/después + comparativas.
// Uso: node tools/equipacion-shot.cjs [dirSalida]
//   Reutiliza 01-antes-sesion.png y 05-antes-set.png (el "antes", con la app anterior a la
//   equipación): no los sobrescribe, solo los usa para las comparativas.
const {spawn, execFileSync} = require('node:child_process');
const fs = require('node:fs'), os = require('node:os'), path = require('node:path');
const root = path.resolve(__dirname, '..');
const outDir = path.resolve(process.argv[2] || path.join(root, 'screenshots', 'equipacion'));
const chromium = process.env.CHROMIUM || '/usr/bin/chromium';
const sleep = ms => new Promise(r => setTimeout(r, ms));

function makeShot(t, set, score, k, bow, arrows) {
  const n = 40, tilt_x = [], tilt_y = [], trace_t = [];
  for (let i = 0; i < n; i++) {
    const a = i / n, settle = Math.min(1, a * 1.6);
    tilt_x.push(Math.round(260 * (1 - settle) * Math.cos(a * 5 + k) + 18 * Math.sin(i * 1.7 + k)));
    tilt_y.push(Math.round(-180 * (1 - settle) + 14 * Math.cos(i * 1.3 + k)));
    trace_t.push(Math.round(-3800 + a * 3750));
  }
  const pre = Array.from({length: 24}, (_, i) => 1000 + Math.round(30 * Math.sin(i + k)));
  const post = [2400 + k * 180, 1600, 1200, ...Array.from({length: 21}, (_, i) => 1000 + Math.round(90 * Math.exp(-i / 4) * Math.cos(i)))];
  return {
    t_ms: t, set_id: set, metric: 2, profile: (bow || 'Recurvo').split(' ')[0], bow, arrows, aim_score: score,
    result: {value: ['X', '10', '9', '8', '10', '9'][k % 6], impact: {x: 0.24 * Math.cos(k * 2.4), y: 0.24 * Math.sin(k * 2.4)}},
    peak_mg: 1650 + k * 130, instab_mg: 90 + k * 25, settle_ms: 210 + k * 40, draw_ms: 2600 + k * 150, dt: 50,
    tilt_x, tilt_y, trace_t,
    window: {pre: pre.map((_, i) => (i - pre.length) * 50), mag_pre: pre, post: post.map((_, i) => (i + 1) * 50), mag_post: post}
  };
}
const SCORES = [84, 77, 91, 68, 88, 73, 86, 82, 90, 79, 87, 84];

// kind: 'sesion'/'set' (recurvo en vivo), 'inicio' (sensor en vivo, sin flechas ni material),
// 'cambio' (compuesto en vivo, listo para cambiar), 'multigear' (sesión antigua que mezcló material).
function seedData(kind, now) {
  const day = 864e5;
  const base = {sensorId: 'demo-live', live: true, lastWt: now, metric: 2, mode: 'Indoor', target: 3, scoreFormat: 'vegas', profile: 'Recurvo', currentSet: 1};
  const session = (id, bow, arrows, mixed) => ({
    ...base, id, bow, arrows, lastEvent: SCORES.length, currentSet: 4,
    ends: [], removed: [],
    shots: SCORES.map((v, i) => makeShot(id + 1000 + i * 45000, Math.floor(i / 3) + 1, v, i % 6,
      mixed && i < 6 ? 'Recurvo 68"' : (mixed ? 'Compuesto 38"' : bow),
      mixed && i < 6 ? 'X10 470' : (mixed ? 'ACE 470' : arrows)))
  });
  const atSessions = [];
  if (kind === 'inicio') {
    atSessions.push({...base, id: now - 60000, lastEvent: 1, bow: null, arrows: null, currentSet: 1, shots: []});
  } else if (kind === 'cambio') {
    atSessions.push(session(now - 3600e3, 'Compuesto 38"', 'ACE 470'));
  } else if (kind === 'multigear') {
    atSessions.push(session(now - 3600e3, 'Compuesto 38"', 'ACE 470', true));
  } else {
    atSessions.push(session(now - 3600e3, 'Recurvo 68"', 'X10 470'));
  }
  return {
    atProfile: {name: 'Arquero demo', club: 'Club de tiro con arco'},
    atGear: {
      bows: ['Recurvo 68"', 'Compuesto 38"'], arrows: ['X10 470', 'ACE 470'],
      setups: [{bow: 'Recurvo 68"', arrows: 'X10 470', usedAt: now}, {bow: 'Compuesto 38"', arrows: 'ACE 470', usedAt: now - day}],
      last: {bow: 'Recurvo 68"', arrows: 'X10 470', mode: 'Indoor', fmt: 'vegas'}
    },
    atSessions
  };
}

async function withPage(fn, {appUrl, metrics = {width: 390, height: 844, deviceScaleFactor: 2, mobile: true}}) {
  const port = 9600 + Math.floor(Math.random() * 300);
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'at-eqshot-'));
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
      if (r.result?.exceptionDetails) throw Error(JSON.stringify(r.result.exceptionDetails).slice(0, 400));
      return r.result?.result?.value;
    };
    const shoot = async (name, scroll) => {
      await run('render()');
      if (scroll) { await run(scroll); await sleep(400); await run(scroll); await sleep(150); }
      else await sleep(400);
      const r = await send('Page.captureScreenshot', {format: 'png'});
      if (!r.result?.data) throw Error('no png ' + name);
      fs.writeFileSync(path.join(outDir, name), Buffer.from(r.result.data, 'base64'));
      const err = await run(`document.getElementById('jserr')?.textContent || ''`);
      if (err) throw Error('jserr: ' + err);
      console.log('ok', name);
    };
    // Semilla vía JSON en localStorage + recarga: la app restaura la sesión en vivo al arrancar.
    const scenario = async (kind, prep) => {
      await send('Emulation.setDeviceMetricsOverride', metrics);
      await send('Page.navigate', {url: appUrl}); await sleep(1000);
      await run(`(data => { for (const [k,v] of Object.entries(data)) localStorage.setItem(k, JSON.stringify(v)); })(${JSON.stringify(seedData(kind, Date.now()))})`);
      await send('Page.navigate', {url: appUrl}); await sleep(1500);
      await run('document.fonts.ready');
      if (prep) await run(prep);
    };
    try { await fn({run, shoot, scenario, send}); } finally { ws.close(); }
  } finally {
    browser.kill(); await sleep(400);
    try { fs.rmSync(profile, {recursive: true, force: true}); } catch {}
  }
}

function magick(...args) {
  try { execFileSync('magick', args, {stdio: 'pipe'}); } catch (e) { console.error('magick fail', e.message); }
}

(async () => {
  fs.mkdirSync(outDir, {recursive: true});
  const appUrl = 'file://' + path.join(root, 'mobile', 'index.html');

  await withPage(async ({run, shoot, scenario}) => {
    // Fila única «Sesión»: chips de material + estado.
    await scenario('sesion', `show('Session')`);
    await sleep(600);
    await shoot('02-despues-sesion.png');

    // Arranque: con sensor en vivo sin material, la hoja «¿Con qué tiras hoy?» se abre sola.
    await scenario('inicio', `show('Session'); render()`);
    await sleep(500);
    await shoot('04-despues-pregunta-inicio.png');

    // Vista Set: la fila «Equipación del set» lleva el material con que se tiró.
    await scenario('set', `show('Session'); cur=data.shots.length-1; show('Set'); document.getElementById('vSet').scrollTop=0`);
    await sleep(500);
    await shoot('06-despues-set.png');

    // Cambiar con la sesión en marcha: la hoja en modo edición…
    await scenario('cambio', `openGear('edit')`);
    await sleep(500);
    await shoot('08-despues-hoja-material.png');
    // …elegir otro material sella la actual y empieza una sesión nueva con el aviso.
    await run(`applySetup('Recurvo 68"', 'X10 470')`);
    await sleep(600);
    await shoot('09-despues-sesion-nueva.png');

    // Sesiones antiguas que mezclaron material: etiqueta por set en el listado.
    await scenario('multigear', `show('Session'); document.querySelectorAll('#setList details').forEach(d=>d.open=true)`);
    await sleep(400);
    // Encuadre anclado al set indicado, justo bajo la cabecera fija; se aplica tras el render.
    const belowHeader = idx => `(() => {
      const vs=document.getElementById('vSession'), el=[...document.querySelectorAll('#setList details')][${idx}];
      const h=document.querySelector('header').getBoundingClientRect().bottom;
      vs.scrollTop += el.getBoundingClientRect().top - h;
    })()`;
    await shoot('11-despues-resumen-con-etiquetas.png', belowHeader(0));
    await shoot('10-despues-equipacion-por-set.png', belowHeader(2));
  }, {appUrl});

  // ===== comparativas =====
  const p = n => path.join(outDir, n);
  magick(p('01-antes-sesion.png'), '-resize', '480x', p('.a1.png'));
  magick(p('02-despues-sesion.png'), '-resize', '480x', p('.b1.png'));
  magick(p('05-antes-set.png'), '-resize', '480x', p('.a2.png'));
  magick(p('06-despues-set.png'), '-resize', '480x', p('.b2.png'));
  // Cada mitad lleva su etiqueta en una franja propia: así no se solapan ni se cortan.
  const strip = (text, f) => magick('-size', '480x44', 'xc:#111', '-gravity', 'west',
    '-pointsize', '22', '-fill', 'white', '-annotate', '+14+5', text, p(f));
  const pair = (a, b, left, right, out) => {
    strip(left, '.tl.png'); strip(right, '.tr.png');
    magick(p(a), p(b), '+append', '(', p('.tl.png'), p('.tr.png'), '+append', ')', '-append', p(out));
  };
  pair('.a1.png', '.b1.png',
    'ANTES · cuatro desplegables', 'DESPUÉS · una sola fila',
    '03-sesion-antes-vs-despues.png');
  pair('.a2.png', '.b2.png',
    'ANTES · set sin equipación', 'DESPUÉS · set con su material',
    '07-set-antes-vs-despues.png');
  try { ['.a1.png', '.b1.png', '.a2.png', '.b2.png', '.tl.png', '.tr.png'].forEach(f => fs.unlinkSync(p(f))); } catch {}
  console.log(JSON.stringify({outDir}));
})().catch(e => { console.error(e); process.exitCode = 1; });
