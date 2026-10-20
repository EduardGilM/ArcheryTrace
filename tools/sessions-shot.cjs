// Capturas de la función de sesiones múltiples (varias al día, cada una con su arco).
// Uso: node tools/sessions-shot.cjs [dirSalida]
//   AT_BEFORE=<dirAppAntes> por defecto /tmp/at-before (worktree en HEAD, sin la función).
// Genera antes/después + comparativas lado a lado.
const {spawn, execFileSync} = require('node:child_process');
const fs = require('node:fs'), os = require('node:os'), path = require('node:path');
const root = path.resolve(__dirname, '..');
const outDir = path.resolve(process.argv[2] || path.join(root, 'screenshots', 'sesiones'));
const beforeRoot = process.env.AT_BEFORE || '/tmp/at-before';
const chromium = process.env.CHROMIUM || '/usr/bin/chromium';
const sleep = ms => new Promise(r => setTimeout(r, ms));

// Fábrica de tiros sintéticos con trayectoria dibujable (misma idea que grain-shot.cjs).
function makeShot(t, set, i, bow, arrows, value) {
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
  const r = value === 'X' ? 0.04 : value === '10' ? 0.12 : value === '9' ? 0.22 : 0.35;
  const ang = i * 1.1;
  return {
    t_ms: t, set_id: set, metric: 2, profile: bow ? bow.split(' ')[0] : 'Recurvo', aim_score: 72 + (i % 5) * 3,
    bow: bow || null, arrows: arrows || null,
    peak_mg: 1650 + i * 40, instab_mg: 90 + i * 8, settle_ms: 210 + i * 12,
    tilt_x, tilt_y, pos_x, pos_y, trace_t, dt: 50, draw_ms: 2600 + i * 40,
    result: {value, impact: {x: +(r * Math.cos(ang)).toFixed(3), y: +(r * Math.sin(ang)).toFixed(3)}},
    window: {pre: pre.map((_, k) => (k - pre.length) * 50), mag_pre: pre, post: post.map((_, k) => (k + 1) * 50), mag_post: post}
  };
}
const VALUES = ['X', '10', '9', 'X', '10', '8', '10', '9', 'X', '10', '7', '10', 'X', '9', '10', '8', '10', 'X'];

function session(id, n, opts = {}) {
  const {bow = 'Recurvo 68"', arrows = 'X10 470', finished = false, sensorId = 'demo-' + id, gearPerSet = null} = opts;
  const now = Date.now();
  return {
    id, sensorId, live: !finished, finished, lastWt: now, metric: 2, lastEvent: n,
    mode: 'Indoor', bow, arrows, profile: (bow || 'Recurvo').split(' ')[0], target: 3,
    scoreFormat: 'vegas', currentSet: Math.ceil(n / 3), ends: [], removed: [],
    shots: Array.from({length: n}, (_, i) => {
      // gearPerSet: cambia el material a mitad de sesión (el "problema" del antes).
      const g = gearPerSet && i >= gearPerSet.from ? gearPerSet : {bow, arrows};
      return makeShot(id + 1000 + i * 45000, id + Math.floor(i / 3), i, g.bow, g.arrows, VALUES[i % VALUES.length]);
    })
  };
}

// ---- seeds (corren en Node; se inyectan como JSON) ----
function seedBeforeData(now) {
  const day = 864e5;
  const yesterday = session(now - day, 18);
  // Hoy: una única sesión que mezcla dos arcos (lo que pasaba antes: no había cómo separarlas).
  const mixed = session(now - 3600e3, 18, {gearPerSet: {from: 9, bow: 'Compuesto 38"', arrows: 'ACE 470'}});
  return {
    atSessions: [mixed, yesterday],
    atGear: {
      bows: ['Recurvo 68"', 'Compuesto 38"'], arrows: ['X10 470', 'ACE 470'],
      setups: [{bow: 'Compuesto 38"', arrows: 'ACE 470', usedAt: now}, {bow: 'Recurvo 68"', arrows: 'X10 470', usedAt: now - day}],
      last: {bow: 'Compuesto 38"', arrows: 'ACE 470', mode: 'Indoor', fmt: 'vegas'}
    }
  };
}

function seedAfterData(now) {
  const day = 864e5;
  // Hoy por la mañana: recurvo, cerrada. Ahora: compuesto, en vivo.
  const morning = session(now - 5 * 3600e3, 18, {finished: true});
  const liveNow = session(now - 12 * 60e3, 6, {bow: 'Compuesto 38"', arrows: 'ACE 470'});
  return {
    atSessions: [liveNow, morning, session(now - 2 * day, 18, {finished: true})],
    atGear: {
      bows: ['Recurvo 68"', 'Compuesto 38"'], arrows: ['X10 470', 'ACE 470'],
      setups: [{bow: 'Compuesto 38"', arrows: 'ACE 470', usedAt: now}, {bow: 'Recurvo 68"', arrows: 'X10 470', usedAt: now - 5 * 3600e3}],
      last: {bow: 'Compuesto 38"', arrows: 'ACE 470', mode: 'Indoor', fmt: 'vegas'}
    }
  };
}

