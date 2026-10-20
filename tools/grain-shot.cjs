// Captura las tarjetas de compartir con el grano activo, en los tres acabados.
// Uso: node tools/grain-shot.cjs [dirSalida]
// Genera por acabado: antes/despues + detalle 1:1 + comparativas lado a lado.
const {spawn} = require('node:child_process');
const fs = require('node:fs'), os = require('node:os'), path = require('node:path');
const {execFileSync} = require('node:child_process');
const root = path.resolve(__dirname, '..');
const outDir = path.resolve(process.argv[2] || path.join(root, 'screenshots', 'grain'));
const chromium = process.env.CHROMIUM || '/usr/bin/chromium';
const port = 9300 + Math.floor(Math.random() * 400);
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'at-shot-'));
const url = 'file://' + path.join(root, 'mobile/index.html');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const FINISHES = ['glass', 'editorial', 'obsidian'];

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

// Fuerza la versión "vieja" del grano en tiempo de ejecución (sin tocar el .js).
const patchOldGrain = () => {
  Studio.card.grain = null;
  window.studioGrain = function studioGrain(ctx, x, y, w, h, alpha) {
    if (!Studio.card.grain) {
      const N = 192, cell = 3, t = document.createElement('canvas');
      t.width = t.height = N * cell;
      const g = t.getContext('2d');
      const rnd = studioRandom(9157);
      for (let yy = 0; yy < N; yy++) for (let xx = 0; xx < N; xx++) {
        const v = rnd() * 2 - 1, a = Math.min(1, Math.abs(v) * 1.15);
        if (a < 0.08) continue;
        g.fillStyle = v > 0 ? `rgba(255,255,255,${a.toFixed(3)})` : `rgba(0,0,0,${a.toFixed(3)})`;
        g.fillRect(xx * cell, yy * cell, cell, cell);
      }
      Studio.card.grain = t;
    }
    ctx.save();
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = Math.min(0.35, alpha * 2.6);
    ctx.fillStyle = ctx.createPattern(Studio.card.grain, 'repeat');
    ctx.fillRect(x, y, w, h);
    ctx.restore();
  };
};

const restoreGrain = () => {
  // Relee la definición actual del módulo (la del .js ya rebajado).
  Studio.card.grain = null;
  // studioGrain es function declaration en scope global del script; redefinimos con la versión actual.
  window.studioGrain = function studioGrain(ctx, x, y, w, h, alpha) {
    if (!Studio.card.grain) {
      const N = 192, cell = 3, t = document.createElement('canvas');
      t.width = t.height = N * cell;
      const g = t.getContext('2d');
      const rnd = studioRandom(9157);
      for (let yy = 0; yy < N; yy++) for (let xx = 0; xx < N; xx++) {
        const v = rnd() * 2 - 1, a = Math.min(0.85, Math.abs(v) * 0.95);
        if (a < 0.14) continue;
        g.fillStyle = v > 0 ? `rgba(255,255,255,${a.toFixed(3)})` : `rgba(0,0,0,${a.toFixed(3)})`;
        g.fillRect(xx * cell, yy * cell, cell, cell);
      }
      Studio.card.grain = t;
    }
    ctx.save();
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = Math.min(0.18, alpha * 1.5);
    ctx.fillStyle = ctx.createPattern(Studio.card.grain, 'repeat');
    ctx.fillRect(x, y, w, h);
    ctx.restore();
  };
};

function magick(...args) {
  try { execFileSync('magick', args, {stdio: 'pipe'}); } catch (e) { console.error('magick fail', e.message); }
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
    const err = await run(`document.getElementById('jserr')?.textContent || ''`);
    if (err) console.error('jserr', err);

    await run(`(async () => { show('Session'); await new Promise(r => setTimeout(r, 200)); studioOpenShare('session'); await studioPhotoReady(); })()`);

    const shoot = async (finish, variant) => {
      const patch = variant === 'antes' ? patchOldGrain.toString() : restoreGrain.toString();
      return run(`(async (finish) => {
        Studio.card.finish = finish;
        Studio.card.tilt = {x: 0, y: 0};
        (${patch})();
        studioDrawShare(false);
        await new Promise(r => setTimeout(r, 350));
        const c = document.getElementById('shareCanvas');
        const full = c.toDataURL('image/png').split(',')[1];
        const t = document.createElement('canvas'); t.width = 420; t.height = 280;
        t.getContext('2d').drawImage(c, 40, 40, 420, 280, 0, 0, 420, 280);
        const crop = t.toDataURL('image/png').split(',')[1];
        return {full, crop};
      })('${finish}')`);
    };

    const names = {glass: 'cristal', editorial: 'editorial', obsidian: 'obsidiana'};
    for (const finish of FINISHES) {
      const name = names[finish];
      for (const variant of ['antes', 'despues']) {
        const r = await shoot(finish, variant);
        if (!r?.full) throw Error(`no png ${finish} ${variant}`);
        const fullP = path.join(outDir, `${name}-${variant}.png`);
        const cropP = path.join(outDir, `${name}-${variant}-detalle.png`);
        fs.writeFileSync(fullP, Buffer.from(r.full, 'base64'));
        fs.writeFileSync(cropP, Buffer.from(r.crop, 'base64'));
        console.log('ok', path.relative(root, fullP));
      }
      // Comparativas lado a lado
      const detA = path.join(outDir, `${name}-antes-detalle.png`);
      const detB = path.join(outDir, `${name}-despues-detalle.png`);
      const fullA = path.join(outDir, `${name}-antes.png`);
      const fullB = path.join(outDir, `${name}-despues.png`);
      magick(detA, detB, '+append', '-background', '#111', '-gravity', 'south', '-splice', '0x36',
        '-pointsize', '22', '-fill', 'white', '-annotate', '+0+8',
        `ANTES                                                    DESPUÉS`,
        path.join(outDir, `${name}-comparativa-detalle.png`));
      magick(fullA, '-resize', '480x', `${fullA}.r.png`,
        fullB, '-resize', '480x', `${fullB}.r.png`);
      magick(`${fullA}.r.png`, `${fullB}.r.png`, '+append',
        '-background', '#111', '-gravity', 'south', '-splice', '0x36',
        '-pointsize', '22', '-fill', 'white', '-annotate', '+0+8',
        `ANTES                                                    DESPUÉS`,
        path.join(outDir, `${name}-comparativa.png`));
      try { fs.unlinkSync(`${fullA}.r.png`); fs.unlinkSync(`${fullB}.r.png`); } catch {}
      console.log('ok comparativas', name);
    }

    // Comparativa global de detalles de los tres acabados (una fila).
    magick(
      path.join(outDir, 'cristal-comparativa-detalle.png'),
      path.join(outDir, 'editorial-comparativa-detalle.png'),
      path.join(outDir, 'obsidiana-comparativa-detalle.png'),
      '-append', path.join(outDir, 'todos-comparativa-detalle.png')
    );
    console.log(JSON.stringify({outDir, err}));
    ws.close();
  } finally {
    browser.kill(); await sleep(500);
    try { fs.rmSync(profile, {recursive: true, force: true}); } catch {}
  }
})().catch(e => { console.error(e); process.exitCode = 1; });