// ---- driver CDP ----
async function withPage(fn, {appUrl, metrics = {width: 390, height: 844, deviceScaleFactor: 2, mobile: true}}) {
  const port = 9500 + Math.floor(Math.random() * 400);
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'at-sshot-'));
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
    const shot = async name => {
      const r = await send('Page.captureScreenshot', {format: 'png'});
      if (!r.result?.data) throw Error('no png ' + name);
      const p = path.join(outDir, name);
      fs.writeFileSync(p, Buffer.from(r.result.data, 'base64'));
      console.log('ok', name);
      return p;
    };
    const boot = async seedData => {
      await send('Emulation.setDeviceMetricsOverride', metrics);
      await send('Page.navigate', {url: appUrl}); await sleep(1200);
      for (let i = 0; i < 30; i++) {
        if (await run(`typeof window.render === 'function' && typeof window.show === 'function'`)) break;
        await sleep(200);
        if (i === 29) throw Error('la app no terminó de cargar');
      }
      await run(`(data => { for (const [k,v] of Object.entries(data)) localStorage.setItem(k, JSON.stringify(v)); })(${JSON.stringify(seedData)})`);
      await send('Page.navigate', {url: appUrl}); await sleep(1600);
      const err = await run(`document.getElementById('jserr')?.textContent || ''`);
      if (err) throw Error('jserr: ' + err);
    };
    try { await fn({run, shot, boot, send}); } finally { ws.close(); }
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
  const beforeUrl = 'file://' + path.join(beforeRoot, 'mobile', 'index.html');

  // ===== ANTES (app sin gestión de sesiones) =====
  await withPage(async ({run, shot, boot}) => {
    await boot(seedBeforeData(Date.now()));
    // Entrar en la sesión de hoy (la mezclada) y mostrarla.
    await run(`(() => {
      const s = store.list().slice().sort((a,b)=>b.id-a.id)[0];
      curSess = s; data = {shots: s.shots}; live = true; historyMode = false; histId = 0;
      cur = Math.max(0, s.shots.length - 1);
      show('Session');
    })()`);
    await sleep(700);
    await shot('01-antes-sesion-mezclada.png');
    // Vista de sets: el listado no distingue sesiones, solo equipación por set.
    await run(`show('Set')`).catch(() => run(`show('Sets')`));
    await sleep(700);
    await shot('02-antes-sets-mezclados.png');
  }, {appUrl: beforeUrl});

  // ===== DESPUÉS (app con gestión de sesiones) =====
  await withPage(async ({run, shot, boot}) => {
    await boot(seedAfterData(Date.now()));
    // Reanudar la sesión en vivo (como al abrir la app con el sensor activo).
    await run(`(() => {
      const s = store.list().find(x => !x.finished && x.live);
      curSess = s; data = {shots: s.shots}; live = true; historyMode = false; histId = 0;
      cur = Math.max(0, s.shots.length - 1);
      show('Session');
      render();
    })()`);
    await sleep(700);
    await shot('03-despues-sesion-viva.png');

    // Abrir la hoja de sesiones: lista las de hoy + botones.
    await run(`openSess()`);
    await sleep(500);
    await shot('04-despues-sheet-sesiones.png');

    // "Nueva sesión": sella la actual y pregunta el material.
    await run(`newSession()`);
    await sleep(600);
    await shot('05-despues-pregunta-nueva.png');

    // Elegir recurvo y que lleguen tiros del sensor (mismo sid) a la sesión nueva.
    await run(`applySetup('Recurvo 68"','X10 470'); closeGear();`);
    await sleep(300);
    await run(`(() => {
      const sid = '1000-trace';
      [0,1,2,3,4,5].forEach(i => liveEvent({kind:'shot', sid, eid: 100 + i, t: Date.now() + i * 45000, set: 1,
        score: 90, peak: 1700 + i * 40, instab: 100, dt: 50, drawms: 2200, settle: 150,
        tx: Array(40).fill(0).map((_,k)=>Math.round(200*Math.sin(k/4))), ty: Array(40).fill(0).map((_,k)=>Math.round(-150*Math.cos(k/5))),
        qx: Array(40).fill(0), qy: Array(40).fill(0), trace_t: Array(40).fill(0).map((_,k)=>-3800+k*95), mp: Array(24).fill(1000), mq: Array(24).fill(1000)}));
    })()`);
    await sleep(600);
    await shot('06-despues-tras-nueva.png');

    // Hoja otra vez: ahora hay dos sesiones hoy, una por arco.
    await run(`openSess()`);
    await sleep(500);
    await shot('07-despues-dos-sesiones-hoy.png');
  }, {appUrl});

  // ===== comparativas =====
  const p = n => path.join(outDir, n);
  magick(p('01-antes-sesion-mezclada.png'), '-resize', '480x', p('.r1.png'));
  magick(p('03-despues-sesion-viva.png'), '-resize', '480x', p('.r3.png'));
  magick(p('04-despues-sheet-sesiones.png'), '-resize', '480x', p('.r4.png'));
  magick(p('07-despues-dos-sesiones-hoy.png'), '-resize', '480x', p('.r7.png'));
  magick(p('.r1.png'), p('.r3.png'), '+append',
    '-background', '#111', '-gravity', 'south', '-splice', '0x36',
    '-pointsize', '22', '-fill', 'white', '-annotate', '+0+8',
    `ANTES · una sesión mezclada                    DESPUÉS · cada arco, su sesión`,
    p('08-comparativa-sesion.png'));
  magick(p('.r4.png'), p('.r7.png'), '+append',
    '-background', '#111', '-gravity', 'south', '-splice', '0x36',
    '-pointsize', '22', '-fill', 'white', '-annotate', '+0+8',
    `ANTES DE ELEGIR                            DESPUÉS DE TIRAR CON EL OTRO ARCO`,
    p('09-comparativa-sheet.png'));
  try { ['.r1.png', '.r3.png', '.r4.png', '.r7.png'].forEach(f => fs.unlinkSync(p(f))); } catch {}
  console.log(JSON.stringify({outDir}));
})().catch(e => { console.error(e); process.exitCode = 1; });
