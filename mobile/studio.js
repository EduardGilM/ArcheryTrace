/* Perfil, temas, tandas y tarjetas. El ámbar sigue siendo el acento por defecto. */
const StudioScore = (typeof module !== 'undefined') ? require('./score.js') : Score;
const StudioGoals = (typeof module !== 'undefined') ? require('./goals.js') : Goals;
const studioSans = "'Geist', system-ui, sans-serif";
const studioNum = "'Barlow Condensed', sans-serif";
const studioGeist = "'Geist', system-ui, -apple-system, sans-serif";
const Studio = {
  picks: new Set(),
  arrows: new Set(),
  dayIds: new Set(),
  picking: false,
  shareOpen: false,
  shareKind: 'session',
  card: {layout: 'session', tilt: {x: 0, y: 0}, finish: 'glass', preset: 'campo', photo: ''},
  FINISHES: [
    {id: 'glass', name: 'Cristal'},
    {id: 'editorial', name: 'Editorial'},
    {id: 'obsidian', name: 'Obsidiana'}
  ],
  PRESETS: [
    {id: 'campo', name: 'Campo', src: 'photos/campo.js', focus: 0.4},
    {id: 'diana', name: 'Diana', src: 'photos/diana.js', focus: 0.45},
    {id: 'visor', name: 'Visor', src: 'photos/visor.js', focus: 0.35}
  ],
  BANNERS: [{id: 'none', name: 'Sin banner'}, {id: 'campo', name: 'Campo'}, {id: 'diana', name: 'Diana'}, {id: 'visor', name: 'Visor'}],
  THEMES: [
    {id: 'amber', name: 'Ámbar', acc: '#FF8A1F', acc2: '#FFC15E', glow: 'rgba(255,138,31,.28)', ink: '#1b0f05', soft: 'rgba(255,138,31,.12)', line: 'rgba(255,138,31,.45)'},
    {id: 'electric', name: 'Azul', acc: '#2F6BFF', acc2: '#9DB6FF', glow: 'rgba(47,107,255,.35)', ink: '#06101f', soft: 'rgba(47,107,255,.16)', line: 'rgba(47,107,255,.55)'},
    {id: 'cyan', name: 'Cian', acc: '#00E5FF', acc2: '#B8FBFF', glow: 'rgba(0,229,255,.32)', ink: '#041416', soft: 'rgba(0,229,255,.14)', line: 'rgba(0,229,255,.55)'},
    {id: 'lime', name: 'Lima', acc: '#C6FF3D', acc2: '#E7FF9C', glow: 'rgba(198,255,61,.28)', ink: '#141a04', soft: 'rgba(198,255,61,.14)', line: 'rgba(198,255,61,.5)'},
    {id: 'magenta', name: 'Magenta', acc: '#FF2BD6', acc2: '#FFA6EE', glow: 'rgba(255,43,214,.3)', ink: '#1a0614', soft: 'rgba(255,43,214,.14)', line: 'rgba(255,43,214,.5)'},
    {id: 'vivid', name: 'Naranja', acc: '#FF4D00', acc2: '#FFB088', glow: 'rgba(255,77,0,.32)', ink: '#1a0a04', soft: 'rgba(255,77,0,.14)', line: 'rgba(255,77,0,.5)'},
    {id: 'violet', name: 'Violeta', acc: '#7B2BFF', acc2: '#D2B3FF', glow: 'rgba(123,43,255,.32)', ink: '#100818', soft: 'rgba(123,43,255,.16)', line: 'rgba(123,43,255,.55)'},
    {id: 'red', name: 'Rojo', acc: '#FF2430', acc2: '#FF9AA0', glow: 'rgba(255,36,48,.32)', ink: '#1a0608', soft: 'rgba(255,36,48,.14)', line: 'rgba(255,36,48,.5)'},
    {id: 'gold', name: 'Oro', acc: '#E4C36A', acc2: '#F6E7B4', glow: 'rgba(228,195,106,.28)', ink: '#1a1406', soft: 'rgba(228,195,106,.14)', line: 'rgba(228,195,106,.5)'},
    {id: 'ice', name: 'Hielo', acc: '#7EB6FF', acc2: '#D5E8FF', glow: 'rgba(126,182,255,.28)', ink: '#071018', soft: 'rgba(126,182,255,.14)', line: 'rgba(126,182,255,.5)'}
  ],
  LAYOUTS: [
    {id: 'session', name: 'Sesión'},
    {id: 'profile', name: 'Perfil'},
    {id: 'best', name: 'Mejor tanda'}
  ],
  SIZES: {card: {w: 1080, h: 1350}},
  WIDGETS: [
    {id: 'score', name: 'Puntuación', size: 'small'},
    {id: 'stats', name: 'Estadísticas', size: 'wide'},
    {id: 'dist', name: 'Distribución', size: 'wide', variants: [{id: 'bar', name: 'Barra'}, {id: 'donut', name: 'Donut'}, {id: 'columns', name: 'Columnas'}]},
    {id: 'series', name: 'Por serie', size: 'wide'},
    {id: 'group', name: 'Agrupación', size: 'small'},
    {id: 'best', name: 'Mejor serie', size: 'small'},
    {id: 'precision', name: 'Precisión', size: 'small'},
    {id: 'streak', name: 'Mejor racha', size: 'small'},
    {id: 'train', name: 'Días entrenados', size: 'small', variants: [{id: 'year', name: 'Año'}, {id: 'month', name: 'Mes'}, {id: 'week', name: 'Semana'}]},
    {id: 'recent', name: 'Media reciente', size: 'small', variants: [{id: 'a30', name: '30 flechas'}, {id: 'a60', name: '60 flechas'}, {id: 'a120', name: '120 flechas'}, {id: 'a300', name: '300 flechas'}, {id: 'a1000', name: '1000 flechas'}, {id: 'd7', name: '7 días'}, {id: 'd30', name: '30 días'}]},
    {id: 'total', name: 'Flechas totales', size: 'small'},
    {id: 'week', name: 'Esta semana', size: 'small'},
    {id: 'goals', name: 'Objetivos', size: 'wide'}
  ],
  WIDGET_SIZES: [{id: 'small', name: 'Pequeño'}, {id: 'wide', name: 'Ancho'}],
  FX: [{id: 'foot', name: 'Pie de edición', on: true}, {id: 'grain', name: 'Grano', on: false}, {id: 'foil', name: 'Canto holográfico', on: false}, {id: 'mark', name: 'Diana', on: false}, {id: 'duo', name: 'Duotono', on: false}],
  PHOTO_SIZES: [{id: 'tall', name: 'Alta'}, {id: 'short', name: 'Baja'}, {id: 'none', name: 'Sin foto'}],
  CARD_DEFAULTS: {
    glass: {photo: 'tall', widgets: [{id: 'score', size: 'small'}, {id: 'stats', size: 'small'}, {id: 'best', size: 'small'}, {id: 'group', size: 'small'}, {id: 'dist', size: 'wide', variant: 'bar'}]},
    editorial: {photo: 'tall', widgets: [{id: 'score', size: 'wide'}, {id: 'stats', size: 'wide'}, {id: 'dist', size: 'wide', variant: 'bar'}, {id: 'series', size: 'wide'}]},
    obsidian: {photo: 'tall', widgets: [{id: 'score', size: 'small'}, {id: 'series', size: 'small'}, {id: 'stats', size: 'wide'}, {id: 'group', size: 'small'}, {id: 'dist', size: 'small', variant: 'bar'}]}
  },
  // Preferred height of each widget in 1080-wide card pixels: [small, wide]. Distribution depends on its chart.
  WIDGET_HEIGHTS: {
    glass: {goals: [170, 180], recent: [160, 170], total: [150, 150], week: [160, 160], score: [270, 210], stats: [270, 150], bar: [210, 150], donut: [290, 230], columns: [250, 210], series: [250, 190], group: [160, 160], best: [160, 160], precision: [160, 150], streak: [250, 224], train: [250, 224]},
    editorial: {goals: [170, 180], recent: [150, 160], total: [140, 140], week: [150, 150], score: [200, 140], stats: [230, 120], bar: [210, 150], donut: [270, 210], columns: [230, 186], series: [230, 190], group: [160, 145], best: [165, 145], precision: [150, 135], streak: [212, 186], train: [212, 186]},
    obsidian: {goals: [170, 180], recent: [150, 160], total: [140, 140], week: [150, 150], score: [280, 240], stats: [230, 130], bar: [150, 135], donut: [210, 180], columns: [168, 156], series: [280, 200], group: [150, 145], best: [165, 145], precision: [140, 135], streak: [204, 178], train: [204, 178]}
  },
  // Widget area per style: horizontal span, gap between rows and columns, and top edge by photo size.
  CARD_AREAS: {
    glass: {x: 88, w: 904, gap: 18, colGap: 20, bottom: 1262, top: {tall: 668, short: 490, none: 360}},
    editorial: {x: 160, w: 760, gap: 14, colGap: 20, bottom: 1262, top: {tall: 650, short: 500, none: 310}},
    obsidian: {x: 84, w: 912, gap: 22, colGap: 48, bottom: 1278, top: {tall: 722, short: 526, none: 346}}
  },
  MIN_FIT: 0.82,
  sanitizeCard(style, raw) {
    const base = this.CARD_DEFAULTS[style] || this.CARD_DEFAULTS.glass;
    const src = raw && typeof raw === 'object' ? raw : base;
    const photo = this.PHOTO_SIZES.some(p => p.id === src.photo) ? src.photo : base.photo;
    const seen = new Set();
    const widgets = (Array.isArray(src.widgets) ? src.widgets : base.widgets).map(w => {
      const def = w && this.WIDGETS.find(d => d.id === w.id);
      if (!def || seen.has(def.id)) return null;
      seen.add(def.id);
      const out = {id: def.id, size: w.size === 'small' || w.size === 'wide' ? w.size : def.size};
      if (def.variants) out.variant = def.variants.some(v => v.id === w.variant) ? w.variant : def.variants[0].id;
      return out;
    }).filter(Boolean);
    const fx = {};
    this.FX.forEach(f => { fx[f.id] = src.fx && typeof src.fx[f.id] === 'boolean' ? src.fx[f.id] : f.on; });
    return {photo, widgets, fx};
  },
  cardConfig(style) {
    const id = this.CARD_DEFAULTS[style] ? style : 'glass';
    const all = this.card.configs || (this.card.configs = this.loadCards());
    if (!all[id]) all[id] = this.sanitizeCard(id, null);
    return all[id];
  },
  loadCards() {
    const out = {};
    try {
      const raw = JSON.parse(localStorage.getItem('atCardLayouts') || '{}');
      Object.keys(this.CARD_DEFAULTS).forEach(id => { if (raw && raw[id]) out[id] = this.sanitizeCard(id, raw[id]); });
    } catch (e) {}
    return out;
  },
  setCardConfig(style, cfg) {
    const clean = this.sanitizeCard(style, cfg);
    if (!this.cardRows(style, clean).fits) return false;
    const all = this.card.configs || (this.card.configs = this.loadCards());
    all[style] = clean;
    try { localStorage.setItem('atCardLayouts', JSON.stringify(all)); } catch (e) {}
    return true;
  },
  resetCardConfig(style) {
    return this.setCardConfig(style, this.CARD_DEFAULTS[style]);
  },
  // Two small widgets in a row share it; a small one left alone takes the whole row.
  widgetRows(widgets) {
    const rows = [];
    for (let i = 0; i < widgets.length; i++) {
      const w = widgets[i];
      if (w.size === 'small' && widgets[i + 1] && widgets[i + 1].size === 'small') {
        rows.push([{index: i, widget: w, size: 'small'}, {index: i + 1, widget: widgets[i + 1], size: 'small'}]);
        i++;
      } else rows.push([{index: i, widget: w, size: 'wide'}]);
    }
    return rows;
  },
  widgetHeight(style, widget, size) {
    const table = this.WIDGET_HEIGHTS[style] || this.WIDGET_HEIGHTS.glass;
    const key = widget.id === 'dist' ? (widget.variant || 'bar') : widget.id;
    const pair = table[key] || [160, 160];
    return size === 'small' ? pair[0] : pair[1];
  },
  cardRows(style, cfg) {
    const area = this.CARD_AREAS[style] || this.CARD_AREAS.glass;
    const top = area.top[cfg.photo] || area.top.tall;
    const avail = area.bottom - top;
    const rows = this.widgetRows(cfg.widgets).map(items => ({items, h: Math.max.apply(null, items.map(it => this.widgetHeight(style, it.widget, it.size)))}));
    if (!rows.length) return {fits: true, rows: [], top, bottom: area.bottom};
    const natural = rows.reduce((n, r) => n + r.h, 0) + area.gap * (rows.length - 1);
    const k = avail / natural;
    let gap = area.gap, scale = 1;
    if (k < 1) { scale = k; gap = area.gap * k; } else {
      scale = Math.min(k, 1.48);
      const left = avail - rows.reduce((n, r) => n + r.h * scale, 0) - gap * (rows.length - 1);
      if (rows.length > 1 && left > 0) gap += Math.min(area.gap * 2, left / (rows.length - 1));
    }
    let y = top;
    const placed = rows.map(r => {
      const h = r.h * scale;
      const colW = (area.w - area.colGap) / 2;
      const items = r.items.map((it, j) => ({index: it.index, widget: it.widget, size: it.size, x: r.items.length > 1 ? area.x + j * (colW + area.colGap) : area.x, y, w: r.items.length > 1 ? colW : area.w, h}));
      const row = {y, h, items};
      y += h + gap;
      return row;
    });
    return {fits: k >= this.MIN_FIT, rows: placed, top, bottom: area.bottom};
  },
  theme() {
    let id = 'amber';
    try {
      const saved = localStorage.getItem('atTheme');
      if (this.THEMES.some(t => t.id === saved)) id = saved;
    } catch (e) {}
    return this.THEMES.find(t => t.id === id) || this.THEMES[0];
  },
  setTheme(id) {
    const theme = this.THEMES.find(t => t.id === id) || this.THEMES[0];
    try { localStorage.setItem('atTheme', theme.id); } catch (e) {}
    this.applyTheme();
    if (typeof render === 'function') render();
  },
  applyTheme() {
    const theme = this.theme();
    if (typeof document !== 'undefined' && document.documentElement) {
      const root = document.documentElement.style;
      root.setProperty('--acc', theme.acc);
      root.setProperty('--acc2', theme.acc2);
      root.setProperty('--glow', theme.glow);
      root.setProperty('--acc-ink', theme.ink);
      root.setProperty('--acc-soft', theme.soft);
      root.setProperty('--acc-line', theme.line);
    }
    if (typeof themeAcc !== 'undefined') themeAcc = theme.acc;
    if (typeof C !== 'undefined' && C) { C.mark = theme.acc; C.rel = theme.acc; }
    if (typeof ACOLORS !== 'undefined' && ACOLORS) ACOLORS[0] = theme.acc;
    return theme;
  },
  dayKey(ms) {
    const d = new Date(ms);
    if (!Number.isFinite(d.getTime())) return '';
    return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate();
  },
  tag(session, phase, opts) {
    const o = opts || {};
    const sets = new Set((o.sets || []).map(v => String(v)));
    const times = new Set((o.times || []).map(Number));
    (session && session.shots || []).forEach(s => {
      if (!s) return;
      if (!o.all && !sets.has(String(s.set_id)) && !times.has(Number(s.t_ms))) return;
      if (phase === 'warm' || phase === 'score') s.phase = phase;
      else delete s.phase;
    });
    return session;
  },
  scorePool(shots) {
    const real = (shots || []).filter(s => s && !s.candidate);
    const marked = real.filter(s => s.phase === 'score');
    return marked.length ? marked : real.filter(s => s.phase !== 'warm');
  },
  cardDate(ms) {
    const d = new Date(ms);
    if (!Number.isFinite(d.getTime())) return '';
    const days = ['DOM', 'LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB'];
    const months = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC'];
    return days[d.getDay()] + ' ' + d.getDate() + ' ' + months[d.getMonth()] + ' ' + d.getFullYear();
  },
  cardCopy(session, when) {
    const indoor = !!(session && session.mode === 'Indoor');
    return {
      brand: 'ARCHERY TRACE',
      kicker: indoor ? 'SESIÓN INDOOR' : (session && session.mode === 'Outdoor' ? 'SESIÓN OUTDOOR' : 'SESIÓN'),
      date: this.cardDate(when)
    };
  },
  breakdown(shots) {
    const counts = new Map();
    (shots || []).forEach(s => {
      if (!s || s.candidate) return;
      const v = s.result && s.result.value;
      if (v == null || v === '') return;
      if (StudioScore.points(v) == null && v !== 'M') return;
      counts.set(String(v), (counts.get(String(v)) || 0) + 1);
    });
    const order = ['X', '11', '10', '9', '8', '7', '6', 'M'];
    const parts = [];
    order.forEach(v => {
      const n = counts.get(v);
      if (!n) return;
      parts.push(v === 'X' || v === 'M' ? n + ' ' + v : n + '×' + v);
      counts.delete(v);
    });
    return parts.join(' · ');
  },
  bestSet(shots) {
    const pool = this.scorePool(shots);
    const order = [];
    const map = new Map();
    pool.forEach(s => {
      const id = String(s.set_id ?? '');
      if (!map.has(id)) { map.set(id, []); order.push(id); }
      map.get(id).push(s);
    });
    let best = null;
    order.forEach((id, i) => {
      const rows = map.get(id);
      const scored = rows.filter(s => StudioScore.points(s.result && s.result.value) != null);
      if (!scored.length) return;
      const sum = scored.reduce((n, s) => n + StudioScore.points(s.result.value), 0);
      if (!best || sum > best.sum) best = {id, index: i + 1, sum, rows};
    });
    return best;
  },
  isRecord(score, peers) {
    if (score == null) return false;
    let best = null;
    (peers || []).forEach(s => {
      if (!s) return;
      const t = StudioScore.totals((s.shots || []).filter(x => x && !x.candidate));
      if (t.score == null) return;
      best = best == null ? t.score : Math.max(best, t.score);
    });
    return best == null || score > best;
  },
  sharedFormat(sessions) {
    const formats = new Set();
    (sessions || []).forEach(s => {
      if (!s) return;
      const scored = (s.shots || []).some(a => a && !a.candidate && StudioScore.points(a.result && a.result.value) != null);
      if (!scored) return;
      formats.add(StudioScore.formatOf(s) || 'pad');
    });
    if (formats.size !== 1) return null;
    const only = [...formats][0];
    return only === 'pad' ? null : only;
  },
  performance(sessions) {
    const real = [], setAvg = [];
    (sessions || []).forEach(session => {
      const rows = ((session && session.shots) || []).filter(x => x && !x.candidate);
      real.push(...rows);
      studioSetsOf(rows).forEach(g => {
        const p = g.rows.map(x => StudioScore.points(x.result && x.result.value)).filter(v => v != null);
        if (p.length >= 2) setAvg.push(p.reduce((x, y) => x + y, 0) / p.length);
      });
    });
    const mean = a => a.length ? a.reduce((x, y) => x + y, 0) / a.length : null;
    const clamp = v => Math.max(0, Math.min(100, v));
    const one = n => (Math.round(n * 10) / 10).toFixed(1).replace('.', ',');
    const scored = real.filter(x => StudioScore.points(x.result && x.result.value) != null);
    const avg = mean(scored.map(x => StudioScore.points(x.result.value)));
    const center = scored.length ? scored.filter(x => StudioScore.groupOf(x.result.value) === 'x10').length / scored.length : null;
    const impacts = StudioScore.impacts(scored).length;
    const spread = studioSpread(scored);
    const cm = spread == null ? null : spread * 10;
    const aims = real.map(x => x.aim_score).filter(Number.isFinite);
    const stab = mean(aims);
    const m = mean(setAvg);
    const sd = setAvg.length >= 3 ? Math.sqrt(mean(setAvg.map(v => (v - m) ** 2))) : null;
    const axis = (id, label, raw, n, need, v, text) => {
      const thin = raw == null || n < need;
      return {id, label, n, thin, raw: thin ? null : raw, value: thin ? null : clamp(v), text: thin ? '–' : text};
    };
    return [
      axis('points', 'Puntos', avg, scored.length, 8, (avg - 6) / 4 * 100, avg == null ? '' : one(avg)),
      axis('center', 'Centro', center, scored.length, 8, center * 100, Math.round(center * 100) + '%'),
      axis('group', 'Agrupación', cm, impacts, 8, 100 - (cm - 1) / 5 * 100, cm == null ? '' : one(cm) + ' cm'),
      axis('stability', 'Estabilidad', stab, aims.length, 8, stab, String(Math.round(stab))),
      axis('steady', 'Constancia', sd, setAvg.length, 3, 100 - sd / 1.5 * 100, sd == null ? '' : '±' + one(sd))
    ];
  },
  // Racha de la tarjeta: flechas seguidas en el anillo alto, el grupo x10 de Score (X, 10 y 11).
  // Un 9 o menos, o una M, la corta. Las candidatas no entran. La más larga es el primer tramo que llega al máximo; la actual es el tramo que sigue abierto al final.
  arrowStreak(shots) {
    const seq = [], sets = [];
    let best = 0, current = 0, start = -1, from = 0;
    (shots || []).forEach(s => {
      if (!s || s.candidate) return;
      const v = s.result && s.result.value;
      if (v == null || v === '' || (StudioScore.points(v) == null && v !== 'M')) return;
      const set = String(s.set_id ?? '');
      if (!sets.includes(set)) sets.push(set);
      const group = StudioScore.groupOf(String(v));
      if (group === 'x10') {
        if (!current) from = seq.length;
        current++;
        if (current > best) { best = current; start = from; }
      } else current = 0;
      seq.push({v: String(v), group, set: sets.indexOf(set) + 1});
    });
    const run = start < 0 ? [] : seq.slice(start, start + best);
    return {best, current, values: run.map(a => a.v).slice(0, 16), seq, start, from: run.length ? run[0].set : 0, to: run.length ? run[run.length - 1].set : 0};
  },
  trainingStreak(sessions, now) {
    const when = now instanceof Date ? now : new Date(now || Date.now());
    const today = StudioGoals.daySerial(when);
    if (today == null) return {current: 0, best: 0, week: [], two: [], weeks: [], trained: 0};
    const {days} = StudioGoals.buckets(sessions);
    const run = StudioGoals.streak(days, today, 1);
    const counts = new Map();
    (sessions || []).forEach(s => {
      const d = StudioGoals.daySerial(s && s.id);
      const n = StudioGoals.realShots(s).length;
      if (d != null && n) counts.set(d, (counts.get(d) || 0) + n);
    });
    const p = StudioGoals.localParts(when);
    const monday = today - (new Date(Date.UTC(p.y, p.m - 1, p.d)).getUTCDay() + 6) % 7;
    const end = days.has(today) ? today : today - 1;
    const cell = d => ({day: d, dow: (new Date(d * 86400000).getUTCDay() + 6) % 7, on: days.has(d), n: counts.get(d) || 0, run: d <= end && d > end - run.current, today: d === today, future: d > today});
    const weeks = [3, 2, 1, 0].map(w => Array.from({length: 7}, (_, i) => cell(monday - w * 7 + i)));
    const last = n => Array.from({length: n}, (_, i) => cell(today - n + 1 + i));
    return {current: run.current, best: run.best, week: last(7), two: last(14), weeks, trained: weeks.flat().filter(c => c.on).length};
  },
  heatmap(sessions, now, weeks) {
    const nWeeks = weeks || 18;
    const when = now instanceof Date ? now : new Date(now || Date.now());
    const today = StudioGoals.daySerial(when);
    const parts = StudioGoals.localParts(when);
    if (today == null || !parts) return {weeks: nWeeks, start: 0, today: 0, cells: []};
    const dow = new Date(Date.UTC(parts.y, parts.m - 1, parts.d)).getUTCDay();
    const monday = today - (dow + 6) % 7;
    const start = monday - (nWeeks - 1) * 7;
    const counts = new Map();
    (sessions || []).forEach(s => {
      const day = StudioGoals.daySerial(s && s.id);
      if (day == null || day > today) return;
      const arrows = ((s && s.shots) || []).filter(x => x && !x.candidate).length;
      counts.set(day, (counts.get(day) || 0) + arrows);
    });
    const cells = [];
    for (let w = 0; w < nWeeks; w++) {
      for (let r = 0; r < 7; r++) {
        const day = start + w * 7 + r;
        const future = day > today;
        const n = future ? 0 : (counts.get(day) || 0);
        const level = !n ? 0 : n >= 60 ? 4 : n >= 30 ? 3 : n >= 12 ? 2 : 1;
        cells.push({day, w, r, n, level, future});
      }
    }
    return {weeks: nWeeks, start, today, cells};
  },
  profile() {
    const blank = {name: '', club: '', photo: '', banner: 'campo'};
    try {
      const raw = JSON.parse(localStorage.getItem('atProfile') || 'null');
      if (!raw || typeof raw !== 'object') return blank;
      const b = raw.banner;
      return {
        name: String(raw.name || '').slice(0, 32),
        club: String(raw.club || '').slice(0, 40),
        photo: typeof raw.photo === 'string' && raw.photo.length < 300000 ? raw.photo : '',
        banner: typeof b === 'string' && (this.BANNERS.some(x => x.id === b) || (b.length < 600000 && /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(b))) ? b : 'campo'
      };
    } catch (e) { return blank; }
  },
  profileArt() {
    const p = this.profile();
    const preset = this.PRESETS.find(x => x.id === p.banner);
    const words = p.name.trim().split(/\s+/).filter(Boolean);
    return {
      photo: p.banner === 'none' ? '' : preset ? studioPresetUrl(preset) : p.banner,
      focus: preset ? preset.focus : 0.5,
      avatar: p.photo,
      initials: words.slice(0, 2).map(w => w[0].toUpperCase()).join('')
    };
  },
  saveProfile(patch) {
    const next = {...this.profile(), ...patch};
    try { localStorage.setItem('atProfile', JSON.stringify({name: next.name, club: next.club, photo: next.photo, banner: next.banner})); } catch (e) {}
    return next;
  },
  historyShots() {
    if (typeof store === 'undefined') return [];
    const out = [];
    store.list().forEach(s => statShots(s.shots || []).forEach(a => { if (a && !a.candidate) out.push(a); }));
    return out;
  },
  onSetClick(e) {
    if (!this.picking || !e || !e.target || !e.target.closest) return false;
    if (e.target.closest('.r') || e.target.closest('.modeSeg') || e.target.closest('#pickBar')) return false;
    if (e.target.closest('#setList summary') || e.target.closest('#setList .trendRow')) {
      if (e.preventDefault) e.preventDefault();
      if (e.stopPropagation) e.stopPropagation();
      return true;
    }
    return false;
  }
};
if (typeof module !== 'undefined') module.exports = Studio;

function studioClearPick() {
  Studio.picking = false;
  Studio.picks.clear();
  Studio.arrows.clear();
  Studio.dayIds.clear();
}

function studioHaptic(el) {
  Studio._vib = Date.now();
  try { if (navigator.vibrate) navigator.vibrate([14, 28, 18]); } catch (e) {}
  if (!el || !el.classList) return;
  const node = el.classList.contains('trendRow') ? el : (el.closest && el.closest('details')) || el;
  node.classList.remove('wiggle');
  void node.offsetWidth;
  node.classList.add('wiggle');
}

function studioSessionIds(session) {
  const ids = [];
  const seen = new Set();
  (session && session.shots || []).forEach(s => {
    if (!s || s.set_id == null) return;
    const id = String(s.set_id);
    if (seen.has(id)) return;
    seen.add(id);
    ids.push(id);
  });
  return ids;
}

function studioSameDay(session) {
  if (!session || typeof store === 'undefined' || !store.list) return [];
  const key = Studio.dayKey(session.id);
  if (!key) return [];
  return store.list().filter(s => s && s.id !== session.id && Studio.dayKey(s.id) === key);
}

function studioSessionFull(session) {
  const ids = studioSessionIds(session);
  return ids.length > 0 && ids.every(id => Studio.picks.has(id)) && Studio.arrows.size === 0;
}

function studioPickCount() {
  let n = 0;
  const session = typeof displayedSession === 'function' ? displayedSession() : null;
  const cur = session && session.id;
  (session && session.shots || []).forEach(s => {
    if (!s) return;
    if (Studio.picks.has(String(s.set_id)) || (Number.isFinite(Number(s.t_ms)) && Studio.arrows.has(Number(s.t_ms)))) n++;
  });
  if (typeof store !== 'undefined' && store.list && Studio.dayIds.size) {
    store.list().forEach(s => {
      if (!s || s.id === cur || !Studio.dayIds.has(s.id)) return;
      (s.shots || []).forEach(a => { if (a) n++; });
    });
  }
  return n;
}

function studioToggleSet(sid) {
  if (sid == null) return;
  const setId = String(sid);
  const session = typeof displayedSession === 'function' ? displayedSession() : null;
  (session && session.shots || []).forEach(s => {
    if (s && String(s.set_id) === setId) Studio.arrows.delete(Number(s.t_ms));
  });
  if (Studio.picks.has(setId)) Studio.picks.delete(setId);
  else Studio.picks.add(setId);
}

function studioToggleArrow(t, sid) {
  const time = Number(t);
  if (!Number.isFinite(time)) return;
  const setId = sid == null ? '' : String(sid);
  if (setId && Studio.picks.has(setId)) {
    Studio.picks.delete(setId);
    const session = typeof displayedSession === 'function' ? displayedSession() : null;
    (session && session.shots || []).forEach(s => {
      if (!s || String(s.set_id) !== setId) return;
      const ms = Number(s.t_ms);
      if (Number.isFinite(ms) && ms !== time) Studio.arrows.add(ms);
    });
    Studio.arrows.delete(time);
    return;
  }
  if (Studio.arrows.has(time)) Studio.arrows.delete(time);
  else Studio.arrows.add(time);
}

function studioPickSession() {
  const session = typeof displayedSession === 'function' ? displayedSession() : null;
  const ids = studioSessionIds(session);
  const full = studioSessionFull(session) && Studio.dayIds.size === 0;
  Studio.arrows.clear();
  Studio.dayIds.clear();
  Studio.picks.clear();
  if (!full) ids.forEach(id => Studio.picks.add(id));
}

function studioPickDay() {
  const session = typeof displayedSession === 'function' ? displayedSession() : null;
  const ids = studioSessionIds(session);
  const others = studioSameDay(session);
  const full = studioSessionFull(session) && others.every(s => Studio.dayIds.has(s.id)) && Studio.dayIds.size === others.length;
  Studio.arrows.clear();
  Studio.picks.clear();
  Studio.dayIds.clear();
  if (full) return;
  ids.forEach(id => Studio.picks.add(id));
  others.forEach(s => Studio.dayIds.add(s.id));
}

function studioApplyPick(phase) {
  if (!studioPickCount()) {
    if (typeof notice === 'function') notice('Elige al menos una flecha.');
    return;
  }
  const sets = [...Studio.picks];
  const times = [...Studio.arrows];
  const days = new Set(Studio.dayIds);
  const current = typeof displayedSession === 'function' ? displayedSession() : null;
  const currentId = current && current.id;
  if (typeof store === 'undefined' || !store.list || !store.save) {
    if (current) Studio.tag(current, phase, {sets, times});
    studioClearPick();
    if (typeof render === 'function') render();
    return;
  }
  const L = store.list();
  L.forEach(s => {
    if (!s) return;
    if (s.id === currentId) Studio.tag(s, phase, {sets, times});
    else if (days.has(s.id)) Studio.tag(s, phase, {all: true});
  });
  store.save(L);
  const fresh = L.find(s => s.id === currentId);
  if (fresh && typeof historyMode !== 'undefined') {
    const shown = historyMode ? histId : (curSess && curSess.id);
    if (shown === fresh.id) {
      data = {shots: fresh.shots};
      if (!historyMode) curSess = fresh;
    }
  }
  studioClearPick();
  if (typeof render === 'function') render();
}

function studioMount() {
  if (typeof document === 'undefined' || !document.getElementById || Studio.mounted) return;
  Studio.mounted = true;
  const $ = id => document.getElementById(id);
  Studio.applyTheme();
  const profileNav = $('nProfile');
  if (profileNav) profileNav.onclick = () => show('Profile');
  const list = $('setList');
  const root = $('vSession') || list;
  let hold = 0, suppress = false, x0 = 0, y0 = 0;
  if (list) {
    list.addEventListener('pointerdown', e => {
      if (!e.target.closest) return;
      if (e.target.closest('.modeSeg') || e.target.closest('.r') || e.target.closest('#pickBar')) return;
      const row = e.target.closest('.trendRow');
      const sum = e.target.closest('summary');
      if (!row && !sum) return;
      x0 = e.clientX; y0 = e.clientY;
      clearTimeout(hold);
      const box = (row || sum).closest('details');
      const sid = box && box.dataset.sid;
      const t = row && row.dataset.t;
      hold = setTimeout(() => {
        Studio.picking = true;
        if (row && t != null && t !== '') {
          const time = Number(t);
          if (Number.isFinite(time) && !(sid != null && Studio.picks.has(String(sid)))) Studio.arrows.add(time);
        } else if (sid != null) Studio.picks.add(String(sid));
        suppress = true;
        setTimeout(() => { suppress = false; }, 700);
        studioHaptic(row || sum);
        studioSync();
      }, 480);
    });
    const drop = e => {
      if (e && Math.hypot((e.clientX || 0) - x0, (e.clientY || 0) - y0) > 12) clearTimeout(hold);
    };
    list.addEventListener('pointermove', drop);
    list.addEventListener('pointerup', () => clearTimeout(hold));
    list.addEventListener('pointercancel', () => clearTimeout(hold));
    list.addEventListener('contextmenu', e => {
      if (e.target.closest && (e.target.closest('summary') || e.target.closest('.trendRow'))) e.preventDefault();
    });
  }
  if (root) {
    root.addEventListener('click', e => {
      if (!e.target.closest) return;
      if (suppress) {
        suppress = false;
        e.preventDefault();
        e.stopPropagation();
        return;
      }
      const bulk = e.target.closest('[data-bulk]');
      if (bulk) {
        e.preventDefault();
        e.stopPropagation();
        if (bulk.dataset.bulk === 'done') { studioClearPick(); studioSync(); return; }
        if (bulk.dataset.bulk === 'delete') { studioDeletePick(); return; }
        studioApplyPick(bulk.dataset.bulk);
        return;
      }
      const scope = e.target.closest('[data-scope]');
      if (scope && Studio.picking) {
        e.preventDefault();
        e.stopPropagation();
        if (scope.dataset.scope === 'day') studioPickDay();
        else studioPickSession();
        studioSync();
        return;
      }
      if (!Studio.picking) return;
      if (e.target.closest('.r') || e.target.closest('#pickBar')) return;
      const row = e.target.closest('#setList .trendRow');
      if (row) {
        e.preventDefault();
        e.stopPropagation();
        const det = row.closest('details');
        studioToggleArrow(row.dataset.t, det && det.dataset.sid);
        studioSync();
        return;
      }
      const sum = e.target.closest('#setList summary');
      if (!sum) return;
      e.preventDefault();
      e.stopPropagation();
      studioToggleSet(sum.parentElement && sum.parentElement.dataset.sid);
      studioSync();
    }, true);
  }
  const swatches = $('themeSwatches');
  if (swatches) {
    swatches.innerHTML = Studio.THEMES.map(t => `<button type="button" data-theme="${t.id}" style="--sw:${t.acc}" aria-label="${t.name}"><i></i><small>${t.name}</small></button>`).join('');
    swatches.onclick = e => {
      const b = e.target.closest('[data-theme]');
      if (b) Studio.setTheme(b.dataset.theme);
    };
  }
  const layouts = $('shareLayouts');
  if (layouts) {
    layouts.innerHTML = Studio.LAYOUTS.map(t => `<button type="button" data-layout="${t.id}">${t.name}</button>`).join('');
    layouts.onclick = e => {
      const b = e.target.closest('[data-layout]');
      if (!b) return;
      Studio.card.layout = b.dataset.layout;
      studioDrawShare();
      studioSyncShare();
    };
  }
  const thumbs = $('shareThumbs');
  if (thumbs) thumbs.onclick = e => {
    const b = e.target.closest('[data-layout]');
    if (!b) return;
    Studio.card.layout = b.dataset.layout;
    studioDrawShare();
  };
  const stage = $('holoStage');
  if (stage) {
    stage.onpointerdown = e => { if (Studio.card.editing) return; stage.setPointerCapture?.(e.pointerId); studioTiltFrom(stage, e); };
    stage.onpointermove = e => { if (e.buttons && !Studio.card.editing) studioTiltFrom(stage, e); };
    stage.onpointerup = () => { if (!Studio.card.editing) studioTilt(0, 0); };
    stage.onpointerleave = () => { if (!Studio.card.editing) studioTilt(0, 0); };
  }
  const gyroBtn = $('shareGyro');
  if (gyroBtn) gyroBtn.onclick = () => studioListenGyro(true);
  const finishBar = $('shareFinish');
  if (finishBar) finishBar.onclick = e => {
    const b = e.target.closest('[data-finish]');
    if (!b || !Studio.FINISHES.some(f => f.id === b.dataset.finish)) return;
    Studio.card.finish = b.dataset.finish;
    studioDrawShare();
  };
  const presets = $('sharePresets');
  if (presets) {
    presets.innerHTML = Studio.PRESETS.map(p => `<button type="button" data-preset="${p.id}"><i><img alt=""></i><small>${p.name}</small></button>`).join('');
    presets.onclick = e => {
      const b = e.target.closest('[data-preset]');
      if (!b) return;
      Studio.card.preset = b.dataset.preset;
      studioSetCardPhoto('');
    };
  }
  const cam = $('shareCam'), camFile = $('shareCamFile'), lib = $('shareLib'), libFile = $('shareLibFile');
  if (cam && camFile) cam.onclick = () => camFile.click();
  if (lib && libFile) lib.onclick = () => libFile.click();
  const onPhotoFile = file => { if (file) studioOpenCrop(file); };
  if (camFile) camFile.onchange = () => { onPhotoFile(camFile.files && camFile.files[0]); camFile.value = ''; };
  if (libFile) libFile.onchange = () => { onPhotoFile(libFile.files && libFile.files[0]); libFile.value = ''; };
  const clearPhoto = $('sharePhotoClear');
  if (clearPhoto) clearPhoto.onclick = () => studioSetCardPhoto('');
  const cropCanvas = $('cropCanvas');
  if (cropCanvas) {
    cropCanvas.onpointerdown = e => { studioCrop.drag = {x: e.clientX, y: e.clientY, ox: studioCrop.x, oy: studioCrop.y}; cropCanvas.setPointerCapture?.(e.pointerId); };
    cropCanvas.onpointermove = e => {
      if (!studioCrop.drag) return;
      const rect = cropCanvas.getBoundingClientRect();
      const sx = cropCanvas.width / Math.max(1, rect.width);
      const sy = cropCanvas.height / Math.max(1, rect.height);
      studioCrop.x = studioCrop.drag.ox + (e.clientX - studioCrop.drag.x) * sx;
      studioCrop.y = studioCrop.drag.oy + (e.clientY - studioCrop.drag.y) * sy;
      studioDrawCrop();
    };
    cropCanvas.onpointerup = cropCanvas.onpointercancel = () => { studioCrop.drag = null; };
  }
  const cropZoom = $('cropZoom');
  if (cropZoom) cropZoom.oninput = () => studioCropZoom(Number(cropZoom.value));
  const cropUse = $('cropUse');
  if (cropUse) cropUse.onclick = () => studioCommitCrop();
  const cropCancel = $('cropCancel');
  if (cropCancel) cropCancel.onclick = () => studioCloseCrop();
  if (typeof DeviceOrientationEvent === 'undefined' || typeof DeviceOrientationEvent.requestPermission !== 'function') {
    if (gyroBtn) gyroBtn.hidden = true;
    studioListenGyro(false);
  }
  const bannerEdit = $('profileBannerEdit'), bannerPick = $('bannerPick'), bannerFile = $('bannerFile'), bannerCam = $('bannerCamFile');
  if (bannerEdit && bannerPick) bannerEdit.onclick = () => {
    bannerPick.hidden = !bannerPick.hidden;
    bannerEdit.setAttribute('aria-expanded', bannerPick.hidden ? 'false' : 'true');
    studioBannerPick();
  };
  if (bannerPick) bannerPick.onclick = e => {
    const b = e.target.closest('[data-banner]');
    if (!b) return;
    const id = b.dataset.banner;
    if (id === 'file' || id === 'camera') { const input = id === 'file' ? bannerFile : bannerCam; if (input) input.click(); return; }
    if (id !== 'custom') Studio.saveProfile({banner: id});
    studioPaintBanner();
    studioBannerPick();
  };
  [bannerFile, bannerCam].forEach(input => {
    if (input) input.onchange = () => { const file = input.files && input.files[0]; input.value = ''; if (file) studioOpenCrop(file, 'banner'); };
  });
  const photoBtn = $('profilePhotoBtn'), photoFile = $('profileFile');
  if (photoBtn && photoFile) photoBtn.onclick = () => photoFile.click();
  if (photoFile) photoFile.onchange = () => {
    const file = photoFile.files && photoFile.files[0];
    if (!file) return;
    const img = new Image();
    img.onload = () => {
      const c = document.createElement('canvas');
      c.width = c.height = 320;
      const x = c.getContext('2d');
      const scale = Math.max(320 / img.width, 320 / img.height);
      const w = img.width * scale, h = img.height * scale;
      x.drawImage(img, (320 - w) / 2, (320 - h) / 2, w, h);
      let q = 0.82, url = c.toDataURL('image/jpeg', q);
      while (url.length > 180000 && q > 0.45) { q -= 0.08; url = c.toDataURL('image/jpeg', q); }
      Studio.saveProfile({photo: url});
      studioPaintProfile();
      URL.revokeObjectURL(img.src);
    };
    img.src = URL.createObjectURL(file);
  };
  ['profileName', 'profileClub'].forEach(id => {
    const el = $(id);
    if (!el) return;
    el.addEventListener('input', () => {
      const patch = {};
      patch[id === 'profileName' ? 'name' : 'club'] = el.value;
      Studio.saveProfile(patch);
    });
  });
  const open = $('openShare');
  if (open) open.onclick = () => studioOpenShare('session');
  const shareProfile = $('shareProfile');
  if (shareProfile) shareProfile.onclick = () => studioOpenShare('profile');
  const close = $('shareClose');
  if (close) close.onclick = () => { Studio.shareOpen = false; const sheet = $('shareSheet'); if (sheet) sheet.hidden = true; };
  const exp = $('shareExport');
  if (exp) exp.onclick = () => studioExport();
  studioMountWidgets($);
  if (typeof render === 'function') {
    const prev = render;
    render = function () { prev(); studioPaint(); };
  }
}

function studioCommit(mutator) {
  if (typeof displayedSession !== 'function' || typeof saveSession !== 'function') return;
  const s = displayedSession();
  if (!s) return;
  mutator(s);
  saveSession(s);
  if ((typeof historyMode !== 'undefined' && historyMode ? histId : curSess && curSess.id) === s.id) {
    data = {shots: s.shots};
    if (!historyMode) curSess = s;
  }
  if (typeof render === 'function') render();
}

function studioFit(c, cssH) {
  if (!c || !c.getContext) return null;
  const dpr = (typeof devicePixelRatio === 'number' && devicePixelRatio) || 1;
  const w = c.clientWidth || 320;
  c.width = Math.max(1, Math.round(w * dpr));
  c.height = Math.max(1, Math.round(cssH * dpr));
  const x = c.getContext('2d');
  x.setTransform(dpr, 0, 0, dpr, 0, 0);
  x.clearRect(0, 0, w, cssH);
  return {x, w, h: cssH};
}

function studioRadarDraw(ctx, cx, cy, R, now, before, theme) {
  const n = now.length, ang = i => -Math.PI / 2 + i * Math.PI * 2 / n;
  const pt = (i, v) => [cx + Math.cos(ang(i)) * R * v / 100, cy + Math.sin(ang(i)) * R * v / 100];
  const path = axes => axes.forEach((a, i) => { const [x, y] = pt(i, a.value); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); });
  ctx.save();
  [25, 50, 75, 100].forEach(ring => {
    ctx.beginPath();
    for (let i = 0; i < n; i++) { const [x, y] = pt(i, ring); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
    ctx.closePath();
    ctx.strokeStyle = ring === 100 ? 'rgba(255,255,255,.16)' : 'rgba(255,255,255,.07)';
    ctx.lineWidth = 1;
    ctx.stroke();
  });
  now.forEach((a, i) => {
    const [x, y] = pt(i, 100);
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(x, y);
    ctx.setLineDash(a.thin ? [3, 4] : []);
    ctx.strokeStyle = a.thin ? 'rgba(255,255,255,.3)' : 'rgba(255,255,255,.07)';
    ctx.stroke();
  });
  ctx.setLineDash([]);
  if (before && before.every(a => a.value != null)) {
    ctx.beginPath();
    path(before);
    ctx.closePath();
    ctx.setLineDash([4, 4]);
    ctx.strokeStyle = 'rgba(255,255,255,.45)';
    ctx.lineWidth = 1.4;
    ctx.stroke();
    ctx.setLineDash([]);
  }
  if (now.every(a => a.value != null)) {
    ctx.beginPath();
    path(now);
    ctx.closePath();
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, R);
    g.addColorStop(0, studioRgba(theme.acc, 0.08));
    g.addColorStop(1, studioRgba(theme.acc, 0.3));
    ctx.fillStyle = g;
    ctx.fill();
    ctx.shadowColor = studioRgba(theme.acc, 0.6);
    ctx.shadowBlur = 10;
    ctx.strokeStyle = theme.acc;
    ctx.lineWidth = 2.2;
    ctx.stroke();
    ctx.shadowBlur = 0;
    now.forEach((a, i) => {
      const [x, y] = pt(i, a.value);
      ctx.beginPath();
      ctx.arc(x, y, 3.4, 0, Math.PI * 2);
      ctx.fillStyle = '#fff';
      ctx.fill();
    });
  }
  now.forEach((a, i) => {
    const c = Math.cos(ang(i)), s = Math.sin(ang(i));
    const side = Math.abs(c) < 0.3 ? 0 : c > 0 ? 1 : -1;
    const lx = cx + c * (R + 30) - side * 12, ly = cy + s * (R + 22);
    ctx.textAlign = side === 0 ? 'center' : side > 0 ? 'left' : 'right';
    ctx.font = '500 9.5px ' + studioSans;
    ctx.fillStyle = a.thin ? 'rgba(255,255,255,.32)' : 'rgba(255,255,255,.58)';
    ctx.fillText(a.label.toUpperCase().split('').join(String.fromCharCode(8202)), lx, ly - 6);
    ctx.font = '600 19px ' + studioNum;
    ctx.fillStyle = a.thin ? 'rgba(255,255,255,.32)' : '#fff';
    ctx.fillText(a.text, lx, ly + 13);
  });
  ctx.restore();
}

function studioPaint() {
  try {
    Studio.applyTheme();
    studioSync();
    if (typeof view === 'undefined') return;
    if (view === 'Profile') { studioPaintProfile(); studioPaintProgress(); studioPaintHeat(); }
    if (Studio.shareOpen) studioDrawShare();
  } catch (e) {}
}

function studioSync() {
  const sw = document.getElementById('themeSwatches');
  if (sw) sw.querySelectorAll('[data-theme]').forEach(b => b.classList.toggle('on', b.dataset.theme === Studio.theme().id));
  const themeName = document.getElementById('themeName');
  if (themeName) themeName.textContent = Studio.theme().name;
  studioModes();
  const share = document.getElementById('openShare');
  if (share) share.hidden = !(typeof data !== 'undefined' && data && data.shots && data.shots.length);
  let newlyPicked = false;
  document.querySelectorAll('#setList details').forEach(d => {
    const setOn = Studio.picking && Studio.picks.has(d.dataset.sid);
    if (setOn && !d.classList.contains('picked')) newlyPicked = true;
    d.classList.toggle('picked', setOn);
    d.querySelectorAll('.trendRow').forEach(row => {
      const t = Number(row.dataset.t);
      const on = !!(Studio.picking && (setOn || (Number.isFinite(t) && Studio.arrows.has(t))));
      if (on && !setOn && !row.classList.contains('picked')) newlyPicked = true;
      row.classList.toggle('picked', on);
    });
  });
  if (newlyPicked && navigator.vibrate && Date.now() - (Studio._vib || 0) > 250) { try { navigator.vibrate(8); } catch (e) {} }
  studioSyncShare();
}

function studioPickInfo() {
  const session = typeof displayedSession === 'function' ? displayedSession() : null;
  const shots = (session && session.shots || []).filter(Boolean);
  const ids = new Set([...Studio.picks].map(String));
  const times = new Set([...Studio.arrows].map(Number));
  const groups = [];
  shots.forEach(s => {
    const id = String(s.set_id);
    if (!groups.length || groups[groups.length - 1].id !== id) groups.push({id, shots: []});
    groups[groups.length - 1].shots.push(s);
  });
  let ordinal = 0;
  const named = groups.map(g => {
    const calibration = g.shots.every(s => s.candidate);
    if (!calibration) ordinal++;
    return {id: g.id, name: calibration ? 'Calibración' : 'Set ' + ordinal};
  });
  const pickedSets = named.filter(g => ids.has(g.id));
  const chosen = shots.filter(s => ids.has(String(s.set_id)) || (Number.isFinite(Number(s.t_ms)) && times.has(Number(s.t_ms))));
  const n = chosen.length, ns = pickedSets.length;
  const flechas = k => k === 1 ? 'flecha' : 'flechas';
  let title = 'Selección';
  if (n) {
    if (Studio.dayIds.size) title = 'Día · ' + studioPickCount() + ' flechas';
    else if (ns === 1) title = pickedSets[0].name + ' · ' + n + ' ' + flechas(n);
    else if (ns > 1) title = ns + ' sets · ' + n + ' ' + flechas(n);
    else title = n + ' ' + flechas(n);
  }
  return {title, deleteLabel: ns > 1 ? 'Eliminar sets' : ns === 1 ? 'Eliminar set' : 'Eliminar flechas', n, sets: ns, setName: ns === 1 ? pickedSets[0].name : '', chosen};
}

async function studioDeletePick() {
  const info = studioPickInfo();
  if (!info.n || !info.chosen.length) return;
  const flechas = info.n === 1 ? 'flecha' : 'flechas';
  const msg = info.sets === 1 ? `¿Eliminar ${info.setName} (${info.n} ${flechas})?`
    : info.sets > 1 ? `¿Eliminar ${info.sets} sets (${info.n} ${flechas})?`
    : `¿Eliminar ${info.n} ${flechas}?`;
  if (typeof askConfirm === 'function' && !(await askConfirm(msg))) return;
  const session = typeof displayedSession === 'function' ? displayedSession() : null;
  if (!session) return;
  const removed = new Set(info.chosen.map(s => Number(s.t_ms)));
  session.shots = (session.shots || []).filter(s => s && !removed.has(Number(s.t_ms)));
  if (session.live || session.sensorId) session.removed = [...new Set([...(session.removed || []), ...removed])];
  if (typeof store !== 'undefined' && store.list && store.save) {
    store.save(store.list().map(s => s && s.id === session.id ? session : s).filter(s => s && ((s.shots || []).length || s.live || s.sensorId)));
  }
  if (typeof curSess !== 'undefined' && curSess && curSess.id === session.id) curSess = session;
  if (typeof data !== 'undefined') data = {shots: session.shots};
  if (typeof cur !== 'undefined') cur = Math.max(0, Math.min(cur, session.shots.length - 1));
  studioClearPick();
  if (!session.shots.length && typeof historyMode !== 'undefined' && historyMode) {
    if (typeof backToCurrent === 'function') backToCurrent();
    if (typeof show === 'function') show('History');
    return;
  }
  if (typeof render === 'function') render();
  if (typeof notice === 'function') notice(info.sets ? (info.sets > 1 ? 'Sets eliminados' : 'Set eliminado') : (info.n > 1 ? 'Flechas eliminadas' : 'Flecha eliminada'));
}

function studioModes() {
  const bar = document.getElementById('pickBar');
  if (!bar) return;
  const session = typeof displayedSession === 'function' ? displayedSession() : null;
  const hasShots = !!(session && session.shots && session.shots.length);
  const show = hasShots && Studio.picking && (typeof view === 'undefined' || view === 'Session');
  if (!show) { bar.classList.remove('on'); if (!hasShots) bar.hidden = true; return; }
  if (!bar.querySelector('.pickBarOn')) {
    bar.innerHTML = '<div class="pickBarOn"><div class="pickHead"><span class="pickTitle" id="pickCount"></span><button type="button" class="pickDone" data-bulk="done">Hecho</button></div>'+
      '<div class="pickGroup"><span class="pickLbl">Marcar como</span><div class="modeSeg"><button type="button" data-bulk="warm">Calentamiento</button><button type="button" data-bulk="score">Puntuable</button><button type="button" data-bulk="">Libre</button></div></div>'+
      '<div class="pickFoot"><div class="pickGroup"><span class="pickLbl">Seleccionar</span><div class="pickScope"><button type="button" data-scope="session">Sesión</button><button type="button" data-scope="day">Día</button></div></div><button type="button" class="pickDelete" data-bulk="delete">Eliminar set</button></div></div>';
  }
  const header = document.querySelector('header');
  if (header) bar.style.top = Math.round(header.getBoundingClientRect().bottom) + 'px';
  bar.hidden = false;
  if (!bar.classList.contains('on')) {
    void bar.offsetWidth;
    bar.classList.add('on');
  }
  const count = document.getElementById('pickCount');
  const info = studioPickInfo();
  if (count) count.textContent = info.title;
  const del = bar.querySelector('.pickDelete');
  if (del) { del.textContent = info.deleteLabel; del.hidden = !info.n || Studio.dayIds.size > 0; }
  const others = studioSameDay(session);
  const full = studioSessionFull(session);
  const dayOn = full && others.every(s => Studio.dayIds.has(s.id)) && Studio.dayIds.size === others.length;
  const sessionOn = full && Studio.dayIds.size === 0;
  bar.querySelectorAll('[data-scope]').forEach(b => {
    const on = b.dataset.scope === 'day' ? dayOn : sessionOn;
    b.classList.toggle('on', on);
    b.setAttribute('aria-pressed', on ? 'true' : 'false');
  });
}

function studioSyncShare() {
  const photos = document.getElementById('sharePhotos');
  if (photos) photos.hidden = Studio.card.layout === 'profile';
  const box = document.getElementById('shareThumbs');
  if (box) box.querySelectorAll('[data-layout]').forEach(b => {
    const on = b.dataset.layout === Studio.card.layout;
    b.classList.toggle('on', on);
    b.setAttribute('aria-selected', on ? 'true' : 'false');
  });
  const finish = Studio.card.finish || 'metal';
  document.querySelectorAll('#shareFinish [data-finish]').forEach(b => {
    const on = b.dataset.finish === finish;
    b.classList.toggle('sel', on);
    b.setAttribute('aria-pressed', on ? 'true' : 'false');
  });
  document.querySelectorAll('#sharePresets [data-preset]').forEach(b => {
    b.classList.toggle('on', !Studio.card.photo && b.dataset.preset === Studio.card.preset);
    const img = b.querySelector('img');
    const preset = Studio.PRESETS.find(p => p.id === b.dataset.preset);
    const url = preset ? studioPresetUrl(preset) : '';
    if (img && url && img.getAttribute('src') !== url) img.src = url;
  });
  const clear = document.getElementById('sharePhotoClear');
  if (clear) clear.hidden = !Studio.card.photo;
  const mine = document.getElementById('shareUserThumb');
  if (mine && Studio.card.photo && mine.getAttribute('src') !== Studio.card.photo) mine.src = Studio.card.photo;
  if (Studio.card.editing) studioWidgetBoxes();
}

const studioSvgMinus = '<svg viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M2.5 6h7"/></svg>';
const studioSvgPlus = '<svg viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><path d="M2.5 6h7M6 2.5v7"/></svg>';
const studioSvgGrip = '<svg viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" aria-hidden="true"><path d="M3.5 6h11M3.5 9h11M3.5 12h11"/></svg>';

function studioStyle() {
  return Studio.FINISHES.some(f => f.id === Studio.card.finish) ? Studio.card.finish : Studio.FINISHES[0].id;
}

function studioEditWidgets(on) {
  Studio.card.editing = !!on;
  Studio.card.sel = -1;
  const sheet = document.getElementById('shareSheet');
  if (sheet) sheet.classList.toggle('editing', !!on);
  if (!on) { const layer = document.getElementById('widgetLayer'); if (layer) layer.innerHTML = ''; }
  studioTilt(0, 0);
  studioWidgetList();
}

function studioMoveItem(list, from, to) {
  const [item] = list.splice(from, 1);
  list.splice(to, 0, item);
}

// Applies an edit to the current style's layout; a layout that no longer fits on the card is rejected as a whole.
function studioChangeCard(mutate, quiet) {
  const style = studioStyle();
  const cfg = JSON.parse(JSON.stringify(Studio.cardConfig(style)));
  if (mutate(cfg) === false) return false;
  if (!Studio.setCardConfig(style, cfg)) {
    if (!quiet && typeof notice === 'function') notice('No cabe en la tarjeta. Quita un widget o hazlo pequeño.');
    return false;
  }
  studioDrawShare(false);
  return true;
}

function studioAddWidget(id) {
  const def = Studio.WIDGETS.find(d => d.id === id);
  if (!def) return;
  const make = size => cfg => { cfg.widgets.push({id, size, variant: def.variants ? def.variants[0].id : undefined}); };
  if (studioChangeCard(make(def.size), true) || (def.size !== 'small' && studioChangeCard(make('small'), true))) {
    Studio.card.sel = Studio.cardConfig(studioStyle()).widgets.length - 1;
    studioWidgetList();
    studioWidgetBoxes();
    return;
  }
  if (typeof notice === 'function') notice('No cabe en la tarjeta. Quita un widget o hazlo pequeño.');
}

function studioRemoveWidget(index) {
  if (Studio.cardConfig(studioStyle()).widgets.length <= 1) {
    if (typeof notice === 'function') notice('Deja al menos un widget en la tarjeta.');
    return;
  }
  if (studioChangeCard(cfg => { cfg.widgets.splice(index, 1); })) {
    Studio.card.sel = -1;
    studioWidgetList();
  }
}

function studioWidgetBoxes() {
  const layer = document.getElementById('widgetLayer');
  if (!layer || !Studio.card.editing) return;
  const cfg = Studio.cardConfig(studioStyle());
  const pad = 4;
  const drag = Studio.card.drag && Studio.card.drag.moved ? Studio.card.drag.index : -1;
  layer.innerHTML = (Studio.card.rects || []).map(r => {
    const w = cfg.widgets[r.index];
    const def = w && Studio.WIDGETS.find(d => d.id === w.id);
    const cls = 'wBox' + (r.index === Studio.card.sel ? ' sel' : '') + (r.index === drag ? ' drag' : '');
    const pos = `left:${((r.x - pad) / 10.8).toFixed(2)}%;top:${((r.y - pad) / 13.5).toFixed(2)}%;width:${((r.w + pad * 2) / 10.8).toFixed(2)}%;height:${((r.h + pad * 2) / 13.5).toFixed(2)}%`;
    return `<div class="${cls}" data-index="${r.index}" style="${pos}" role="button" aria-label="${def ? def.name : ''}"><b data-del aria-label="Quitar">${studioSvgMinus}</b></div>`;
  }).join('');
}

function studioWidgetList() {
  const style = studioStyle();
  const cfg = Studio.cardConfig(style);
  const name = document.getElementById('widgetStyle');
  const finish = Studio.FINISHES.find(f => f.id === style);
  if (name) name.textContent = '· ' + (finish ? finish.name : '');
  document.querySelectorAll('#widgetPhoto [data-photo]').forEach(b => {
    const on = b.dataset.photo === cfg.photo;
    b.classList.toggle('sel', on);
    b.setAttribute('aria-pressed', on ? 'true' : 'false');
  });
  const list = document.getElementById('widgetList');
  if (list && !(Studio.card.listDrag)) {
    list.innerHTML = cfg.widgets.map((w, i) => {
      const def = Studio.WIDGETS.find(d => d.id === w.id);
      const variant = def.variants ? `<button type="button" class="wChip variant" data-variant aria-label="Gráfica">${(def.variants.find(v => v.id === w.variant) || def.variants[0]).name}</button>` : '';
      const size = (Studio.WIDGET_SIZES.find(s => s.id === w.size) || Studio.WIDGET_SIZES[0]).name;
      return `<li class="wRow${i === Studio.card.sel ? ' sel' : ''}" data-index="${i}"><button type="button" class="wDel" data-del aria-label="Quitar ${def.name}">${studioSvgMinus}</button><span class="wName">${def.name}</span>${variant}<button type="button" class="wChip" data-size aria-label="Tamaño">${size}</button><span class="wGrip" data-grip aria-label="Arrastrar para ordenar">${studioSvgGrip}</span></li>`;
    }).join('');
  }
  const fxRow = document.getElementById('widgetFx');
  if (fxRow) fxRow.innerHTML = Studio.FX.map(f => `<button type="button" data-fx="${f.id}" class="${cfg.fx && cfg.fx[f.id] ? 'on' : ''}" aria-pressed="${cfg.fx && cfg.fx[f.id] ? 'true' : 'false'}">${f.name}</button>`).join('');
  const add = document.getElementById('widgetAdd');
  if (add) {
    const missing = Studio.WIDGETS.filter(d => !cfg.widgets.some(w => w.id === d.id));
    add.innerHTML = missing.length ? missing.map(d => `<button type="button" data-add="${d.id}">${studioSvgPlus}${d.name}</button>`).join('') : '<small>Todos los widgets están en la tarjeta</small>';
  }
  studioWidgetBoxes();
}

function studioSelectWidget(index) {
  Studio.card.sel = index;
  document.querySelectorAll('#widgetList .wRow').forEach(li => li.classList.toggle('sel', Number(li.dataset.index) === index));
  const row = document.querySelector('#widgetList .wRow.sel');
  if (row && row.scrollIntoView) row.scrollIntoView({block: 'nearest'});
  studioWidgetBoxes();
}

function studioMountWidgets($) {
  const edit = $('shareEdit'), done = $('widgetDone'), reset = $('widgetReset');
  if (edit) edit.onclick = () => studioEditWidgets(true);
  if (done) done.onclick = () => studioEditWidgets(false);
  if (reset) reset.onclick = () => {
    Studio.resetCardConfig(studioStyle());
    Studio.card.sel = -1;
    studioDrawShare(false);
    studioWidgetList();
  };
  const photo = $('widgetPhoto');
  if (photo) photo.onclick = e => {
    const b = e.target.closest('[data-photo]');
    if (b && studioChangeCard(cfg => { cfg.photo = b.dataset.photo; })) studioWidgetList();
  };
  const fxRow = $('widgetFx');
  if (fxRow) fxRow.onclick = e => {
    const b = e.target.closest('[data-fx]');
    if (b && studioChangeCard(cfg => { cfg.fx[b.dataset.fx] = !cfg.fx[b.dataset.fx]; })) studioWidgetList();
  };
  const add = $('widgetAdd');
  if (add) add.onclick = e => {
    const b = e.target.closest('[data-add]');
    if (b) studioAddWidget(b.dataset.add);
  };
  const list = $('widgetList');
  if (list) {
    list.onclick = e => {
      const li = e.target.closest('.wRow');
      if (!li) return;
      const i = Number(li.dataset.index);
      if (e.target.closest('[data-del]')) { studioRemoveWidget(i); return; }
      if (e.target.closest('[data-size]')) {
        if (studioChangeCard(cfg => { cfg.widgets[i].size = cfg.widgets[i].size === 'small' ? 'wide' : 'small'; })) { Studio.card.sel = i; studioWidgetList(); }
        return;
      }
      if (e.target.closest('[data-variant]')) {
        const def = Studio.WIDGETS.find(d => d.id === Studio.cardConfig(studioStyle()).widgets[i].id);
        const ids = def.variants.map(v => v.id);
        if (studioChangeCard(cfg => { cfg.widgets[i].variant = ids[(ids.indexOf(cfg.widgets[i].variant) + 1) % ids.length]; })) { Studio.card.sel = i; studioWidgetList(); }
        return;
      }
      studioSelectWidget(i);
    };
    list.addEventListener('pointerdown', e => {
      const grip = e.target.closest('[data-grip]');
      if (!grip) return;
      e.preventDefault();
      const li = grip.closest('.wRow');
      Studio.card.listDrag = {index: Number(li.dataset.index), li};
      Studio.card.sel = Studio.card.listDrag.index;
      li.classList.add('drag');
      list.setPointerCapture?.(e.pointerId);
    });
    list.addEventListener('pointermove', e => {
      const d = Studio.card.listDrag;
      if (!d) return;
      const others = [...list.querySelectorAll('.wRow')].filter(li => li !== d.li);
      let to = others.findIndex(li => { const r = li.getBoundingClientRect(); return e.clientY < r.top + r.height / 2; });
      if (to < 0) to = others.length;
      if (to === d.index) return;
      if (!studioChangeCard(cfg => studioMoveItem(cfg.widgets, d.index, to), true)) return;
      list.insertBefore(d.li, others[to] || null);
      d.index = to;
      Studio.card.sel = to;
      studioWidgetBoxes();
    });
    const drop = () => {
      if (!Studio.card.listDrag) return;
      Studio.card.listDrag = null;
      studioWidgetList();
    };
    list.addEventListener('pointerup', drop);
    list.addEventListener('pointercancel', drop);
  }
  const layer = $('widgetLayer');
  if (layer) {
    const cardPoint = e => {
      const r = layer.getBoundingClientRect();
      return {x: (e.clientX - r.left) / Math.max(1, r.width) * 1080, y: (e.clientY - r.top) / Math.max(1, r.height) * 1350};
    };
    layer.addEventListener('pointerdown', e => {
      if (!Studio.card.editing) return;
      const box = e.target.closest('.wBox');
      if (!box) return;
      e.preventDefault();
      Studio.card.drag = {index: Number(box.dataset.index), x: e.clientX, y: e.clientY, moved: false, del: !!e.target.closest('[data-del]')};
      layer.setPointerCapture?.(e.pointerId);
    });
    layer.addEventListener('pointermove', e => {
      const d = Studio.card.drag;
      if (!d) return;
      if (!d.moved && Math.hypot(e.clientX - d.x, e.clientY - d.y) < 8) return;
      d.moved = true;
      Studio.card.sel = d.index;
      const p = cardPoint(e);
      const hit = (Studio.card.rects || []).find(r => p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h);
      if (hit && hit.index !== d.index && studioChangeCard(cfg => studioMoveItem(cfg.widgets, d.index, hit.index), true)) d.index = hit.index;
      studioWidgetBoxes();
    });
    const up = () => {
      const d = Studio.card.drag;
      if (!d) return;
      Studio.card.drag = null;
      if (!d.moved && d.del) { studioRemoveWidget(d.index); return; }
      if (!d.moved) { studioSelectWidget(d.index); studioWidgetList(); return; }
      studioWidgetList();
    };
    layer.addEventListener('pointerup', up);
    layer.addEventListener('pointercancel', up);
  }
}

function studioTilt(rx, ry) {
  Studio.card.tilt = {x: rx, y: ry};
  const tilt = document.getElementById('holoTilt');
  const sheen = document.getElementById('holoSheen');
  if (tilt) {
    tilt.style.transform = 'rotateX(' + rx.toFixed(2) + 'deg) rotateY(' + ry.toFixed(2) + 'deg)';
    tilt.style.boxShadow = (-ry * 1.8).toFixed(1) + 'px ' + (26 - rx).toFixed(1) + 'px 42px rgba(0,0,0,.55)';
  }
  if (sheen) sheen.style.backgroundPosition = (50 + ry * 3.2).toFixed(1) + '% ' + (42 - rx * 3.2).toFixed(1) + '%';
  if (Studio.shareOpen) studioDrawShare(false);
}

function studioTiltFrom(stage, e) {
  const r = stage.getBoundingClientRect();
  const px = (e.clientX - r.left) / r.width - 0.5;
  const py = (e.clientY - r.top) / r.height - 0.5;
  studioTilt(Math.max(-14, Math.min(14, -py * 26)), Math.max(-16, Math.min(16, px * 30)));
}

function studioGyro(e) {
  if (!Studio.shareOpen || Studio.card.editing || e.gamma == null) return;
  const rx = Math.max(-12, Math.min(12, (e.beta || 0) * 0.16));
  const ry = Math.max(-14, Math.min(14, e.gamma * 0.22));
  studioTilt(rx, ry);
}

function studioListenGyro(ask) {
  const D = window.DeviceOrientationEvent;
  if (!D) return;
  const start = () => window.addEventListener('deviceorientation', studioGyro);
  if (ask && typeof D.requestPermission === 'function') {
    D.requestPermission().then(state => { if (state === 'granted') start(); }).catch(() => {});
    return;
  }
  start();
}

function studioSessions() {
  return typeof store === 'undefined' ? [] : store.list().filter(s => s && s.shots && s.shots.length).sort((a, b) => a.id - b.id);
}

function studioPaintProfile() {
  const p = Studio.profile();
  const name = document.getElementById('profileName');
  const club = document.getElementById('profileClub');
  if (name && document.activeElement !== name) name.value = p.name;
  if (club && document.activeElement !== club) club.value = p.club;
  const img = document.getElementById('profilePhoto');
  const ph = document.getElementById('profilePhotoPh');
  if (img) { img.hidden = !p.photo; if (p.photo) img.src = p.photo; }
  if (ph) ph.hidden = !!p.photo;
  studioPaintBanner();
  let bows = [], arrows = [];
  try {
    const g = JSON.parse(localStorage.getItem('atGear') || 'null') || {};
    bows = Array.isArray(g.bows) ? g.bows : [];
    arrows = Array.isArray(g.arrows) ? g.arrows : [];
  } catch (e) {}
  const s = typeof displayedSession === 'function' ? displayedSession() : null;
  const sessions = studioSessions();
  const first = sessions[0];
  const gear = document.getElementById('profileGear');
  const bow = [...new Set([s && (s.bow || s.profile), ...bows].filter(Boolean))].slice(0, 3).join(' · ') || 'Sin arco';
  const arrow = [...new Set([s && s.arrows, ...arrows].filter(Boolean))].slice(0, 3).join(' · ') || 'Sin flechas';
  if (gear) gear.innerHTML = `<span>${escapeText(bow)}</span><span>${escapeText(arrow)}</span>`;
  const shots = Studio.historyShots();
  const totals = StudioScore.totals(Studio.scorePool(shots));
  const aims = shots.map(a => a.aim_score).filter(Number.isFinite);
  const aim = aims.length ? Math.round(aims.reduce((x, y) => x + y, 0) / aims.length) : null;
  const markFormat = Studio.sharedFormat(sessions);
  const markLabel = markFormat === 'lancaster' ? '11' : markFormat === 'wa' ? '9' : 'X';
  const markN = markFormat === 'lancaster' ? totals.eleven : markFormat === 'wa' ? totals.nine : totals.x;
  const nums = document.getElementById('profileNums');
  if (nums) nums.innerHTML =
    `<div><span class="lbl">Flechas</span><b class="num">${shots.length || '–'}</b></div>` +
    `<div><span class="lbl">Sesiones</span><b class="num">${sessions.filter(x => statShots(x.shots || []).length).length || '–'}</b></div>` +
    `<div><span class="lbl">Media</span><b class="num">${totals.avg == null ? '–' : esNum(totals.avg, 1)}</b></div>` +
    `<div><span class="lbl">${markLabel}</span><b class="num">${totals.scored ? markN : '–'}</b></div>`;
  const span = document.getElementById('profileSpan');
  if (span) span.textContent = aim == null ? '' : 'estabilidad ' + aim;
  const box = document.getElementById('streakBox');
  if (box && typeof store !== 'undefined') {
    const t = Studio.trainingStreak(sessions, new Date());
    const pill = c => `<i class="${[c.run ? 'run' : c.on ? 'on' : '', c.today ? 'today' : ''].join(' ').trim()}">${STUDIO_DAYS[c.dow]}</i>`;
    box.innerHTML = `<div><b>${t.current}</b><span>${t.current === 1 ? 'día seguido' : 'días seguidos'}</span></div>` +
      `<div class="weekPills" aria-label="Esta semana">${t.week.map(pill).join('')}</div>`;
    box.hidden = false;
    const line = document.getElementById('goalStreak');
    if (line) line.hidden = true;
  }
}

function studioBannerSrc(id) {
  if (!id || id === 'none') return '';
  if (id.startsWith('data:image/')) return id;
  const preset = Studio.PRESETS.find(p => p.id === id);
  return preset ? studioPresetUrl(preset) : '';
}

function studioPaintBanner() {
  const box = document.getElementById('profileBanner');
  const img = document.getElementById('profileBannerImg');
  if (!box || !img) return;
  const banner = Studio.profile().banner;
  const src = studioBannerSrc(banner);
  box.classList.toggle('none', banner === 'none');
  if (Studio.bannerShown === src) return;
  Studio.bannerShown = src;
  img.style.backgroundImage = src ? 'url("' + src + '")' : '';
  img.style.backgroundPositionY = Math.round(Studio.profileArt().focus * 100) + '%';
}

const STUDIO_ICON_CAMERA = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round" aria-hidden="true"><path d="M4 8.5h3l1.6-2.5h6.8L17 8.5h3v10H4z"/><circle cx="12" cy="13.2" r="3.4"/></svg>';
const STUDIO_ICON_GALLERY = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round" aria-hidden="true"><rect x="4" y="5" width="16" height="14" rx="2.5"/><path d="M4.5 16.5l4.5-4.5 3.5 3.5 2.5-2.5 4.5 4.5"/><circle cx="15.5" cy="9.5" r="1.4"/></svg>';
function studioBannerPick() {
  const pick = document.getElementById('bannerPick');
  if (!pick || pick.hidden) return;
  const banner = Studio.profile().banner;
  const custom = banner.startsWith('data:image/') ? banner : '';
  const tile = (id, name, inner, on) => `<button type="button" data-banner="${id}" class="${on ? 'on' : ''}" aria-pressed="${on ? 'true' : 'false'}"><i>${inner}</i><span>${name}</span></button>`;
  const photo = src => src ? `<b style="background-image:url('${src}')"></b>` : '';
  pick.innerHTML = tile('camera', 'Cámara', STUDIO_ICON_CAMERA, false) + tile('file', 'Galería', STUDIO_ICON_GALLERY, false) +
    (custom ? tile('custom', 'Tu foto', photo(custom), true) : '') +
    Studio.BANNERS.filter(b => b.id !== 'none').map(b => tile(b.id, b.name, photo(studioBannerSrc(b.id)), banner === b.id)).join('') +
    tile('none', 'Sin banner', '–', banner === 'none');
}

function studioProgressSessions() {
  const select = document.getElementById('progressProfile');
  const key = select && select.value;
  return studioSessions().map(s => ({id: s.id, shots: (s.shots || []).filter(a => a && !a.candidate &&
    !(key && typeof Training !== 'undefined' && Training.key && Training.key({bow: a.bow || s.bow, profile: a.profile || s.profile, metric: a.metric || s.metric}) !== key))}))
    .filter(s => s.shots.length);
}

function studioPaintProgress() {
  const radar = studioFit(document.getElementById('progressRadar'), 280);
  if (!radar) return;
  const sessions = studioProgressSessions();
  const last = sessions.length ? sessions[sessions.length - 1].id : 0;
  const cut = last - 7 * 86400000;
  const now = Studio.performance(sessions.filter(s => s.id > cut));
  const before = Studio.performance(sessions.filter(s => s.id <= cut));
  studioRadarDraw(radar.x, radar.w / 2, radar.h / 2 + 2, Math.min(radar.w, radar.h) * 0.32, now, before, Studio.theme());
}

function studioPaintHeat() {
  const host = document.getElementById('heatmap');
  if (!host) return;
  const wrap = host.parentElement;
  const weeks = Math.max(12, Math.floor((((wrap && wrap.clientWidth) || 270) - 18) / 14));
  const model = Studio.heatmap(typeof store === 'undefined' ? [] : store.list(), new Date(), weeks);
  const label = document.getElementById('heatLabel');
  if (label) label.textContent = model.weeks + ' semanas';
  let html = '';
  for (let w = 0; w < model.weeks; w++) {
    html += '<span class="heatCol">';
    model.cells.filter(c => c.w === w).forEach(c => {
      html += `<i class="${c.future ? 'future' : 'l' + c.level}" title="${c.n}"></i>`;
    });
    html += '</span>';
  }
  host.innerHTML = html;
}

function studioShotSource() {
  if (Studio.shareKind === 'profile') return Studio.historyShots();
  return (typeof data !== 'undefined' && data && data.shots) || [];
}

function studioOpenShare(kind) {
  Studio.shareKind = kind || 'session';
  Studio.shareOpen = true;
  Studio.card.editing = false;
  const sheet = document.getElementById('shareSheet');
  if (sheet) { sheet.hidden = false; sheet.classList.remove('editing'); }
  studioDrawShare();
  studioSyncShare();
}

function studioRound(ctx, x, y, w, h, r) {
  const rad = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rad, y);
  ctx.arcTo(x + w, y, x + w, y + h, rad);
  ctx.arcTo(x + w, y + h, x, y + h, rad);
  ctx.arcTo(x, y + h, x, y, rad);
  ctx.arcTo(x, y, x + w, y, rad);
  ctx.closePath();
}

function studioRgb(hex) {
  const rgb = String(hex || '').match(/^rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (rgb) return [Number(rgb[1]), Number(rgb[2]), Number(rgb[3])];
  const h = String(hex || '#FF8A1F').replace('#', '');
  const full = h.length === 3 ? h.split('').map(c => c + c).join('') : h;
  const n = parseInt(full, 16);
  if (!Number.isFinite(n)) return [255, 138, 31];
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function studioRgba(hex, a) {
  const [r, g, b] = studioRgb(hex);
  return 'rgba(' + r + ',' + g + ',' + b + ',' + a + ')';
}

function studioMix(a, b, t) {
  const A = studioRgb(a), B = studioRgb(b);
  const c = A.map((v, i) => Math.round(v + (B[i] - v) * t));
  return 'rgb(' + c.join(',') + ')';
}

function studioTrack(ctx, text, x, y, tracking) {
  let cx = x;
  for (const ch of text) {
    ctx.fillText(ch, cx, y);
    cx += ctx.measureText(ch).width + tracking;
  }
}

function studioAvgText(n) {
  if (n == null || !Number.isFinite(n)) return '–';
  const q = Math.round(n * 10) / 10;
  return Number.isInteger(q) ? String(q) : q.toFixed(1).replace('.', ',');
}
function studioSetsOf(shots) {
  const order = [];
  const map = new Map();
  (shots || []).forEach(s => {
    if (!s || s.candidate) return;
    const id = String(s.set_id ?? '');
    if (!map.has(id)) { map.set(id, []); order.push(id); }
    map.get(id).push(s);
  });
  return order.map((id, i) => ({id, n: i + 1, rows: map.get(id)}));
}
function studioSpread(rows) {
  const pts = StudioScore.impacts(rows);
  if (pts.length >= 2) {
    const c = StudioScore.groupCenter(pts);
    return pts.reduce((n, p) => n + Math.hypot(p.x - c.x, p.y - c.y), 0) / pts.length;
  }
  if (pts.length === 1) return Math.hypot(pts[0].x, pts[0].y);
  return null;
}
function studioDurationMs(session) {
  if (!session) return null;
  if (Number.isFinite(session.lastWt) && Number.isFinite(session.id) && session.lastWt > session.id) {
    const d = session.lastWt - session.id;
    if (d >= 60000 && d <= 8 * 3600000) return d;
  }
  const times = (session.shots || []).map(s => s && s.t_ms).filter(Number.isFinite);
  if (times.length >= 2) {
    const d = Math.max.apply(null, times) - Math.min.apply(null, times);
    if (d >= 60000 && d <= 8 * 3600000) return d;
  }
  return null;
}
function studioDurationText(ms) {
  if (!Number.isFinite(ms) || ms < 60000) return '–';
  const min = Math.round(ms / 60000);
  if (min < 60) return min + ' min';
  const h = Math.floor(min / 60), m = min % 60;
  return m ? h + ' h ' + m + ' min' : h + ' h';
}
function studioCornerDate(ms) {
  const d = new Date(ms);
  if (!Number.isFinite(d.getTime())) return '';
  const months = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC'];
  return d.getDate() + ' ' + months[d.getMonth()] + ' ' + d.getFullYear();
}
function studioSubtitle(session) {
  const bow = (session && (session.bow || session.profile)) || 'Compuesto';
  return session && session.mode === 'Indoor' ? bow + ' · 18 M' : String(bow);
}
function studioCardView(layout) {
  const session = typeof displayedSession === 'function' ? displayedSession() : null;
  const profile = Studio.profile();
  const sessionShots = typeof studioShotSource === 'function' ? studioShotSource() : [];
  const history = Studio.historyShots();
  const when = session && session.id ? session.id : Date.now();
  const format = session ? StudioScore.formatOf(session) : null;
  let shots = Studio.scorePool(sessionShots);
  let headline = 'Entrenamiento completado';
  let subtitle = studioSubtitle(session);
  let bars = [];
  let duration = studioDurationMs(session);
  if (layout === 'profile') {
    const sessions = typeof studioSessions === 'function' ? studioSessions() : [];
    shots = history;
    headline = profile.name || 'Perfil';
    subtitle = profile.club || 'Historial';
    const grouped = Studio.sharedFormat(sessions);
    const sets = [];
    let span = 0, anySpan = false;
    sessions.forEach(s => {
      studioSetsOf(s.shots).forEach(g => sets.push(g));
      const d = studioDurationMs(s);
      if (d != null) { span += d; anySpan = true; }
    });
    duration = anySpan ? span : null;
    bars = sessions.slice(-12).map((s, i) => ({n: i + 1, rows: Studio.scorePool(s.shots)}));
    const view = studioCardPack(headline, subtitle, when, shots, sets.length, duration, bars, grouped, Studio.profileArt().photo, {
      title: profile.club || 'Historial completo',
      modeLine: profile.club || 'Historial completo',
      serial: '',
      per: 'session'
    });
    return studioProfileView(view, sessions, grouped);
  }
  const meta = {
    kicker: studioKicker(session),
    title: studioSubtitle(session).replace(/ M$/, ' m'),
    modeLine: studioModeLine(session),
    serial: studioSerial(session)
  };
  if (layout === 'best') {
    const best = Studio.bestSet(sessionShots.length ? sessionShots : history);
    shots = best ? best.rows : [];
    headline = 'Mejor tanda';
    subtitle = best ? 'Tanda ' + best.index + (session && session.mode === 'Indoor' ? ' · 18 M' : '') : studioSubtitle(session);
    bars = best ? [{n: best.index, rows: best.rows}] : [];
    meta.kicker = 'MEJOR TANDA' + (best ? ' · SERIE ' + best.index : '');
  } else {
    bars = studioSetsOf(shots);
  }
  const sets = studioSetsOf(shots);
  return studioCardPack(headline, subtitle, when, shots, sets.length, duration, bars, format, studioPhotoSrc(), meta);
}
function studioProfileView(view, sessions, format) {
  const art = Studio.profileArt();
  view.focus = art.focus;
  view.avatar = art.avatar;
  view.initials = art.initials;
  const top = StudioScore.arrowMax(format);
  const totals = StudioScore.totals(Studio.historyShots());
  const avg1 = n => (Math.round(n * 10) / 10).toFixed(1).replace('.', ',');
  const scored = sessions.map(s => ({s, t: StudioScore.totals((s.shots || []).filter(x => x && !x.candidate))})).filter(r => r.t.score != null);
  const best = scored.reduce((b, r) => !b || r.t.score > b.t.score ? r : b, null);
  view.isProfile = true;
  view.scoreLabel = 'MEDIA';
  view.scoreMain = totals.avg == null ? '–' : avg1(totals.avg);
  view.scoreMax = totals.avg == null ? '' : String(top);
  view.scoreNote = totals.avg == null ? 'sin puntuación' : '';
  view.pct = totals.avg == null ? null : totals.avg / top;
  view.best = best ? {label: 'MEJOR SESIÓN', sum: best.t.score, tag: studioCornerDate(best.s.id).split(' ').slice(0, 2).join(' '), values: []} : null;
  view.series = {title: 'MEDIA POR SESIÓN', avg: true, items: scored.slice(-12).map(r => {
    const d = new Date(r.s.id);
    return {label: d.getDate() + '/' + (d.getMonth() + 1), sum: Math.round(r.t.avg * 10) / 10, max: top};
  })};
  view.stats = view.stats.map(c => c.id === 'avg' ? {id: 'sessions', label: 'Sesiones', value: String(sessions.length)} : c);
  return view;
}
function studioKicker(session) {
  if (!session) return 'ENTRENAMIENTO';
  if (session.mode === 'Indoor') return 'SESIÓN INDOOR';
  if (session.mode === 'Outdoor') return 'SESIÓN OUTDOOR';
  return 'ENTRENAMIENTO';
}
function studioModeLine(session) {
  const bow = (session && (session.bow || session.profile)) || 'Compuesto';
  if (session && session.mode === 'Indoor') return 'Indoor · ' + bow;
  if (session && session.mode === 'Outdoor') return 'Outdoor · ' + bow;
  return String(bow);
}
function studioSerial(session) {
  if (!session || typeof studioSessions !== 'function') return '';
  const i = studioSessions().findIndex(s => s.id === session.id);
  return i < 0 ? '' : 'Nº ' + String(i + 1).padStart(3, '0');
}
function studioSeriesItems(bars, format, per) {
  const top = StudioScore.arrowMax(format);
  const sumOf = rows => {
    const scored = (rows || []).filter(s => s && !s.candidate && StudioScore.points(s.result && s.result.value) != null);
    return scored.length ? {sum: scored.reduce((n, s) => n + StudioScore.points(s.result.value), 0), max: scored.length * top} : null;
  };
  const list = (bars || []).map(b => {
    const hit = sumOf(b.rows);
    return hit ? {label: (per === 'session' ? '' : 'S') + b.n, sum: hit.sum, max: hit.max} : null;
  }).filter(Boolean).slice(-12);
  if (list.length > 1 || !bars || !bars.length) return {title: per === 'session' ? 'POR SESIÓN' : 'POR SERIE', items: list};
  const arrows = (bars[0].rows || []).filter(s => s && !s.candidate && StudioScore.points(s.result && s.result.value) != null).slice(0, 12);
  return {title: 'POR FLECHA', items: arrows.map((s, i) => ({label: String(i + 1), sum: StudioScore.points(s.result.value), max: top, value: s.result.value}))};
}
function studioDistribution(shots) {
  const order = [['X', ['X']], ['11', ['11']], ['10', ['10']], ['9', ['9']], ['8', ['8']], ['≤7', ['7', '6', 'M']]];
  const counts = new Map();
  (shots || []).forEach(s => {
    if (!s || s.candidate) return;
    const v = s.result && s.result.value;
    if (v == null || v === '' || (StudioScore.points(v) == null && v !== 'M')) return;
    counts.set(String(v), (counts.get(String(v)) || 0) + 1);
  });
  return order.map(o => ({v: o[0], n: o[1].reduce((n, k) => n + (counts.get(k) || 0), 0)})).filter(d => d.n > 0);
}
function studioCardPack(headline, subtitle, when, shots, series, duration, bars, format, photo, meta) {
  const totals = StudioScore.totals(shots);
  const info = meta || {};
  const max = totals.score != null ? (format ? StudioScore.roundMax(shots, format) : (totals.arrows || 0) * 10) : 0;
  const best = Studio.bestSet(shots);
  const spread = studioSpread(shots);
  const d = new Date(when);
  const months = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC'];
  const arrows = totals.arrows || 0;
  return {
    brand: 'ARCHERY TRACE',
    headline, subtitle,
    kicker: info.kicker || 'ENTRENAMIENTO',
    title: info.title || subtitle || '',
    modeLine: info.modeLine || subtitle || '',
    serial: info.serial || '',
    date: studioCornerDate(when),
    day: Number.isFinite(d.getTime()) ? String(d.getDate()) : '',
    monthYear: Number.isFinite(d.getTime()) ? months[d.getMonth()] + ' ' + d.getFullYear() : '',
    scoreMain: totals.score != null ? String(totals.score) : String(arrows),
    scoreMax: totals.score != null && max ? String(max) : '',
    scoreNote: totals.score != null ? '' : 'flechas registradas',
    pct: totals.score != null && max ? totals.score / max : null,
    best: best ? {index: best.index, sum: best.sum, values: best.rows.filter(s => StudioScore.points(s.result && s.result.value) != null).map(s => String(s.result.value)).slice(0, 12)} : null,
    series: studioSeriesItems(bars, format, info.per),
    spreads: (bars || []).map(b => ({label: (info.per === 'session' ? '' : 'S') + b.n, cm: studioSpread(Studio.scorePool(b.rows))})).filter(s => s.cm != null).map(s => ({label: s.label, cm: s.cm * 10})).slice(-12),
    groupN: StudioScore.impacts(shots).length,
    dist: studioDistribution(shots),
    spreadText: spread != null ? studioAvgText(spread * 10) + ' cm' : '–',
    stats: [
      {id: 'arrows', label: 'Flechas', value: String(arrows)},
      {id: 'series', label: 'Series', value: String(series || 0)},
      {id: 'avg', label: 'Media', value: totals.avg == null ? '–' : (Math.round(totals.avg * 10) / 10).toFixed(1).replace('.', ',')},
      {id: 'time', label: 'Duración', value: studioDurationText(duration)}
    ],
    photo: photo || '',
    focus: Studio.card.photo ? 0.5 : ((studioPreset() || {}).focus ?? 0.5),
    streak: Studio.arrowStreak(shots),
    train: Studio.trainingStreak(typeof studioSessions === 'function' ? studioSessions() : [], when),
    heatSessions: typeof studioSessions === 'function' ? studioSessions() : [],
    when
  };
}

function studioHeaderImage(src) {
  if (!src || typeof Image === 'undefined') return null;
  if (Studio.card.photoSrc === src && Studio.card.photoImg && Studio.card.photoImg.complete && Studio.card.photoImg.naturalWidth) return Studio.card.photoImg;
  if (Studio.card.photoSrc !== src) {
    Studio.card.photoSrc = src;
    const img = new Image();
    img.onload = () => { if (Studio.shareOpen) studioDrawShare(false); };
    img.src = src;
    Studio.card.photoImg = img;
  }
  return Studio.card.photoImg && Studio.card.photoImg.complete && Studio.card.photoImg.naturalWidth ? Studio.card.photoImg : null;
}
function studioSetCardPhoto(url) {
  Studio.card.photo = url || '';
  Studio.card.photoSrc = '';
  Studio.card.photoImg = null;
  if (Studio.card.photoCache) Studio.card.photoCache.clear();
  if (Studio.shareOpen) studioDrawShare();
  if (typeof studioSyncShare === 'function') studioSyncShare();
}
const studioCrop = {img: null, url: '', zoom: 1, x: 0, y: 0, drag: null, ready: false, target: 'card'};
function studioCropBox() {
  const canvas = document.getElementById('cropCanvas');
  return {canvas, w: canvas ? canvas.width : 900, h: canvas ? canvas.height : 620};
}
function studioCropScale() {
  const img = studioCrop.img;
  const {w, h} = studioCropBox();
  if (!img) return 1;
  return Math.max(w / img.naturalWidth, h / img.naturalHeight) * studioCrop.zoom;
}
function studioDrawCrop() {
  const {canvas, w, h} = studioCropBox();
  const img = studioCrop.img;
  if (!canvas || !img) return;
  const s = studioCropScale();
  const dw = img.naturalWidth * s, dh = img.naturalHeight * s;
  if (studioCrop.x > 0) studioCrop.x = 0;
  if (studioCrop.y > 0) studioCrop.y = 0;
  if (studioCrop.x + dw < w) studioCrop.x = w - dw;
  if (studioCrop.y + dh < h) studioCrop.y = h - dh;
  const x = canvas.getContext('2d');
  x.clearRect(0, 0, w, h);
  x.drawImage(img, studioCrop.x, studioCrop.y, dw, dh);
}
function studioCropZoom(z) {
  const img = studioCrop.img;
  if (!img) return;
  const {w, h} = studioCropBox();
  const prev = studioCropScale();
  const cx = w / 2, cy = h / 2;
  const ix = (cx - studioCrop.x) / prev;
  const iy = (cy - studioCrop.y) / prev;
  studioCrop.zoom = Math.max(1, Math.min(3, z || 1));
  const next = studioCropScale();
  studioCrop.x = cx - ix * next;
  studioCrop.y = cy - iy * next;
  studioDrawCrop();
}
function studioOpenCrop(file, target) {
  const img = new Image();
  const url = URL.createObjectURL(file);
  img.onload = () => {
    studioCrop.target = target === 'banner' ? 'banner' : 'card';
    const banner = studioCrop.target === 'banner';
    const canvas = document.getElementById('cropCanvas');
    if (canvas) canvas.height = banner ? 480 : 634;
    const title = document.getElementById('cropTitle');
    if (title) title.textContent = banner ? 'Encuadra el banner' : 'Encuadra la foto';
    studioCrop.img = img;
    studioCrop.url = url;
    studioCrop.zoom = 1;
    studioCrop.ready = false;
    const {w, h} = studioCropBox();
    const s = Math.max(w / img.naturalWidth, h / img.naturalHeight);
    studioCrop.x = (w - img.naturalWidth * s) / 2;
    studioCrop.y = (h - img.naturalHeight * s) / 2;
    const sheet = document.getElementById('cropSheet');
    const zoom = document.getElementById('cropZoom');
    if (zoom) zoom.value = '1';
    if (sheet) sheet.hidden = false;
    studioDrawCrop();
  };
  img.onerror = () => URL.revokeObjectURL(url);
  img.src = url;
}
function studioCloseCrop() {
  const sheet = document.getElementById('cropSheet');
  if (sheet) sheet.hidden = true;
  if (studioCrop.url) URL.revokeObjectURL(studioCrop.url);
  studioCrop.img = null;
  studioCrop.url = '';
  studioCrop.drag = null;
}
function studioCommitCrop() {
  const img = studioCrop.img;
  if (!img) return;
  const {w, h} = studioCropBox();
  const banner = studioCrop.target === 'banner';
  const outW = banner ? 1200 : 1080, outH = Math.round(outW * h / w);
  const k = outW / w;
  const c = document.createElement('canvas');
  c.width = outW;
  c.height = outH;
  const s = studioCropScale() * k;
  c.getContext('2d').drawImage(img, studioCrop.x * k, studioCrop.y * k, img.naturalWidth * s, img.naturalHeight * s);
  let q = 0.84, url = c.toDataURL('image/jpeg', q);
  while (url.length > (banner ? 420000 : 480000) && q > 0.5) { q -= 0.08; url = c.toDataURL('image/jpeg', q); }
  studioCloseCrop();
  if (!banner) { studioSetCardPhoto(url); return; }
  Studio.saveProfile({banner: url});
  if (Studio.profile().banner !== url && typeof notice === 'function') notice('No se pudo guardar el banner');
  studioPaintBanner();
  studioBannerPick();
}
function studioPhotoSrc() {
  if (Studio.card.photo) return Studio.card.photo;
  const hit = studioPreset();
  return hit ? studioPresetUrl(hit) : '';
}
// Android loads the app from file://, where a canvas that drew a file:// image can no longer be exported.
// Presets ship as data URLs inside scripts so the card always stays exportable.
function studioPresetUrl(preset) {
  if (typeof window === 'undefined') return '';
  const bank = window.ATPhotos || (window.ATPhotos = {});
  if (bank[preset.id]) return bank[preset.id];
  const asked = Studio.card.presetLoads || (Studio.card.presetLoads = {});
  if (!asked[preset.id] && typeof document !== 'undefined') {
    const script = document.createElement('script');
    script.src = preset.src;
    script.onload = () => {
      if (typeof view !== 'undefined' && view === 'Profile') { studioPaintBanner(); studioBannerPick(); }
      if (!Studio.shareOpen) return;
      studioDrawShare();
    };
    script.onerror = () => { delete asked[preset.id]; };
    asked[preset.id] = script;
    document.head.appendChild(script);
  }
  return '';
}
function studioPhotoReady() {
  const profile = Studio.card.layout === 'profile';
  const src = profile ? Studio.profileArt().photo : studioPhotoSrc();
  const pending = [];
  if (src && !studioHeaderImage(src) && Studio.card.photoImg) pending.push(Studio.card.photoImg);
  const avatar = profile ? Studio.profile().photo : '';
  if (avatar && !studioAvatarImage(avatar) && Studio.card.avatarImg) pending.push(Studio.card.avatarImg);
  return Promise.all(pending.map(img => new Promise(resolve => {
    img.addEventListener('load', resolve, {once: true});
    img.addEventListener('error', resolve, {once: true});
    setTimeout(resolve, 3000);
  })));
}
function studioAvatarImage(src) {
  if (!src || typeof Image === 'undefined') return null;
  const c = Studio.card;
  if (c.avatarSrc === src && c.avatarImg && c.avatarImg.complete && c.avatarImg.naturalWidth) return c.avatarImg;
  if (c.avatarSrc !== src) {
    c.avatarSrc = src;
    const img = new Image();
    img.onload = () => { if (Studio.shareOpen) studioDrawShare(false); };
    img.src = src;
    c.avatarImg = img;
  }
  return null;
}
function studioAvatarBox(ctx, x, y, size, view, ring, lw, bg, ink) {
  if (!view.avatar && !view.initials) return;
  const img = studioAvatarImage(view.avatar);
  const rad = size * 0.24;
  ctx.save();
  studioRound(ctx, x, y, size, size, rad);
  ctx.fillStyle = bg;
  ctx.fill();
  if (img) {
    ctx.save();
    ctx.clip();
    const k = Math.max(size / img.naturalWidth, size / img.naturalHeight);
    ctx.drawImage(img, x + (size - img.naturalWidth * k) / 2, y + (size - img.naturalHeight * k) / 2, img.naturalWidth * k, img.naturalHeight * k);
    ctx.restore();
  } else studioText(ctx, view.initials, x + size / 2, y + size * 0.64, studioF(500, Math.round(size * 0.38)), ink, 0, 'center');
  if (ring && lw) {
    studioRound(ctx, x - lw / 2, y - lw / 2, size + lw, size + lw, rad + lw / 2);
    ctx.lineWidth = lw;
    ctx.strokeStyle = ring;
    ctx.stroke();
  }
  ctx.restore();
}
function studioProfileHead(ctx, style, view, g) {
  const name = view.headline, club = view.title;
  if (style === 'editorial') {
    studioAvatarBox(ctx, g.L, g.pt + 36, 116, view, '', 0, g.bg, g.ink);
    const x = g.L + 144;
    const px = studioFitPx(ctx, name, g.R - x, 58, 750, 36, -1);
    studioText(ctx, name, x - 2, g.pt + 98, studioF(750, px), g.ink, -1);
    studioText(ctx, club, x, g.pt + 142, studioF(400, 28), g.soft);
    return;
  }
  const glass = style === 'glass';
  const size = glass ? 136 : 128;
  studioAvatarBox(ctx, g.L, g.top - (glass ? 172 : 168), size, view, 'rgba(255,255,255,.16)', 1.5, g.bg, g.ink);
  const x = g.L + size + 30;
  if (glass) {
    const px = studioFitPx(ctx, name, g.R - x, 72, 400, 44, -2.5);
    studioText(ctx, name, x - 3, g.top - 92, studioF(400, px), g.ink, -2.5);
    studioText(ctx, club, x, g.top - 46, studioF(400, 30), g.soft);
  } else {
    studioText(ctx, club.toUpperCase(), x, g.top - 130, studioF(600, 21), g.kicker, 4.5);
    const px = studioFitPx(ctx, name, g.R - x, 56, 300, 34, -0.5);
    studioText(ctx, name, x - 2, g.top - 62, studioF(300, px), g.ink, -0.5);
  }
}
function studioPreset() {
  const list = Studio.PRESETS || [];
  return list.find(p => p.id === Studio.card.preset) || list[0] || null;
}
function studioF(weight, px, family) {
  return weight + ' ' + px + 'px ' + (family || studioGeist);
}
function studioTrackWidth(ctx, text, tracking) {
  let w = 0;
  for (const ch of String(text)) w += ctx.measureText(ch).width + tracking;
  return Math.max(0, w - tracking);
}
function studioTextWidth(ctx, text, font, track) {
  ctx.font = font;
  const s = String(text == null ? '' : text);
  if (!track) return ctx.measureText(s).width;
  if ('letterSpacing' in ctx) {
    ctx.letterSpacing = track + 'px';
    const w = ctx.measureText(s).width - track;
    ctx.letterSpacing = '0px';
    return w;
  }
  return studioTrackWidth(ctx, s, track);
}
function studioText(ctx, text, x, y, font, color, track, align) {
  const s = String(text == null ? '' : text);
  const t = track || 0;
  const w = studioTextWidth(ctx, s, font, t);
  const x0 = align === 'center' ? x - w / 2 : align === 'right' ? x - w : x;
  ctx.font = font;
  ctx.fillStyle = color;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  if (!t) ctx.fillText(s, x0, y);
  else if ('letterSpacing' in ctx) {
    ctx.letterSpacing = t + 'px';
    ctx.fillText(s, x0, y);
    ctx.letterSpacing = '0px';
  } else studioTrack(ctx, s, x0, y, t);
  return w;
}
function studioFitPx(ctx, text, maxW, px, weight, min, track) {
  let n = px;
  while (n > (min || 20) && studioTextWidth(ctx, text, studioF(weight, n), track || 0) > maxW) n -= 2;
  return n;
}
function studioWrap(ctx, text, font, maxW, maxLines) {
  const words = String(text || '').split(/\s+/).filter(Boolean);
  const lines = [];
  let line = '';
  ctx.font = font;
  words.forEach(w => {
    const next = line ? line + ' ' + w : w;
    if (line && ctx.measureText(next).width > maxW && lines.length < (maxLines || 2) - 1) {
      lines.push(line);
      line = w;
    } else line = next;
  });
  if (line) lines.push(line);
  return lines;
}
function studioSplitValue(v) {
  const s = String(v == null ? '–' : v);
  const m = s.match(/^([\d.,]+)\s*(min|cm|pts)$/);
  return m ? [m[1], m[2]] : [s, ''];
}
function studioValue(ctx, value, x, y, big, small, color, unitColor, align) {
  const [num, unit] = studioSplitValue(value);
  const gap = unit === '%' ? 2 : 8;
  const a = studioTextWidth(ctx, num, big, 0);
  const b = unit ? studioTextWidth(ctx, unit, small, 0) + gap : 0;
  const x0 = align === 'center' ? x - (a + b) / 2 : align === 'right' ? x - a - b : x;
  studioText(ctx, num, x0, y, big, color);
  if (unit) studioText(ctx, unit, x0 + a + gap, y, small, unitColor);
  return a + b;
}
function studioIcon(ctx, id, cx, cy, s, color, lw) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = lw || Math.max(1.6, s * 0.085);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  const h = s / 2;
  ctx.beginPath();
  if (id === 'arrow') {
    ctx.moveTo(-h * 0.78, h * 0.78);
    ctx.lineTo(h * 0.62, -h * 0.62);
    ctx.moveTo(h * 0.7, -h * 0.7);
    ctx.lineTo(h * 0.18, -h * 0.62);
    ctx.moveTo(h * 0.7, -h * 0.7);
    ctx.lineTo(h * 0.62, -h * 0.18);
    ctx.moveTo(-h * 0.78, h * 0.78);
    ctx.lineTo(-h * 0.78, h * 0.34);
    ctx.moveTo(-h * 0.78, h * 0.78);
    ctx.lineTo(-h * 0.34, h * 0.78);
    ctx.moveTo(-h * 0.5, h * 0.5);
    ctx.lineTo(-h * 0.5, h * 0.12);
    ctx.moveTo(-h * 0.5, h * 0.5);
    ctx.lineTo(-h * 0.12, h * 0.5);
    ctx.stroke();
  } else if (id === 'series') {
    [-0.52, 0, 0.52].forEach((yy, i) => {
      ctx.moveTo(-h * 0.72, yy * h);
      ctx.lineTo(h * (0.72 - i * 0.26), yy * h);
    });
    ctx.stroke();
  } else if (id === 'target') {
    ctx.arc(0, 0, h * 0.8, 0, Math.PI * 2);
    ctx.moveTo(h * 0.44, 0);
    ctx.arc(0, 0, h * 0.44, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0, 0, h * 0.13, 0, Math.PI * 2);
    ctx.fill();
  } else if (id === 'clock') {
    ctx.arc(0, 0, h * 0.8, 0, Math.PI * 2);
    ctx.moveTo(0, -h * 0.42);
    ctx.lineTo(0, 0);
    ctx.lineTo(h * 0.3, h * 0.2);
    ctx.stroke();
  } else if (id === 'bow') {
    ctx.arc(h * 0.9, 0, h * 1.25, Math.PI * 0.68, Math.PI * 1.32);
    const ax = h * 0.9 + Math.cos(Math.PI * 0.68) * h * 1.25;
    const ay = Math.sin(Math.PI * 0.68) * h * 1.25;
    ctx.moveTo(ax, ay);
    ctx.lineTo(ax, -ay);
    ctx.moveTo(-h * 0.85, 0);
    ctx.lineTo(h * 0.85, 0);
    ctx.moveTo(h * 0.85, 0);
    ctx.lineTo(h * 0.5, -h * 0.3);
    ctx.moveTo(h * 0.85, 0);
    ctx.lineTo(h * 0.5, h * 0.3);
    ctx.stroke();
  } else if (id === 'score') {
    ctx.moveTo(-h * 0.55, -h * 0.78);
    ctx.lineTo(h * 0.55, -h * 0.78);
    ctx.lineTo(h * 0.5, -h * 0.1);
    ctx.quadraticCurveTo(0, h * 0.35, -h * 0.5, -h * 0.1);
    ctx.closePath();
    ctx.moveTo(0, h * 0.14);
    ctx.lineTo(0, h * 0.56);
    ctx.moveTo(-h * 0.4, h * 0.78);
    ctx.lineTo(h * 0.4, h * 0.78);
    ctx.stroke();
  } else {
    ctx.arc(0, 0, h * 0.56, 0, Math.PI * 2);
    [[0, -1], [0, 1], [-1, 0], [1, 0]].forEach(d => {
      ctx.moveTo(d[0] * h * 0.3, d[1] * h * 0.3);
      ctx.lineTo(d[0] * h * 0.9, d[1] * h * 0.9);
    });
    ctx.stroke();
  }
  ctx.restore();
}
function studioEase(g, from, to, colorOf) {
  for (let i = 0; i <= 10; i++) {
    const t = i / 10;
    const e = t * t * (3 - 2 * t);
    g.addColorStop(from + (to - from) * t, colorOf(e));
  }
}
function studioPhotoCanvas(img, src, w, h, opt) {
  const o = opt || {};
  const tag = String(src).length > 160 ? String(src).length + ':' + String(src).slice(-48) : String(src);
  const key = [tag, w, h, o.focus, o.bright, o.fade, o.tint, o.duo].join('|');
  const cache = Studio.card.photoCache || (Studio.card.photoCache = new Map());
  if (cache.has(key)) return cache.get(key);
  if (cache.size > 10) cache.clear();
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const x = c.getContext('2d');
  const scale = Math.max(w / img.naturalWidth, h / img.naturalHeight);
  const dw = img.naturalWidth * scale, dh = img.naturalHeight * scale;
  const fy = Number.isFinite(o.focus) ? o.focus : 0.5;
  x.filter = 'grayscale(1) contrast(1.12) brightness(' + (o.bright || 0.62) + ')';
  x.drawImage(img, (w - dw) / 2, (h - dh) * fy, dw, dh);
  x.filter = 'none';
  if (o.tint) {
    x.globalCompositeOperation = 'soft-light';
    x.fillStyle = o.tint;
    x.fillRect(0, 0, w, h);
    x.globalCompositeOperation = 'source-over';
  }
  if (o.duo) {
    x.globalCompositeOperation = 'color';
    x.globalAlpha = 0.17;
    x.fillStyle = o.duo;
    x.fillRect(0, 0, w, h);
    x.globalAlpha = 1;
    x.globalCompositeOperation = 'source-over';
  }
  const vig = x.createRadialGradient(w / 2, h * 0.45, Math.min(w, h) * 0.3, w / 2, h * 0.5, Math.max(w, h) * 0.75);
  vig.addColorStop(0, 'rgba(0,0,0,0)');
  vig.addColorStop(1, 'rgba(0,0,0,.34)');
  x.fillStyle = vig;
  x.fillRect(0, 0, w, h);
  if (o.fade) {
    x.globalCompositeOperation = 'destination-out';
    const g = x.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, 'rgba(0,0,0,0)');
    studioEase(g, o.fade, 1, e => 'rgba(0,0,0,' + e.toFixed(3) + ')');
    x.fillStyle = g;
    x.fillRect(0, 0, w, h);
    x.globalCompositeOperation = 'source-over';
  }
  cache.set(key, c);
  return c;
}
function studioCardSheen(ctx, x, y, w, h, r, tilt, gloss, accent) {
  const rx = tilt && Number.isFinite(tilt.x) ? tilt.x : 0;
  const ry = tilt && Number.isFinite(tilt.y) ? tilt.y : 0;
  const amount = Number.isFinite(gloss) ? gloss : 0.1;
  ctx.save();
  if (r > 0) { studioRound(ctx, x, y, w, h, r); ctx.clip(); }
  ctx.translate(x + w * 0.3 + ry * 18, y + h * 0.1 - rx * 14);
  ctx.rotate(-0.62);
  const g = ctx.createLinearGradient(-w * 0.2, 0, w * 0.8, 0);
  g.addColorStop(0, 'rgba(255,255,255,0)');
  g.addColorStop(0.38, 'rgba(255,255,255,0)');
  g.addColorStop(0.47, studioRgba(accent || '#ffffff', amount * 0.35));
  g.addColorStop(0.52, 'rgba(255,255,255,' + amount.toFixed(3) + ')');
  g.addColorStop(0.6, 'rgba(255,255,255,0)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(-w * 1.6, -h, w * 3.4, h * 2.8);
  ctx.restore();
}
function studioFace(ctx) {
  if (typeof document === 'undefined' || !document.fonts || !document.fonts.load) return;
  if (Studio.card.fontsAsked) return;
  Studio.card.fontsAsked = true;
  Promise.all([300, 400, 500, 600, 700, 200].map(w => document.fonts.load(studioF(w, 40))).concat(document.fonts.load(studioF(600, 40, studioNum)))).then(() => {
    if (Studio.shareOpen) studioDrawShare();
  }).catch(() => {});
}

function studioGauge(ctx, cx, cy, R, pct, acc, halo) {
  const a0 = Math.PI * 0.75, sweep = Math.PI * 1.5, k = R / 67;
  const p = Math.max(0, Math.min(1, pct || 0)), end = a0 + sweep * p;
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineWidth = 7 * k;
  ctx.beginPath();
  ctx.arc(cx, cy, R, a0, a0 + sweep);
  ctx.strokeStyle = 'rgba(255,255,255,.08)';
  ctx.stroke();
  if (p > 0) {
    ctx.beginPath();
    ctx.arc(cx, cy, R, a0, end);
    ctx.strokeStyle = acc;
    ctx.stroke();
  }
  const kx = cx + Math.cos(end) * R, ky = cy + Math.sin(end) * R;
  ctx.beginPath();
  ctx.arc(kx, ky, 9 * k, 0, Math.PI * 2);
  ctx.fillStyle = halo;
  ctx.fill();
  ctx.beginPath();
  ctx.arc(kx, ky, 3 * k, 0, Math.PI * 2);
  ctx.fillStyle = '#ffffff';
  ctx.fill();
  ctx.restore();
}
function studioPanel(ctx, x, y, w, h, r, fill, line) {
  studioRound(ctx, x, y, w, h, r);
  ctx.fillStyle = fill;
  ctx.fill();
  const sheen = ctx.createLinearGradient(0, y, 0, y + h * 0.5);
  sheen.addColorStop(0, 'rgba(255,255,255,.035)');
  sheen.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = sheen;
  ctx.fill();
  studioRound(ctx, x + 0.75, y + 0.75, w - 1.5, h - 1.5, r);
  ctx.strokeStyle = line;
  ctx.lineWidth = 1.5;
  ctx.stroke();
}

// Bars start from a floor just under the weakest series so close scores still read apart; the number on top stays exact.
function studioBars(ctx, x, y, w, h, series, o) {
  const items = (series && series.items) || [];
  if (!items.length) {
    studioText(ctx, 'Sin puntuación', x, y + h / 2, studioF(500, o.labelPx || 15), o.label);
    return;
  }
  const ratios = items.map(it => it.max ? it.sum / it.max : 0);
  const lo = Math.max(0, Math.floor((Math.min.apply(null, ratios) - 0.12) * 20) / 20);
  const top = items.reduce((k, it, i) => it.sum > items[k].sum ? i : k, 0);
  const n = items.length;
  const bw = Math.min(o.maxBar || 40, w / (n * 1.75));
  const step = n > 1 ? (w - bw) / (n - 1) : 0;
  const x0 = n > 1 ? x : x + (w - bw) / 2;
  const valPx = o.valuePx || 17, labPx = o.labelPx || 13;
  const plotTop = y + valPx + 10, plotH = h - valPx - 10 - labPx - 14;
  items.forEach((it, i) => {
    const bx = x0 + step * i;
    const k = Math.max(0.06, Math.min(1, ((it.max ? it.sum / it.max : 0) - lo) / Math.max(0.01, 1 - lo)));
    const bh = Math.max(bw * 0.5, plotH * k);
    const by = plotTop + plotH - bh;
    const best = it.value != null ? it.value === 'X' || it.value === '11' : i === top;
    if (o.track) {
      studioRound(ctx, bx, plotTop, bw, plotH, bw / 2);
      ctx.fillStyle = o.track;
      ctx.fill();
    }
    ctx.save();
    if (best && o.glow) {
      ctx.shadowColor = studioRgba(o.acc, 0.45);
      ctx.shadowBlur = 18;
    }
    studioRound(ctx, bx, by, bw, bh, bw / 2);
    if (best) {
      const g = ctx.createLinearGradient(0, by, 0, by + bh);
      g.addColorStop(0, o.acc2 || o.acc);
      g.addColorStop(1, o.acc);
      ctx.fillStyle = g;
    } else ctx.fillStyle = o.bar;
    ctx.fill();
    ctx.restore();
    studioText(ctx, String(it.value === 'X' ? 'X' : it.sum), bx + bw / 2, by - 10, studioF(600, valPx, o.valueFamily), best ? o.acc : o.value, 0, 'center');
    studioText(ctx, it.label, bx + bw / 2, y + h, studioF(500, labPx), o.label, 1, 'center');
  });
}
function studioDistTone(v, acc, acc2, base) {
  if (v === 'X' || v === '11') return acc;
  if (v === '10') return acc2;
  return studioRgba(base, v === '9' ? 0.62 : v === '8' ? 0.36 : 0.18);
}
function studioDistBar(ctx, x, y, w, h, dist, o) {
  const total = (dist || []).reduce((n, d) => n + d.n, 0);
  if (!total) {
    studioRound(ctx, x, y, w, h, h / 2);
    ctx.fillStyle = studioRgba(o.base, 0.1);
    ctx.fill();
    return;
  }
  const gap = o.gap == null ? 4 : o.gap;
  const usable = w - gap * (dist.length - 1);
  const raw = dist.map(d => Math.max(h, usable * d.n / total));
  const fit = usable / raw.reduce((n, v) => n + v, 0);
  let cx = x;
  dist.forEach((d, i) => {
    const sw = raw[i] * fit;
    studioRound(ctx, cx, y, sw, h, Math.min(h / 2, o.radius || h / 2));
    ctx.fillStyle = studioDistTone(d.v, o.acc, o.acc2, o.base);
    ctx.fill();
    cx += sw + gap;
  });
  if (!o.legendY) return;
  const cells = dist.length;
  const cellW = w / Math.max(cells, o.minCells || 0);
  dist.forEach((d, i) => {
    const lx = x + cellW * i;
    ctx.beginPath();
    ctx.arc(lx + 6, o.legendY - (o.countPx || 22) * 0.32, 5.5, 0, Math.PI * 2);
    ctx.fillStyle = studioDistTone(d.v, o.acc, o.acc2, o.base);
    ctx.fill();
    const lw = studioText(ctx, d.v, lx + 20, o.legendY, studioF(500, o.keyPx || 16), o.key);
    studioText(ctx, String(d.n), lx + 20 + lw + 8, o.legendY, studioF(o.countWeight || 650, o.countPx || 22, o.countFamily), o.count);
  });
}

function studioTokens(style, theme) {
  const acc = theme.acc, acc2 = theme.acc2 || studioMix(acc, '#ffffff', 0.45);
  if (style === 'editorial') {
    return {style, acc, acc2: studioMix(acc, '#f7f3ec', 0.45), ink: '#1c1b19', soft: '#7a746b', hair: 'rgba(28,27,25,.09)', block: '#efe9df', paper: '#f7f3ec', base: '#1c1b19',
      bar: 'rgba(28,27,25,.13)', track: '', glow: false, panel: 'block', pad: 30, labelPx: 21, labelW: 600, labelTrack: 2.6,
      num: px => studioF(750, px), numTrack: -1, unit: px => studioF(600, px), statMax: 46, scoreW: 750, chipInk: '#f7f3ec'};
  }
  if (style === 'obsidian') {
    return {style, acc, acc2, ink: '#f1efea', soft: '#8e8a83', hair: 'rgba(255,255,255,.1)', base: '#ffffff',
      bar: 'rgba(255,255,255,.16)', track: 'rgba(255,255,255,.04)', glow: true, panel: 'none', pad: 0, labelPx: 21, labelW: 500, labelTrack: 3,
      num: px => studioF(300, px), numTrack: 0, unit: px => studioF(400, px), statMax: 62, scoreW: 200, chipInk: '#0b0b0d'};
  }
  return {style: 'glass', acc, acc2, halo: theme.glow || studioRgba(acc, 0.3), ink: '#ffffff', soft: '#9a9aa2', hair: 'rgba(255,255,255,.08)', fill: 'rgba(11,11,13,.8)', base: '#ffffff',
    bar: 'rgba(255,255,255,.16)', track: 'rgba(255,255,255,.04)', glow: true, panel: 'glass', pad: 34, labelPx: 22, labelW: 500, labelTrack: 3,
    num: px => studioF(600, px, studioNum), numTrack: 0, unit: px => studioF(500, px), statMax: 88, chipInk: '#0b0b0d'};
}
function studioWLabel(ctx, text, x, y, S, align, color) {
  studioText(ctx, text, x, y + S.labelPx, studioF(S.labelW, S.labelPx), color || S.soft, S.labelTrack, align);
  return y + S.labelPx;
}
// Label over a single big value, centred vertically in the widget; foot reserves room under the value.
function studioStack(b, S, maxPx, foot) {
  const f = foot || 0;
  const px = Math.round(Math.max(20, Math.min(maxPx, (b.h - S.labelPx - 14 - f) / 0.78)));
  const gap = Math.max(12, Math.min(24, px * 0.24));
  const total = S.labelPx + gap + px * 0.72 + f;
  const top = b.y + Math.max(0, (b.h - total) / 2);
  return {px, top, base: top + S.labelPx + gap + px * 0.72, bottom: top + total};
}
function studioFitValue(ctx, value, x, y, maxW, px, S, color, align, font) {
  const [num, unit] = studioSplitValue(value);
  const big = font || S.num;
  const unitPx = n => Math.max(22, Math.round(n * 0.34));
  const width = n => studioTextWidth(ctx, num, big(n), 0) + (unit ? studioTextWidth(ctx, unit, S.unit(unitPx(n)), 0) + (unit === '%' ? 2 : 8) : 0);
  let n = px;
  while (n > 18 && width(n) > maxW) n -= 2;
  return {w: studioValue(ctx, value, x, y, big(n), S.unit(unitPx(n)), color || S.ink, S.soft, align), px: n};
}
function studioBar(ctx, x, y, w, h, pct, S) {
  studioRound(ctx, x, y, w, h, h / 2);
  ctx.fillStyle = studioRgba(S.base, S.style === 'editorial' ? 0.08 : 0.08);
  ctx.fill();
  const p = Math.max(0, Math.min(1, pct || 0));
  if (!p) return;
  ctx.save();
  if (S.glow) { ctx.shadowColor = studioRgba(S.acc, 0.5); ctx.shadowBlur = 14; }
  const g = ctx.createLinearGradient(x, 0, x + w * p, 0);
  g.addColorStop(0, S.acc);
  g.addColorStop(1, S.acc2);
  studioRound(ctx, x, y, Math.max(h, w * p), h, h / 2);
  ctx.fillStyle = g;
  ctx.fill();
  ctx.restore();
}
function studioDistLegend(ctx, x, y, w, dist, S, perRow, rowH, px) {
  const total = dist.reduce((n, d) => n + d.n, 0) || 1;
  const cellW = w / perRow;
  dist.forEach((d, i) => {
    const lx = x + cellW * (i % perRow), ly = y + Math.floor(i / perRow) * rowH;
    ctx.beginPath();
    ctx.arc(lx + 7, ly - px * 0.32, 7, 0, Math.PI * 2);
    ctx.fillStyle = studioDistTone(d.v, S.acc, S.acc2, S.base);
    ctx.fill();
    const kw = studioText(ctx, d.v, lx + 23, ly, studioF(500, Math.round(px * 0.72)), S.soft);
    const cw = studioText(ctx, String(d.n), lx + 23 + kw + 9, ly, S.num(px), S.ink);
  });
}
function studioDonut(ctx, cx, cy, R, lw, dist, S) {
  const total = dist.reduce((n, d) => n + d.n, 0);
  ctx.save();
  ctx.lineWidth = lw;
  ctx.lineCap = 'butt';
  if (!total) {
    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, Math.PI * 2);
    ctx.strokeStyle = studioRgba(S.base, 0.08);
    ctx.stroke();
    ctx.restore();
    return;
  }
  const gap = dist.length > 1 ? Math.min(0.06, 7 / R) : 0;
  let a = -Math.PI / 2;
  dist.forEach(d => {
    const sweep = Math.PI * 2 * d.n / total;
    const hot = d.v === 'X' || d.v === '11';
    ctx.save();
    if (hot && S.glow) { ctx.shadowColor = studioRgba(S.acc, 0.45); ctx.shadowBlur = 20; }
    ctx.beginPath();
    ctx.arc(cx, cy, R, a + gap / 2, a + Math.max(gap / 2 + 0.01, sweep - gap / 2));
    ctx.strokeStyle = studioDistTone(d.v, S.acc, S.acc2, S.base);
    ctx.stroke();
    ctx.restore();
    a += sweep;
  });
  ctx.restore();
}
function studioChip(ctx, cx, cy, r, v, S) {
  const hot = v === 'X' || v === '11', ten = v === '10';
  studioRound(ctx, cx - r, cy - r, r * 2, r * 2, r * 0.5);
  if (hot) { ctx.fillStyle = S.acc; ctx.fill(); }
  else {
    ctx.fillStyle = studioRgba(S.base, 0.06);
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = ten ? studioRgba(S.acc, 0.8) : studioRgba(S.base, 0.16);
    ctx.stroke();
  }
  studioText(ctx, v, cx, cy + r * 0.36, studioF(650, Math.round(r * 0.95)), hot ? S.chipInk : ten ? S.ink : S.soft, 0, 'center');
}

const studioWidgetPaint = {
  score(ctx, b, view, S) {
    const unit = view.scoreLabel || (view.scoreMax ? 'PUNTOS' : 'FLECHAS');
    if (S.style === 'glass') {
      if (b.size === 'small') {
        const R = Math.min(b.w / 2 / 1.14, (b.h - 8) / 1.9);
        const cx = b.x + b.w / 2, cy = b.y + (b.h - 1.9 * R) / 2 + 1.06 * R;
        studioGauge(ctx, cx, cy, R, view.pct, S.acc, S.halo);
        const px = Math.round(R * 0.74), lpx = Math.max(20, Math.round(R * 0.16)), gap = R * 0.2;
        const base = cy - (px * 0.7 + gap + lpx * 0.72) / 2 + px * 0.7;
        studioFitValue(ctx, view.scoreMain, cx, base, R * 1.3, px, S, S.acc, 'center');
        studioText(ctx, (view.scoreMax ? '/ ' + view.scoreMax : unit).toUpperCase(), cx, base + gap + lpx * 0.72, studioF(500, lpx), S.soft, lpx * 0.13, 'center');
        return;
      }
      const R = (b.h - 6) / 1.9;
      const cx = b.x + R * 1.14, cy = b.y + 3 + 1.06 * R;
      studioGauge(ctx, cx, cy, R, view.pct, S.acc, S.halo);
      studioText(ctx, view.pct != null ? Math.round(view.pct * 100) + '%' : '–', cx, cy + R * 0.24, S.num(Math.round(R * 0.66)), S.ink, 0, 'center');
      const tx = cx + R * 1.14 + 44;
      studioWLabel(ctx, view.scoreLabel || (view.scoreMax ? 'PUNTUACIÓN' : 'FLECHAS'), tx, b.y + 2, S);
      const fit = studioFitValue(ctx, view.scoreMain, tx - 2, b.y + b.h - 6, b.x + b.w - tx - 150, Math.round((b.h - 34) / 0.74), S, S.acc);
      if (view.scoreMax) studioText(ctx, '/ ' + view.scoreMax, tx + fit.w + 12, b.y + b.h - 6, S.num(Math.round(fit.px * 0.36)), 'rgba(255,255,255,.5)');
      return;
    }
    const obs = S.style === 'obsidian';
    const wide = b.size === 'wide';
    const font = px => studioF(S.scoreW, px);
    const track = px => obs ? -px * 0.034 : -1;
    const foot = wide ? 30 : 0;
    const st = studioStack(b, S, obs ? 300 : 150, foot);
    const label = obs ? 0 : S.labelPx + 14;
    let px = obs ? Math.round(Math.min(300, (b.h - foot - 8) / 0.76)) : st.px;
    const tail = n => view.scoreMax ? '/ ' + view.scoreMax : (view.scoreNote || '');
    const tailPx = n => Math.max(20, Math.round(n * (obs ? 0.22 : 0.3)));
    const room = b.w - (wide && view.pct != null ? 200 : 0);
    while (px > 30 && studioTextWidth(ctx, view.scoreMain, font(px), track(px)) + 12 + studioTextWidth(ctx, tail(px), studioF(obs ? 300 : 600, tailPx(px)), 0) > room) px -= 2;
    const top = obs ? b.y + Math.max(0, (b.h - foot - px * 0.72 - 8) / 2) : b.y + Math.max(0, (b.h - label - px * 0.72 - foot) / 2);
    const base = top + label + px * 0.72;
    if (!obs) {
      studioIcon(ctx, 'score', b.x + 11, top + S.labelPx * 0.6, 24, S.acc, 2.2);
      studioWLabel(ctx, unit, b.x + 34, top, S);
    }
    ctx.save();
    if (obs) { ctx.shadowColor = 'rgba(0,0,0,.6)'; ctx.shadowBlur = 18; ctx.shadowOffsetY = 4; }
    const sw = studioText(ctx, view.scoreMain, b.x - (obs ? px * 0.04 : 2), base, font(px), S.ink, track(px));
    ctx.restore();
    if (tail(px)) studioText(ctx, tail(px), b.x + sw + (obs ? 6 : 12), base, studioF(obs ? 300 : 600, tailPx(px)), S.soft);
    if (!wide) return;
    if (view.pct != null) {
      const pp = Math.max(30, Math.round(px * 0.3));
      studioText(ctx, Math.round(view.pct * 100) + '%', b.x + b.w, base, studioF(obs ? 300 : 750, pp), S.ink, 0, 'right');
      studioText(ctx, 'DEL MÁXIMO', b.x + b.w, base - pp - 12, studioF(S.labelW, S.labelPx * 0.9), S.soft, S.labelTrack, 'right');
    }
    studioBar(ctx, b.x, base + foot - 6, b.w, obs ? 4 : 6, view.pct, S);
  },
  stats(ctx, b, view, S) {
    const cols = b.size === 'wide' ? 4 : 2, rows = cols === 4 ? 1 : 2;
    const icons = {arrows: 'arrow', series: 'series', avg: 'target', time: 'clock'};
    const gapY = rows > 1 ? Math.min(24, b.h * 0.08) : 0;
    const cw = b.w / cols, ch = (b.h - gapY * (rows - 1)) / rows;
    view.stats.forEach((cell, i) => {
      const col = i % cols, row = Math.floor(i / cols);
      const x0 = b.x + col * cw, y0 = b.y + row * (ch + gapY);
      const inset = col ? (S.style === 'obsidian' ? 0 : 26) : 0;
      if (col && S.style !== 'obsidian') {
        ctx.fillStyle = S.hair;
        ctx.fillRect(x0, y0 + 4, 1.5, ch - 8);
      }
      if (row && cols === 2 && S.style === 'glass' && col === 0) {
        ctx.fillStyle = S.hair;
        ctx.fillRect(b.x, y0 - gapY / 2, b.w, 1.5);
      }
      const x = x0 + inset, w = cw - inset - 10;
      const st = studioStack({x, y: y0, w, h: ch}, S, S.statMax);
      let lx = x;
      if (S.style === 'editorial') {
        studioIcon(ctx, icons[cell.id], x + 11, st.top + S.labelPx * 0.6, 24, S.acc, 2.2);
        lx = x + 34;
      }
      studioWLabel(ctx, cell.label.toUpperCase(), lx, st.top, S);
      studioFitValue(ctx, cell.value, x - 2, st.base, w, st.px, S);
    });
  },
  dist(ctx, b, view, S) {
    const dist = view.dist || [];
    const total = dist.reduce((n, d) => n + d.n, 0);
    const variant = b.widget.variant || 'bar';
    const top = studioWLabel(ctx, 'DISTRIBUCIÓN', b.x, b.y, S) + 14;
    if (variant === 'bar') {
      const perRow = b.size === 'wide' || b.w > 600 ? Math.max(5, dist.length) : 3;
      const lines = Math.max(1, Math.ceil(dist.length / perRow));
      const px = b.w > 600 ? 34 : 30, rowH = px + 22;
      const legendY = b.y + b.h - 4 - (lines - 1) * rowH;
      const bh = S.style === 'editorial' ? 16 : S.style === 'obsidian' ? 10 : 12;
      const barY = Math.max(top, top + (legendY - px - 10 - top - bh) / 2);
      studioDistBar(ctx, b.x, barY, b.w, bh, dist, {acc: S.acc, acc2: S.acc2, base: S.base, gap: S.style === 'editorial' ? 5 : 4});
      studioDistLegend(ctx, b.x, legendY, b.w, dist, S, perRow, rowH, px);
      return;
    }
    if (variant === 'donut') {
      const n = Math.max(1, dist.length);
      const bottom = b.y + b.h - 6;
      const availH = Math.max(40, bottom - top);
      const gap = Math.max(20, b.w * 0.04);
      const fitPx = (cellW, maxPx) => {
        let px = maxPx;
        const widest = Math.max(...dist.map(d => Math.max(studioTextWidth(ctx, String(d.n), S.num(px), 0), 1)), 1);
        while (px > 18 && studioTextWidth(ctx, String(Math.max(...dist.map(d => d.n), 0)), S.num(px), 0) > cellW - 10) px -= 2;
        return widest ? px : maxPx;
      };
      const legendH = px => Math.round(px * 0.42) + 10 + px * 0.74;
      // side legend if there is room for at least ~64 px per item next to a donut as tall as the box
      const sideRoom = b.w - Math.min(availH, b.w * 0.5) - gap;
      const side = sideRoom >= n * 64;
      let D, cx, cy, lx, ly, cellW, px;
      if (side) {
        D = Math.min(availH, b.w * 0.5);
        cx = b.x + D / 2; cy = top + availH / 2;
        lx = b.x + D + gap; cellW = (b.x + b.w - lx) / n;
        px = fitPx(cellW, Math.round(Math.max(22, Math.min(D * 0.4, 60))));
        while (px > 18 && legendH(px) > availH) px -= 2;
        ly = cy;
      } else {
        cellW = b.w / n;
        px = fitPx(cellW, Math.round(Math.max(22, Math.min(b.w * 0.09, 44))));
        const lh = legendH(px);
        D = Math.max(0, Math.min(availH - lh - 16, b.w));
        cx = b.x + b.w / 2; cy = top + D / 2;
        lx = b.x; ly = top + D + 16 + lh / 2;
      }
      const R = D / 2;
      if (R >= 18) {
        const lw = Math.max(8, Math.min(R * 0.22, 26));
        studioDonut(ctx, cx, cy, R - lw / 2, lw, dist, S);
        const inner = R - lw - 6;
        let npx = Math.round(inner * (R >= 70 ? 0.75 : 0.95));
        while (npx > 12 && studioTextWidth(ctx, String(total), S.num(npx), 0) > inner * 1.6) npx -= 2;
        if (R >= 70) {
          const lpx = Math.max(13, Math.round(inner * 0.2));
          const blk = npx * 0.72 + 8 + lpx * 0.72;
          studioText(ctx, String(total), cx, cy - blk / 2 + npx * 0.72, S.num(npx), S.ink, 0, 'center');
          studioText(ctx, 'FLECHAS', cx, cy + blk / 2, studioF(500, lpx), S.soft, 2, 'center');
        } else if (npx >= 12) studioText(ctx, String(total), cx, cy + npx * 0.36, S.num(npx), S.ink, 0, 'center');
      }
      const kpx = Math.round(Math.max(13, px * 0.42));
      const lh = legendH(px);
      const ky = ly - lh / 2 + kpx * 0.8, vy = ly + lh / 2;
      dist.forEach((d, i) => {
        const x = lx + cellW * i;
        const dot = Math.max(4, kpx * 0.3);
        ctx.beginPath();
        ctx.arc(x + dot, ky - kpx * 0.33, dot, 0, Math.PI * 2);
        ctx.fillStyle = studioDistTone(d.v, S.acc, S.acc2, S.base);
        ctx.fill();
        studioText(ctx, d.v, x + dot * 2 + 8, ky, studioF(600, kpx), S.soft, 1);
        studioText(ctx, String(d.n), x, vy, S.num(px), d.v === 'X' || d.v === '11' ? S.acc : S.ink);
      });
      return;
    }
    const n = Math.max(1, dist.length);
    const peak = Math.max(1, ...dist.map(d => d.n));
    const keyPx = 23, valPx = b.w > 600 ? 30 : 26;
    const plotTop = top + valPx + 8, plotBot = Math.max(top + valPx + 16, b.y + b.h - keyPx - 10);
    const cw = b.w / n, bw = Math.min(cw * 0.42, 48);
    ctx.fillStyle = studioRgba(S.base, S.style === 'editorial' ? 0.12 : 0.1);
    ctx.fillRect(b.x, plotBot, b.w, 1.5);
    dist.forEach((d, i) => {
      const x = b.x + cw * i + (cw - bw) / 2;
      const hh = Math.max(8, (plotBot - plotTop) * d.n / peak);
      const y = plotBot - hh;
      const hot = d.v === 'X' || d.v === '11';
      const rad = Math.min(10, bw / 2, hh / 2);
      ctx.save();
      if (hot && S.glow) { ctx.shadowColor = studioRgba(S.acc, 0.45); ctx.shadowBlur = 16; }
      ctx.beginPath();
      ctx.moveTo(x, plotBot);
      ctx.lineTo(x, y + rad);
      ctx.quadraticCurveTo(x, y, x + rad, y);
      ctx.lineTo(x + bw - rad, y);
      ctx.quadraticCurveTo(x + bw, y, x + bw, y + rad);
      ctx.lineTo(x + bw, plotBot);
      ctx.closePath();
      if (hot) {
        const g = ctx.createLinearGradient(0, y, 0, plotBot);
        g.addColorStop(0, S.acc2);
        g.addColorStop(1, S.acc);
        ctx.fillStyle = g;
      } else ctx.fillStyle = studioDistTone(d.v, S.acc, S.acc2, S.base);
      ctx.fill();
      ctx.restore();
      studioText(ctx, String(d.n), x + bw / 2, y - 8, S.num(valPx), hot ? S.acc : S.ink, 0, 'center');
      studioText(ctx, d.v, x + bw / 2, b.y + b.h - 1, studioF(600, keyPx), S.soft, 1, 'center');
    });
  },
  series(ctx, b, view, S) {
    if (view.series && view.series.avg) { studioAvgBars(ctx, b, view.series, S); return; }
    const title = (view.series && view.series.title) || 'POR SERIE';
    const top = studioWLabel(ctx, title, b.x, b.y, S);
    let x = b.x, w = b.w, y = top + 6;
    if (b.size === 'wide' && view.best && title === 'POR SERIE' && b.w > 600) {
      const px = Math.round(Math.min(S.style === 'glass' ? 76 : 50, (b.h - (top - b.y)) * 0.42));
      const base = top + 18 + px * 0.74;
      studioText(ctx, String(view.best.sum), b.x - 2, base, S.num(px), S.style === 'editorial' ? S.ink : S.acc);
      studioText(ctx, 'mejor · S' + view.best.index, b.x, base + 40, studioF(500, 23), S.soft);
      x = b.x + 190;
      w = b.w - 190;
      y = b.y - 4;
    }
    const light = S.style === 'editorial';
    studioBars(ctx, x, y, w, b.y + b.h - y, view.series, {acc: S.acc, acc2: light ? '' : S.acc2, glow: S.glow, bar: S.bar, track: S.track,
      value: S.soft, label: light ? S.soft : 'rgba(255,255,255,.5)', maxBar: b.size === 'wide' ? 36 : 30, valuePx: 22, labelPx: 19, valueFamily: S.style === 'glass' ? studioNum : studioGeist});
  },
  group(ctx, b, view, S) {
    // Solo número: valor de agrupación grande y cuántas flechas cuenta.
    const n = view.groupN || 0;
    const st = studioStack(b, S, S.statMax * (S.style === 'glass' ? 0.9 : 1.1));
    studioWLabel(ctx, 'AGRUPACIÓN', b.x, st.top, S);
    const fit = studioFitValue(ctx, view.spreadText, b.x - 2, st.base, b.w * (b.size === 'wide' ? 0.6 : 1), st.px, S);
    void n; void fit;
  },
  recent(ctx, b, view, S) {
    const v = studioRecent(view.heatSessions || [], b.widget.variant || 'a30', view.when);
    const st = studioStack(b, S, S.statMax * (S.style === 'glass' ? 0.9 : 1.1));
    const vr = b.widget.variant || 'a30', vn = Number(vr.slice(1)) || 30;
    studioWLabel(ctx, 'MEDIA', b.x, st.top, S);
    const win = vr[0] === 'd' ? vn + ' días' : vn.toLocaleString('es-ES') + ' flechas';
    const fit = studioFitValue(ctx, v.avg == null ? '–' : studioAvgText(v.avg), b.x - 2, st.base, b.w * 0.6, st.px, S, v.avg == null ? S.soft : S.acc);
    const px = Math.max(22, Math.round(fit.px * 0.36));
    if (v.avg == null || v.prev == null) { studioText(ctx, win, b.x + fit.w + 16, st.base, studioF(500, px), S.soft, 0); return; }
    const d = Math.round((v.avg - v.prev) * 10) / 10, up = d > 0, flat = d === 0;
    const tx = b.x + fit.w + 16, ty = st.base - fit.px * 0.42;
    ctx.fillStyle = flat ? S.soft : up ? S.acc : S.soft;
    ctx.beginPath();
    if (flat) { ctx.rect(tx, ty - 2, px * 0.7, 4); }
    else { const h = px * 0.62, w = px * 0.72, a = up ? ty + h / 2 : ty - h / 2, c = up ? ty - h / 2 : ty + h / 2; ctx.moveTo(tx, a); ctx.lineTo(tx + w, a); ctx.lineTo(tx + w / 2, c); ctx.closePath(); }
    ctx.fill();
    const dw = studioText(ctx, (up ? '+' : '') + String(d).replace('.', ','), tx + px * 0.72 + 8, ty + px * 0.36, studioF(500, px), S.soft, 0);
    studioText(ctx, '· ' + win, tx + px * 0.72 + 8 + (dw || 40) + 10, ty + px * 0.36, studioF(500, px), S.soft, 0);
    if (b.size !== 'wide' || v.spark.length < 3) return;
    const x0 = b.x + b.w * 0.55, w = b.w * 0.45, y0 = b.y + S.labelPx + 22, h = b.y + b.h - y0 - 6;
    const lo = Math.min(...v.spark), hi = Math.max(...v.spark), rng = Math.max(0.2, hi - lo);
    ctx.strokeStyle = S.acc; ctx.lineWidth = 3; ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.beginPath();
    v.spark.forEach((y, i) => { const X = x0 + w * i / (v.spark.length - 1), Y = y0 + h - (y - lo) / rng * h; i ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y); });
    ctx.stroke();
  },
  total(ctx, b, view, S) {
    const L = view.heatSessions || [];
    const n = L.reduce((a, s) => a + (s.shots || []).filter(x => x && !x.candidate).length, 0);
    const st = studioStack(b, S, S.statMax * (S.style === 'glass' ? 0.9 : 1.1));
    studioWLabel(ctx, 'FLECHAS TOTALES', b.x, st.top, S);
    const fit = studioFitValue(ctx, n.toLocaleString('es-ES'), b.x - 2, st.base, b.w, st.px, S);
    const first = L.reduce((m, s) => Math.min(m, s.id || Infinity), Infinity);
    if (b.size === 'wide' && Number.isFinite(first)) {
      const M = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'], d = new Date(first);
      studioText(ctx, 'desde ' + M[d.getMonth()] + ' ' + d.getFullYear(), b.x + b.w, st.base, studioF(500, Math.max(22, Math.round(fit.px * 0.34))), S.soft, 0, 'right');
    }
  },
  week(ctx, b, view, S) {
    const w = studioWeek(view.heatSessions || [], view.when);
    const st = studioStack(b, S, S.statMax * (S.style === 'glass' ? 0.9 : 1.1));
    studioWLabel(ctx, 'ESTA SEMANA', b.x, st.top, S);
    const fit = studioFitValue(ctx, String(w.sets), b.x - 2, st.base, b.w * 0.45, st.px, S, w.sets ? S.acc : S.soft);
    const px = Math.max(22, Math.round(fit.px * 0.36));
    const uw = studioText(ctx, w.sets === 1 ? 'serie' : 'series', b.x + fit.w + 10, st.base, studioF(500, px), S.soft, 0);
    const right = w.arrows + ' flechas';
    if (b.size === 'wide' || b.w - fit.w - uw - 30 > px * 5) studioText(ctx, right, b.x + b.w, st.base, studioF(500, px), S.soft, 0, 'right');
  },
  goals(ctx, b, view, S) {
    const small = px => studioF(500, Math.max(22, Math.round(px * 0.36)));
    const g = studioGoalWeeks(view.heatSessions || [], view.when, 12);
    // Semana: anillo grande con el avance de flechas y días cumplidos.
    const top = studioWLabel(ctx, g && g.now.ok ? 'SEMANA CUMPLIDA' : 'ESTA SEMANA', b.x, b.y, S, null, g && g.now.ok ? S.acc : null);
    if (!g) { studioText(ctx, 'Sin plan semanal', b.x, top + 50, studioF(500, 26), S.soft, 0); return; }
    const w = g.now;
    const frac = w.met + '/' + w.planned;
    const px = Math.round(Math.min(S.statMax * 1.6, (b.h - S.labelPx - 20) * 0.85)), base = b.y + b.h - 6;
    const fit = studioFitValue(ctx, frac, b.x - 2, base, b.w * 0.3, px, S, w.ok ? S.acc : null);
    const mid = base - px * 0.36;
    const P = w.days.filter(d => d.planned), x0 = b.x + fit.w + 32, wAvail = b.x + b.w - x0, gap = 6, ph = Math.min(28, px * 0.42);
    const pw = (wAvail - (P.length - 1) * gap) / Math.max(1, P.length);
    P.forEach((d, i) => {
      const x = x0 + i * (pw + gap), r = ph / 2;
      ctx.beginPath();
      const L = i === 0, R = i === P.length - 1;
      ctx.moveTo(x + (L ? r : 3), mid - r); ctx.lineTo(x + pw - (R ? r : 3), mid - r);
      R ? ctx.arc(x + pw - r, mid, r, -Math.PI / 2, Math.PI / 2) : (ctx.quadraticCurveTo(x + pw, mid - r, x + pw, mid - r + 3), ctx.lineTo(x + pw, mid + r - 3), ctx.quadraticCurveTo(x + pw, mid + r, x + pw - 3, mid + r));
      ctx.lineTo(x + (L ? r : 3), mid + r);
      L ? ctx.arc(x + r, mid, r, Math.PI / 2, Math.PI * 1.5) : (ctx.quadraticCurveTo(x, mid + r, x, mid + r - 3), ctx.lineTo(x, mid - r + 3), ctx.quadraticCurveTo(x, mid - r, x + 3, mid - r));
      ctx.closePath();
      ctx.fillStyle = d.done ? S.acc : studioRgba(S.base, 0.1); ctx.fill();
    });
  },
  best(ctx, b, view, S) {
    const st = studioStack(b, S, S.statMax * (S.style === 'glass' ? 0.9 : 1.1));
    studioWLabel(ctx, (view.best && view.best.label) || 'MEJOR SERIE', b.x, st.top, S);
    if (!view.best) { studioFitValue(ctx, '–', b.x - 2, st.base, b.w, st.px, S); return; }
    const fit = studioFitValue(ctx, String(view.best.sum), b.x - 2, st.base, b.w * 0.5, st.px, S, S.acc);
    const capW = studioText(ctx, view.best.tag || 'S' + view.best.index, b.x + fit.w + 10, st.base, studioF(500, Math.max(25, Math.round(fit.px * 0.34))), S.soft);
    const vals = view.best.values || [];
    if (!vals.length) return;
    if (b.size !== 'wide') {
      const room = b.w - fit.w - capW - 40;
      const r = Math.min(24, b.h * 0.3, (room / vals.length - 8) / 2);
      if (r < 14) return;
      const step = r * 2 + 8;
      const cy = st.base - fit.px * 0.34;
      vals.forEach((v, i) => studioChip(ctx, b.x + b.w - r - (vals.length - 1 - i) * step, cy, r, v, S));
      return;
    }
    const x0 = b.x + fit.w + 120, w = b.x + b.w - x0;
    const r = Math.min(30, b.h * 0.3, (w / vals.length - 10) / 2);
    const step = r * 2 + Math.min(14, r * 0.5);
    const cy = st.base - fit.px * 0.36;
    vals.forEach((v, i) => studioChip(ctx, b.x + b.w - r - (vals.length - 1 - i) * step, cy, r, v, S));
  },
  precision(ctx, b, view, S) {
    const st = studioStack(b, S, S.statMax * (S.style === 'glass' ? 0.9 : 1.1), 28);
    studioWLabel(ctx, 'PRECISIÓN', b.x, st.top, S);
    const value = view.pct != null ? Math.round(view.pct * 100) + '%' : '–';
    const fit = studioFitValue(ctx, value, b.x - 2, st.base, b.w, st.px, S);
    if (b.size === 'wide' && view.scoreMax) studioText(ctx, view.scoreMain + ' de ' + view.scoreMax, b.x + b.w, st.base, studioF(500, Math.max(25, Math.round(fit.px * 0.32))), S.soft, 0, 'right');
    studioBar(ctx, b.x, st.bottom - 6, b.w, S.style === 'obsidian' ? 4 : 6, view.pct, S);
  },
  streak(ctx, b, view, S) {
    const run = view.streak || {seq: [], best: 0, start: -1, current: 0};
    const cap = S.style === 'editorial' ? 76 : S.style === 'obsidian' ? 84 : 96;
    const top = studioWLabel(ctx, 'MEJOR RACHA', b.x, b.y, S);
    const color = run.best ? S.acc : S.soft;
    if (b.size === 'wide') {
      const area = b.y + b.h - top - 14;
      const px = Math.round(Math.min(cap, (area - 4) / 0.76));
      const fit = studioFitValue(ctx, String(run.best), b.x - 2, b.y + b.h - (area - px * 0.72) / 2, b.w * 0.3, px, S, color);
      const x0 = b.x + fit.w + 40;
      studioTicks(ctx, x0, b.y + b.h - area, b.x + b.w - x0, area, run, S);
      return;
    }
    const stripH = Math.round(b.h * 0.44);
    const stripY = b.y + b.h - stripH;
    const px = Math.round(Math.min(cap, (stripY - top - 24) / 0.76));
    studioFitValue(ctx, String(run.best), b.x - 2, Math.min(stripY - 18, (top + stripY) / 2 + px * 0.37), b.w * 0.5, px, S, color);
    studioTicks(ctx, b.x, stripY, b.w, stripH, run, S);
  },
  train(ctx, b, view, S) {
    // Días entrenados por periodo: Año (calendario de 52 semanas), Mes (cuadrícula del mes) o Semana (7 días).
    const wide = b.size === 'wide', vr = b.widget.variant || 'year';
    const top = studioWLabel(ctx, 'DÍAS ENTRENADOS', b.x, b.y, S);
    const area = b.y + b.h - top - 12;
    const when = view.when || new Date();
    const probe = Studio.heatmap(view.heatSessions || [], when, 53);
    const byDay = new Map(probe.cells.map(c => [c.day, c]));
    const lvl = n => !n ? 0 : n >= 60 ? 4 : n >= 30 ? 3 : n >= 12 ? 2 : 1;
    let cells = [], C, R, cap;
    if (vr === 'week') {
      const mon = probe.today - (probe.today - probe.start) % 7;
      for (let i = 0; i < 7; i++) { const c = byDay.get(mon + i) || {n: 0}; cells.push({col: i, row: 0, n: c.n || 0, future: mon + i > probe.today}); }
      C = 7; R = 1; cap = wide ? 56 : 40;
    } else if (vr === 'month') {
      const d = new Date(when), first = new Date(d.getFullYear(), d.getMonth(), 1), days = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
      const s0 = StudioGoals.daySerial(first), off = (first.getDay() + 6) % 7;
      for (let i = 0; i < days; i++) { const k = off + i, c = byDay.get(s0 + i) || {n: 0}; cells.push({col: k % 7, row: Math.floor(k / 7), n: c.n || 0, future: s0 + i > probe.today}); }
      C = 7; R = Math.ceil((off + days) / 7); cap = wide ? 60 : 20;
    } else {
      cap = wide ? 22 : 18; R = 7; C = 53;
    }
    let x0 = b.x, w = b.w;
    const periodN = vr === 'year' ? probe.cells.filter(c => c.n > 0).length : cells.filter(c => c.n > 0).length;
    if (wide) {
      const px = Math.round(Math.min(S.style === 'editorial' ? 76 : 92, (area - 4) / 0.76));
      const fit = studioFitValue(ctx, String(periodN), b.x - 2, b.y + b.h - (area - px * 0.72) / 2, b.w * 0.26, px, S, periodN ? S.acc : S.soft);
      x0 = b.x + fit.w + 28; w = b.x + b.w - x0;
    } else {
      ctx.font = studioF(S.labelW, S.labelPx);
      const lblW = ctx.measureText('DÍAS ENTRENADOS').width * 1.15 + 10;
      let ct = periodN + (periodN === 1 ? ' día' : ' días');
      if (ctx.measureText(ct).width * 1.15 + lblW > b.w) ct = String(periodN);
      studioText(ctx, ct, b.x + b.w, top, studioF(S.labelW, S.labelPx), S.soft, S.labelTrack, 'right');
    }
    // Iniciales de día: cabecera en Semana/Mes, columna izquierda en Año.
    const dpx = Math.max(7, Math.round(S.labelPx * 0.85)), dF = studioF(S.labelW, dpx);
    const head = vr === 'year' ? 0 : dpx + 5;
    const ga = area - head;
    let s = Math.min(cap, (ga - (R - 1) * 3) / R), g = Math.max(2.5, s * 0.24);
    s = Math.min(cap, (ga - (R - 1) * g) / R);
    let side = 0;
    if (vr === 'year') {
      ctx.font = dF; side = s >= dpx * 0.9 ? ctx.measureText('X').width + 5 : 0;
      C = Math.max(4, Math.min(53, Math.floor((w - side + g) / (s + g))));
      Studio.heatmap(view.heatSessions || [], when, C).cells.forEach(c => cells.push({col: c.w, row: c.r, n: c.n, future: c.future}));
    } else { s = Math.min(s, (w - (C - 1) * g) / C); g = Math.max(2.5, s * 0.24); }
    // Mes ancho: celdas rectangulares para llenar el hueco horizontal.
    const cw = vr === 'month' && wide ? Math.max(s, Math.min(s * 2.4, (w * 0.9 - (C - 1) * g) / C)) : s;
    const gw = C * cw + (C - 1) * g, gh = R * s + (R - 1) * g;
    const gx = x0 + w - gw, gy = b.y + b.h - (area + gh + head) / 2 + head;
    ctx.save(); ctx.font = dF; ctx.fillStyle = studioRgba(S.base, 0.38); ctx.textBaseline = 'middle';
    if (vr === 'year') {
      if (side) { ctx.textAlign = 'right'; [0, 2, 4].forEach(r => ctx.fillText(STUDIO_DAYS[r], gx - 5, gy + r * (s + g) + s / 2)); }
    } else {
      ctx.textAlign = 'center';
      for (let i = 0; i < 7; i++) ctx.fillText(STUDIO_DAYS[i], gx + i * (cw + g) + cw / 2, gy - 5 - dpx / 2);
    }
    ctx.restore();
    const alpha = [0, 0.32, 0.55, 0.8, 1];
    cells.forEach(c => {
      if (c.future && vr === 'year') return;
      studioRound(ctx, gx + c.col * (cw + g), gy + c.row * (s + g), cw, s, Math.max(1.5, s * 0.24));
      const L = lvl(c.n);
      ctx.fillStyle = c.future ? studioRgba(S.base, 0.04) : L ? studioRgba(S.acc, alpha[L]) : studioRgba(S.base, 0.09);
      ctx.fill();
    });
  }
};
const STUDIO_DAYS = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
function studioArrowsSorted(sessions) {
  const out = [];
  (sessions || []).slice().sort((a, b) => a.id - b.id).forEach(s => (s.shots || []).forEach(x => {
    if (!x || x.candidate) return;
    const p = StudioScore.points(x.result && x.result.value);
    if (p != null) out.push({p, day: s.id});
  }));
  return out;
}
function studioRecent(sessions, variant, when) {
  const A = studioArrowsSorted(sessions), mean = a => a.length ? a.reduce((x, y) => x + y.p, 0) / a.length : null;
  let cur, prev;
  if (variant[0] === 'd') {
    const days = Number(variant.slice(1)) || 7, now = new Date(when || Date.now()).getTime(), span = days * 864e5;
    cur = A.filter(a => a.day > now - span); prev = A.filter(a => a.day <= now - span && a.day > now - 2 * span);
  } else {
    const n = Number(variant.slice(1)) || 30;
    cur = A.slice(-n); prev = A.slice(-2 * n, -n);
  }
  const k = Math.max(10, Math.round(A.length / 24)), spark = [];
  for (let i = k; i <= A.length; i += k) spark.push(mean(A.slice(i - k, i)));
  return {avg: mean(cur), prev: prev.length >= 5 ? mean(prev) : null, spark: spark.slice(-24)};
}
function studioWeek(sessions, when) {
  const d = new Date(when || Date.now()), m = new Date(d.getFullYear(), d.getMonth(), d.getDate()); m.setDate(m.getDate() - ((m.getDay() + 6) % 7));
  let sets = 0, arrows = 0;
  (sessions || []).forEach(s => { if (s.id < m.getTime()) return; const sh = (s.shots || []).filter(x => x && !x.candidate); arrows += sh.length; sets += new Set(sh.map(x => x.set_id)).size; });
  return {sets, arrows};
}
function studioGoalWeeks(sessions, when, n) {
  const plan = studioPlanMet(); if (!plan || !plan.days || !plan.days.length) return null;
  const pad = x => String(x).padStart(2, '0'), key = d => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  const by = {}; (sessions || []).forEach(s => { const c = (s.shots || []).filter(x => x && !x.candidate).length; if (!c) return; const k = key(new Date(s.id)); by[k] = (by[k] || 0) + c; });
  const now = new Date(when || Date.now()), mon = new Date(now.getFullYear(), now.getMonth(), now.getDate()); mon.setDate(mon.getDate() - ((mon.getDay() + 6) % 7));
  const okWeek = start => { let total = 0, met = 0; for (let i = 0; i < 7; i++) { const d = new Date(start); d.setDate(d.getDate() + i); const c = by[key(d)] || 0; total += c; if (plan.days.includes(i) && c >= plan.arrows) met++; } return total >= plan.days.length * plan.arrows && met >= plan.days.length; };
  const weeks = [];
  for (let k = n - 1; k >= 0; k--) { const s = new Date(mon); s.setDate(s.getDate() - 7 * k); weeks.push({ok: okWeek(s), current: k === 0}); }
  let streak = 0; const s = new Date(mon); if (!okWeek(s)) s.setDate(s.getDate() - 7);
  for (let k = 0; k < 104 && okWeek(s); k++) { streak++; s.setDate(s.getDate() - 7); }
  const today = (now.getDay() + 6) % 7, cur = (() => { let total = 0, met = 0; const days = []; for (let i = 0; i < 7; i++) { const d = new Date(mon); d.setDate(d.getDate() + i); const c = by[key(d)] || 0; total += c; const planned = plan.days.includes(i); if (planned && c >= plan.arrows) met++; days.push({n: c, planned, done: planned && c >= plan.arrows, future: i > today}); } return {days, total, met, planned: plan.days.length, goal: plan.days.length * plan.arrows, ok: okWeek(mon)}; })();
  return {weeks, streak, now: cur};
}
function studioPlanMet() {
  let plan = null; try { plan = JSON.parse(localStorage.getItem('atPlan')); } catch (e) {}
  return plan && plan.arrows ? plan : null;
}
function studioTicks(ctx, x, y, w, h, run, S) {
  const seq = run.seq || [], n = seq.length;
  if (!n) return;
  const gap = Math.max(3, Math.min(7, (w / n) * 0.3));
  const tw = Math.min(24, (w - gap * (n - 1)) / n);
  const x0 = x + (w - (n * tw + gap * (n - 1))) / 2;
  const lift = g => g === 'x10' ? 1 : g === '98' ? 0.6 : g === 'low' ? 0.36 : 0.2;
  seq.forEach((a, i) => {
    const on = i >= run.start && i < run.start + run.best;
    const th = Math.max(Math.min(tw, 14), h * lift(a.group));
    const tx = x0 + i * (tw + gap), ty = y + h - th;
    ctx.save();
    if (on && S.glow) { ctx.shadowColor = studioRgba(S.acc, 0.6); ctx.shadowBlur = 18; }
    studioRound(ctx, tx, ty, tw, th, Math.min(tw / 2, 7));
    if (on) {
      const g = ctx.createLinearGradient(0, ty, 0, ty + th);
      g.addColorStop(0, S.acc2);
      g.addColorStop(1, S.acc);
      ctx.fillStyle = g;
    } else ctx.fillStyle = studioRgba(S.base, a.group === 'x10' ? 0.38 : a.group === '98' ? 0.2 : 0.1);
    ctx.fill();
    ctx.restore();
  });
}
function studioDayPill(ctx, cx, cy, r, c, letter, S) {
  ctx.save();
  studioRound(ctx, cx - r, cy - r, r * 2, r * 2, r * 0.5);
  if (c.run) {
    if (S.glow) { ctx.shadowColor = studioRgba(S.acc, 0.55); ctx.shadowBlur = 16; }
    const g = ctx.createLinearGradient(cx, cy - r, cx, cy + r);
    g.addColorStop(0, S.acc2);
    g.addColorStop(1, S.acc);
    ctx.fillStyle = g;
    ctx.fill();
  } else if (c.on) {
    ctx.fillStyle = studioRgba(S.base, S.style === 'editorial' ? 0.14 : 0.16);
    ctx.fill();
  } else {
    ctx.lineWidth = 2;
    ctx.setLineDash(c.future ? [3, 5] : c.today ? [5, 4] : []);
    ctx.strokeStyle = c.today ? studioRgba(S.acc, 0.8) : studioRgba(S.base, c.future ? 0.12 : 0.18);
    ctx.stroke();
  }
  ctx.restore();
  const ink = c.run ? S.chipInk : c.on ? S.ink : c.future ? studioRgba(S.base, 0.28) : S.soft;
  studioText(ctx, letter, cx, cy + r * 0.34, studioF(c.run ? 700 : 600, Math.round(r * 0.84)), ink, 0, 'center');
}
function studioDayCell(ctx, x, y, w, h, c, S) {
  ctx.save();
  studioRound(ctx, x, y, w, h, Math.min(8, h * 0.3));
  if (c.run) {
    if (S.glow) { ctx.shadowColor = studioRgba(S.acc, 0.55); ctx.shadowBlur = 14; }
    ctx.fillStyle = S.acc;
    ctx.fill();
  } else if (c.on) {
    ctx.fillStyle = studioRgba(S.base, Math.min(0.42, 0.2 + c.n / 200));
    ctx.fill();
  } else if (c.future) {
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = studioRgba(S.base, 0.08);
    ctx.stroke();
  } else {
    ctx.fillStyle = studioRgba(S.base, S.style === 'editorial' ? 0.07 : 0.06);
    ctx.fill();
  }
  ctx.restore();
  if (!c.today) return;
  studioRound(ctx, x - 4, y - 4, w + 8, h + 8, Math.min(11, h * 0.4));
  ctx.lineWidth = 2;
  ctx.strokeStyle = studioRgba(S.ink, 0.7);
  ctx.stroke();
}
function studioAvgBars(ctx, b, series, S) {
  const top = studioWLabel(ctx, series.title, b.x, b.y, S);
  const items = series.items || [];
  if (!items.length) { studioText(ctx, 'Sin puntuación', b.x, top + 44, studioF(500, 21), S.soft); return; }
  const lo = Math.min(...items.map(i => i.sum)) - 0.3, hi = Math.max(...items.map(i => i.sum));
  const n = items.length, bw = Math.min(b.size === 'wide' ? 34 : 26, b.w / (n * 1.8));
  const step = n > 1 ? (b.w - bw) / (n - 1) : 0;
  const plotTop = top + 40, plotBot = b.y + b.h - 30;
  const best = items.reduce((k, it, i) => it.sum > items[k].sum ? i : k, 0);
  items.forEach((it, i) => {
    const x = b.x + step * i;
    const hh = Math.max(bw * 0.6, (plotBot - plotTop) * (0.12 + 0.88 * (it.sum - lo) / Math.max(0.1, hi - lo)));
    ctx.save();
    if (i === best && S.glow) { ctx.shadowColor = studioRgba(S.acc, 0.45); ctx.shadowBlur = 16; }
    studioRound(ctx, x, plotBot - hh, bw, hh, bw / 2);
    ctx.fillStyle = i === best ? S.acc : S.bar;
    ctx.fill();
    ctx.restore();
    if (i === best || i === n - 1) studioText(ctx, it.sum.toFixed(1).replace('.', ','), x + bw / 2, plotBot - hh - 10, studioF(600, 22, S.style === 'glass' ? studioNum : studioGeist), i === best ? S.acc : S.soft, 0, 'center');
    if (i % 2 === (n - 1) % 2) studioText(ctx, it.label, x + bw / 2, b.y + b.h, studioF(500, 18), S.soft, 0, 'center');
  });
}
function studioFooter(ctx, view, L, R, y, px, color) {
  const p = Studio.profile();
  const first = view.isProfile && typeof studioSessions === 'function' ? studioSessions()[0] : null;
  const left = view.isProfile ? (first ? 'DESDE ' + studioCornerDate(first.id) : '') : [p.name, p.club].filter(Boolean).join(' · ').toUpperCase();
  const right = (view.serial || '').toUpperCase();
  const rw = right ? studioText(ctx, right, R, y, studioF(500, px), color, 3, 'right') : 0;
  if (!left) return;
  const font = studioF(500, px);
  let text = left;
  while (text.length > 4 && studioTextWidth(ctx, text, font, 3) > R - L - rw - 40) text = text.slice(0, -2).trimEnd() + '…';
  studioText(ctx, text, L, y, font, color, 3);
}
function studioWidgets(ctx, style, view, theme) {
  const S = studioTokens(style, theme);
  const layout = Studio.cardRows(style, Studio.cardConfig(style));
  const area = Studio.CARD_AREAS[style];
  const rects = [];
  layout.rows.forEach((row, r) => {
    const open = row.items.every(it => it.widget.id === 'score' || it.widget.id === 'stats');
    if (r && (S.panel === 'none' || (S.panel === 'block' && open))) {
      ctx.fillStyle = S.hair;
      ctx.fillRect(area.x, row.y - (row.y - layout.rows[r - 1].y - layout.rows[r - 1].h) / 2, area.w, 1.5);
    }
    if (row.items.length > 1 && S.panel === 'block' && open) {
      ctx.fillStyle = S.hair;
      ctx.fillRect(row.items[1].x - area.colGap / 2, row.y + 6, 1.5, row.h - 12);
    }
    row.items.forEach(it => {
      rects.push({index: it.index, x: it.x, y: it.y, w: it.w, h: it.h});
      const boxed = S.panel === 'glass' || (S.panel === 'block' && it.widget.id !== 'score' && it.widget.id !== 'stats');
      if (S.panel === 'glass') studioPanel(ctx, it.x, it.y, it.w, it.h, Math.min(36, it.h / 3.6), S.fill, S.hair);
      else if (boxed) {
        studioRound(ctx, it.x, it.y, it.w, it.h, 24);
        ctx.fillStyle = S.block;
        ctx.fill();
      }
      const chart = it.widget.id === 'dist' || it.widget.id === 'series';
      const pad = boxed ? (S.panel === 'glass' ? (chart ? 22 : S.pad + 4) : (chart ? 18 : 24)) * Math.min(1, it.h / 150) : 0;
      const padX = boxed ? S.pad + (S.panel === 'glass' ? 4 : 0) : 0;
      const b = {x: it.x + padX, y: it.y + pad, w: it.w - padX * 2, h: it.h - pad * 2, size: it.size, widget: it.widget};
      const paint = studioWidgetPaint[it.widget.id];
      ctx.save();
      if (paint) paint(ctx, b, view, S);
      ctx.restore();
    });
  });
  Studio.card.rects = rects;
  return layout;
}

// Grano: motas claras y oscuras con transparencia, pintadas en modo normal. Antes era ruido gris en
// 'overlay'/'multiply' al 5–7 %: sobre fondo negro esas mezclas no cambian nada, y con granos de 1 px
// la vista previa (≈3× más pequeña) y la compresión JPEG lo borraban del todo.
function studioGrain(ctx, x, y, w, h, alpha) {
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
}
function studioFoil(ctx, x0, y0, x1, y1, tilt, acc, alpha) {
  const t = Math.max(-1, Math.min(1, ((tilt && tilt.y) || 0) / 12)) * 0.18;
  const g = ctx.createLinearGradient(x0, y0, x1, y1);
  [[0, acc, 0.9], [0.22 + t, '#ffe7c2', 0.55], [0.4 + t, '#9ff3ff', 0.42], [0.58 + t, '#e6b3ff', 0.42], [0.78 + t, '#fff2d6', 0.3], [1, acc, 0.5]]
    .forEach(s => g.addColorStop(Math.max(0, Math.min(1, s[0])), studioRgba(s[1], s[2] * alpha)));
  return g;
}
function studioMark(ctx, cx, cy, color, acc) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 2.2;
  [12, 5.6].forEach(k => { ctx.beginPath(); ctx.arc(cx, cy, k, 0, Math.PI * 2); ctx.stroke(); });
  ctx.beginPath();
  ctx.arc(cx, cy, 2.4, 0, Math.PI * 2);
  ctx.shadowColor = studioRgba(acc, 0.9);
  ctx.shadowBlur = 12;
  ctx.fillStyle = acc;
  ctx.fill();
  ctx.restore();
}

function studioPaintGlass(ctx, view, theme, tilt, photo) {
  const W = 1080, H = 1350, acc = theme.acc;
  const cfg = Studio.cardConfig('glass');
  const top = Studio.CARD_AREAS.glass.top[cfg.photo] || Studio.CARD_AREAS.glass.top.tall;
  const shot = cfg.photo === 'none' ? null : photo;
  const fx = cfg.fx || {};
  const duo = fx.duo ? acc : '';
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, W, H);
  if (shot) {
    ctx.save();
    ctx.filter = 'blur(46px)';
    ctx.globalAlpha = 0.48;
    ctx.drawImage(studioPhotoCanvas(shot, view.photo, 540, 675, {focus: view.focus, bright: 0.52, duo}), -90, -90, W + 180, H + 180);
    ctx.restore();
  }
  // Atmósfera tipo Nothing (difuminado): nubes neutras muy suaves fuera del lienzo y un solo
  // rescoldo del acento, casi apagado. Sin focos saturados en las esquinas.
  const accRgb = studioRgb(acc).join(',');
  [[W * 0.0, H * 0.08, W * 0.8, '230,230,234', 0.15],
   [W * 1.0, H * 0.92, W * 0.74, '128,130,136', 0.12],
   [W * 0.48, H * 0.55, W * 1.0, '64,66,72', 0.07],
   [W * 0.92, H * 0.04, W * 0.3, accRgb, 0.05]].forEach(b => {
    const g = ctx.createRadialGradient(b[0], b[1], 0, b[0], b[1], b[2]);
    g.addColorStop(0, `rgba(${b[3]},${b[4]})`);
    g.addColorStop(0.35, `rgba(${b[3]},${(b[4] * 0.5).toFixed(3)})`);
    g.addColorStop(1, `rgba(${b[3]},0)`);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  });
  const vig = ctx.createRadialGradient(W * 0.5, H * 0.42, Math.min(W, H) * 0.2, W * 0.5, H * 0.5, Math.max(W, H) * 0.72);
  vig.addColorStop(0, 'rgba(0,0,0,0)');
  vig.addColorStop(1, 'rgba(0,0,0,0.52)');
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, W, H);
  const cx = 60, cy = 60, cw = 960, ch = 1230, r = 52;
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,.75)';
  ctx.shadowBlur = 90;
  ctx.shadowOffsetY = 30;
  studioRound(ctx, cx, cy, cw, ch, r);
  ctx.fillStyle = '#0b0b0d';
  ctx.fill();
  ctx.restore();
  ctx.save();
  studioRound(ctx, cx, cy, cw, ch, r);
  ctx.clip();
  const base = ctx.createLinearGradient(0, cy, 0, cy + ch);
  base.addColorStop(0, '#141417');
  base.addColorStop(1, '#09090b');
  ctx.fillStyle = base;
  ctx.fillRect(cx, cy, cw, ch);
  if (shot) ctx.drawImage(studioPhotoCanvas(shot, view.photo, cw, top - 28, {focus: view.focus, bright: 0.72, fade: 0.4, duo}), cx, cy);
  const warm = ctx.createRadialGradient(cx, cy + ch, 0, cx, cy + ch, 720);
  warm.addColorStop(0, studioRgba(acc, 0.07));
  warm.addColorStop(1, studioRgba(acc, 0));
  ctx.fillStyle = warm;
  ctx.fillRect(cx, cy, cw, ch);
  const topShade = ctx.createLinearGradient(0, cy, 0, cy + 200);
  topShade.addColorStop(0, 'rgba(0,0,0,.5)');
  topShade.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = topShade;
  ctx.fillRect(cx, cy, cw, 200);
  const L = cx + 56, R = cx + cw - 56;
  if (fx.mark) studioMark(ctx, L + 12, cy + 82, 'rgba(255,255,255,.92)', acc);
  else {
    ctx.save();
    ctx.beginPath();
    ctx.arc(L + 6, cy + 82, 6.5, 0, Math.PI * 2);
    ctx.fillStyle = acc;
    ctx.shadowColor = studioRgba(acc, 0.8);
    ctx.shadowBlur = 16;
    ctx.fill();
    ctx.restore();
  }
  studioText(ctx, 'ARCHERY TRACE', L + (fx.mark ? 40 : 26), cy + 90, studioF(600, 21), 'rgba(255,255,255,.92)', 4);
  studioText(ctx, view.date, R, cy + 90, studioF(500, 21), 'rgba(255,255,255,.72)', 3, 'right');
  if (view.isProfile) studioProfileHead(ctx, 'glass', view, {L, R, top, ink: '#ffffff', soft: 'rgba(255,255,255,.66)', bg: '#1a1a1e'});
  else {
    studioText(ctx, view.kicker, L, top - 170, studioF(500, 22), studioMix(acc, '#ffffff', 0.25), 4);
    const hpx = studioFitPx(ctx, view.headline, cw - 112, 78, 400, 48, -2.5);
    studioText(ctx, view.headline, L - 3, top - 86, studioF(400, hpx), '#ffffff', -2.5);
    studioText(ctx, view.title, L, top - 36, studioF(400, 31), 'rgba(255,255,255,.66)');
  }
  studioWidgets(ctx, 'glass', view, theme);
  if (fx.grain) studioGrain(ctx, cx, cy, cw, ch, 0.07, 'overlay');
  studioCardSheen(ctx, cx, cy, cw, ch, r, tilt, 0.05, acc);
  ctx.restore();
  let rim = ctx.createLinearGradient(cx, cy, cx + cw, cy + ch);
  rim.addColorStop(0, studioRgba(acc, 0.6));
  rim.addColorStop(0.32, 'rgba(255,255,255,.1)');
  rim.addColorStop(1, 'rgba(255,255,255,.05)');
  if (fx.foil) rim = studioFoil(ctx, cx, cy, cx + cw, cy + ch, tilt, acc, 1);
  studioRound(ctx, cx + 0.75, cy + 0.75, cw - 1.5, ch - 1.5, r);
  ctx.strokeStyle = rim;
  ctx.lineWidth = fx.foil ? 2.2 : 1.5;
  ctx.stroke();
  if (fx.foot) studioFooter(ctx, view, L, R, cy + ch + 41, 20, 'rgba(255,255,255,.5)');
}

function studioPaintEditorial(ctx, view, theme, tilt, photo) {
  const W = 1080, H = 1350, acc = theme.acc;
  const cream = '#f7f3ec', ink = '#1c1b19', soft = '#7a746b', hair = 'rgba(28,27,25,.09)';
  const cfg = Studio.cardConfig('editorial');
  const top = Studio.CARD_AREAS.editorial.top[cfg.photo] || Studio.CARD_AREAS.editorial.top.tall;
  const shot = cfg.photo === 'none' ? null : photo;
  const fx = cfg.fx || {};
  const duo = fx.duo ? acc : '';
  ctx.fillStyle = '#3a3936';
  ctx.fillRect(0, 0, W, H);
  if (shot) {
    ctx.save();
    ctx.filter = 'blur(34px)';
    ctx.drawImage(studioPhotoCanvas(shot, view.photo, 540, 675, {focus: view.focus, bright: 0.74, duo}), -60, -60, W + 120, H + 120);
    ctx.restore();
  }
  ctx.fillStyle = 'rgba(24,23,21,.24)';
  ctx.fillRect(0, 0, W, H);
  const cx = 104, cy = 40, cw = 872, ch = 1270, r = 40;
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,.4)';
  ctx.shadowBlur = 70;
  ctx.shadowOffsetY = 28;
  studioRound(ctx, cx, cy, cw, ch, r);
  ctx.fillStyle = cream;
  ctx.fill();
  ctx.restore();
  ctx.save();
  studioRound(ctx, cx, cy, cw, ch, r);
  ctx.clip();
  const pt = top - 200;
  const framed = cfg.photo !== 'none';
  if (framed) {
    const ph = pt - cy + 40;
    if (shot) ctx.drawImage(studioPhotoCanvas(shot, view.photo, cw, ph, {focus: view.focus, bright: 0.74, tint: 'rgba(150,140,120,.4)', duo}), cx, cy);
    else {
      ctx.fillStyle = '#4a4844';
      ctx.fillRect(cx, cy, cw, ph);
    }
    const shade = ctx.createLinearGradient(0, cy, 0, cy + 200);
    shade.addColorStop(0, 'rgba(10,10,10,.42)');
    shade.addColorStop(1, 'rgba(10,10,10,0)');
    ctx.fillStyle = shade;
    ctx.fillRect(cx, cy, cw, 200);
    const pg = ctx.createLinearGradient(0, pt - 90, 0, pt + 10);
    pg.addColorStop(0, 'rgba(0,0,0,0)');
    pg.addColorStop(1, 'rgba(0,0,0,.24)');
    ctx.fillStyle = pg;
    ctx.fillRect(cx, pt - 90, cw, 100);
    studioRound(ctx, cx, pt, cw, ch, 34);
    ctx.fillStyle = cream;
    ctx.fill();
  }
  const L = cx + 56, R = cx + cw - 56;
  const mark = framed ? 'rgba(255,255,255,.92)' : ink;
  ctx.save();
  ctx.strokeStyle = mark;
  ctx.lineWidth = 2.2;
  [17, 8].forEach(k => {
    ctx.beginPath();
    ctx.arc(L + 18, cy + 76, k, 0, Math.PI * 2);
    ctx.stroke();
  });
  ctx.beginPath();
  ctx.arc(L + 18, cy + 76, 2.6, 0, Math.PI * 2);
  ctx.fillStyle = acc;
  ctx.fill();
  ctx.restore();
  studioText(ctx, 'ARCHERY TRACE', L + 50, cy + 83, studioF(600, 20), framed ? 'rgba(255,255,255,.95)' : ink, 4.5);
  if (view.isProfile) studioProfileHead(ctx, 'editorial', view, {L, R, pt, ink, soft, bg: '#e7e0d4'});
  else {
    const tpx = studioFitPx(ctx, view.headline, 560, 58, 750, 36, -1);
    studioText(ctx, view.headline, L - 2, pt + 94, studioF(750, tpx), ink, -1);
    studioText(ctx, view.title, L, pt + 140, studioF(400, 30), soft);
    studioText(ctx, view.day, R, pt + 92, studioF(300, 64), acc, -1, 'right');
    studioText(ctx, view.monthYear, R, pt + 128, studioF(600, 19), soft, 3, 'right');
  }
  ctx.fillStyle = hair;
  ctx.fillRect(L, pt + 180, R - L, 1.5);
  studioWidgets(ctx, 'editorial', view, theme);
  if (fx.foot) studioFooter(ctx, view, L, R, 1293, 18, '#9a948a');
  if (fx.grain) studioGrain(ctx, cx, cy, cw, ch, 0.06, 'multiply');
  ctx.restore();
  if (fx.foil) {
    studioRound(ctx, cx + 1, cy + 1, cw - 2, ch - 2, r);
    ctx.strokeStyle = studioFoil(ctx, cx, cy, cx + cw, cy + ch, tilt, acc, 0.9);
    ctx.lineWidth = 2.4;
    ctx.stroke();
  }
}

function studioRandom(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function studioValueNoise(rnd) {
  const perm = new Uint8Array(512), val = new Float32Array(256);
  for (let i = 0; i < 256; i++) { perm[i] = i; val[i] = rnd(); }
  for (let i = 255; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); const t = perm[i]; perm[i] = perm[j]; perm[j] = t; }
  for (let i = 0; i < 256; i++) perm[i + 256] = perm[i];
  const at = (x, y) => val[perm[(x & 255) + perm[y & 255]]];
  return (x, y) => {
    const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
    const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
    const a = at(xi, yi), b = at(xi + 1, yi), c = at(xi, yi + 1), d = at(xi + 1, yi + 1);
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  };
}
// Obsidian: smoky mottling, conchoidal ripples, faint veins and mineral flecks under a polished sheen.
function studioStone(w, h, acc) {
  const key = w + 'x' + h + ':' + acc;
  const cache = Studio.card.stone || (Studio.card.stone = {});
  if (cache.key === key) return cache.canvas;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const x = c.getContext('2d');
  const rnd = studioRandom(1307);
  const base = x.createLinearGradient(0, 0, w * 0.45, h);
  base.addColorStop(0, '#111113');
  base.addColorStop(0.55, '#0a0a0c');
  base.addColorStop(1, '#050506');
  x.fillStyle = base;
  x.fillRect(0, 0, w, h);
  const noise = studioValueNoise(rnd);
  const fbm = (px, py) => {
    let sum = 0, amp = 0.5, f = 1;
    for (let o = 0; o < 5; o++) { sum += amp * noise(px * f, py * f); f *= 2.03; amp *= 0.5; }
    return sum;
  };
  const k = 3, lw = Math.ceil(w / k), lh = Math.ceil(h / k);
  const low = document.createElement('canvas');
  low.width = lw;
  low.height = lh;
  const lx = low.getContext('2d');
  const img = lx.createImageData(lw, lh);
  const s = 2.3 / lw;
  for (let j = 0; j < lh; j++) {
    for (let i = 0; i < lw; i++) {
      const px = i * s, py = j * s;
      const qx = fbm(px * 1.4, py * 1.4), qy = fbm(px * 1.4 + 5.2, py * 1.4 + 1.3);
      const body = fbm(px + 2.4 * qx, py + 2.4 * qy);
      const ridge = 1 - Math.abs(2 * fbm(px * 1.25 + 2.6 * qx + 1.7, py * 1.25 + 2.6 * qy + 9.2) - 1);
      const vein = Math.pow(ridge, 34);
      const haze = Math.pow(Math.max(0, body - 0.35), 1.6);
      const lum = haze * 64 + vein * 26;
      const o = (j * lw + i) * 4;
      img.data[o] = lum;
      img.data[o + 1] = lum;
      img.data[o + 2] = lum * 1.06;
      img.data[o + 3] = 255;
    }
  }
  lx.putImageData(img, 0, 0);
  x.save();
  x.imageSmoothingEnabled = true;
  x.imageSmoothingQuality = 'high';
  x.globalCompositeOperation = 'lighter';
  x.drawImage(low, 0, 0, lw * k, lh * k);
  x.restore();
  for (let i = 0; i < 1400; i++) {
    const px = rnd() * w, py = rnd() * h, s = 0.4 + rnd() * rnd() * 1.6;
    x.beginPath();
    x.arc(px, py, s, 0, Math.PI * 2);
    x.fillStyle = 'rgba(214,214,222,' + (0.04 + rnd() * rnd() * 0.22).toFixed(3) + ')';
    x.fill();
  }
  const grain = x.getImageData(0, 0, w, h);
  const d = grain.data;
  for (let i = 0; i < d.length; i += 4) {
    const n = (rnd() - 0.5) * 7;
    d[i] += n;
    d[i + 1] += n;
    d[i + 2] += n;
  }
  x.putImageData(grain, 0, 0);
  const polish = x.createLinearGradient(w * 0.05, 0, w * 0.75, h * 0.6);
  polish.addColorStop(0, 'rgba(255,255,255,0)');
  polish.addColorStop(0.42, 'rgba(255,255,255,.035)');
  polish.addColorStop(0.5, 'rgba(255,255,255,.06)');
  polish.addColorStop(0.58, 'rgba(255,255,255,.02)');
  polish.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = polish;
  x.fillRect(0, 0, w, h);
  const glow = x.createRadialGradient(w * 0.8, h * 0.88, 0, w * 0.8, h * 0.88, w * 0.7);
  glow.addColorStop(0, studioRgba(acc, 0.06));
  glow.addColorStop(1, studioRgba(acc, 0));
  x.fillStyle = glow;
  x.fillRect(0, 0, w, h);
  const depth = x.createRadialGradient(w / 2, h * 0.55, Math.min(w, h) * 0.35, w / 2, h * 0.55, Math.max(w, h) * 0.78);
  depth.addColorStop(0, 'rgba(0,0,0,0)');
  depth.addColorStop(1, 'rgba(0,0,0,.55)');
  x.fillStyle = depth;
  x.fillRect(0, 0, w, h);
  cache.key = key;
  cache.canvas = c;
  return c;
}

function studioPaintObsidian(ctx, view, theme, tilt, photo) {
  const W = 1080, H = 1350, acc = theme.acc;
  const ink = '#f1efea';
  const cfg = Studio.cardConfig('obsidian');
  const top = Studio.CARD_AREAS.obsidian.top[cfg.photo] || Studio.CARD_AREAS.obsidian.top.tall;
  const fx = cfg.fx || {};
  const stone = studioStone(W, H, acc);
  ctx.drawImage(stone, 0, 0);
  const ph = cfg.photo === 'tall' ? 760 : cfg.photo === 'short' ? 560 : 0;
  if (photo && ph) {
    const shot = studioPhotoCanvas(photo, view.photo, W, ph, {focus: view.focus, bright: 0.66, fade: 0.4, duo: fx.duo ? acc : ''});
    const lay = document.createElement('canvas');
    lay.width = W;
    lay.height = ph;
    const lx = lay.getContext('2d');
    lx.drawImage(shot, 0, 0);
    lx.globalCompositeOperation = 'soft-light';
    lx.globalAlpha = 0.28;
    lx.drawImage(stone, 0, 0, W, ph, 0, 0, W, ph);
    lx.globalAlpha = 1;
    lx.globalCompositeOperation = 'destination-in';
    lx.drawImage(shot, 0, 0);
    ctx.drawImage(lay, 0, 0);
  }
  const shade = ctx.createLinearGradient(0, 0, 0, 220);
  shade.addColorStop(0, 'rgba(0,0,0,.45)');
  shade.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = shade;
  ctx.fillRect(0, 0, W, 220);
  const L = 84, R = W - 84;
  if (fx.mark) studioMark(ctx, L + 12, 91, 'rgba(255,255,255,.88)', acc);
  studioText(ctx, 'ARCHERY TRACE', L + (fx.mark ? 40 : 0), 98, studioF(600, 21), 'rgba(255,255,255,.88)', 5);
  studioText(ctx, view.date, R, 98, studioF(500, 21), 'rgba(255,255,255,.72)', 3.5, 'right');
  if (view.isProfile) studioProfileHead(ctx, 'obsidian', view, {L, R, top, ink, kicker: studioMix(acc, '#ffffff', 0.2), bg: '#141416'});
  else {
    studioText(ctx, view.kicker, L, top - 114, studioF(600, 21), studioMix(acc, '#ffffff', 0.2), 4.5);
    const tpx = studioFitPx(ctx, view.title, R - L, 56, 300, 34, -0.5);
    studioText(ctx, view.title, L - 2, top - 46, studioF(300, tpx), ink, -0.5);
  }
  studioWidgets(ctx, 'obsidian', view, theme);
  if (fx.foot) studioFooter(ctx, view, L, R, 1312, 19, 'rgba(255,255,255,.46)');
  if (fx.grain) studioGrain(ctx, 0, 0, W, H, 0.05, 'overlay');
  studioCardSheen(ctx, 0, 0, W, H, 0, tilt, 0.05, acc);
  if (fx.foil) {
    studioRound(ctx, 28, 28, W - 56, H - 56, 34);
    ctx.strokeStyle = studioFoil(ctx, 0, 0, W, H, tilt, acc, 0.75);
    ctx.lineWidth = 1.6;
    ctx.stroke();
  }
  const rim = ctx.createLinearGradient(0, 0, 0, 3);
  rim.addColorStop(0, 'rgba(255,255,255,.16)');
  rim.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = rim;
  ctx.fillRect(0, 0, W, 3);
}

function studioPaintCard(ctx, w, h, layout) {
  const view = studioCardView(layout || Studio.card.layout);
  const theme = Studio.theme();
  const style = Studio.FINISHES.some(f => f.id === Studio.card.finish) ? Studio.card.finish : Studio.FINISHES[0].id;
  const tilt = Studio.card.tilt || {x: 0, y: 0};
  const s = w / 1080;
  studioFace(ctx);
  ctx.setTransform(s, 0, 0, s, 0, 0);
  ctx.clearRect(0, 0, 1080, 1350);
  const photo = studioHeaderImage(view.photo);
  if (style === 'editorial') studioPaintEditorial(ctx, view, theme, tilt, photo);
  else if (style === 'obsidian') studioPaintObsidian(ctx, view, theme, tilt, photo);
  else studioPaintGlass(ctx, view, theme, tilt, photo);
  ctx.setTransform(1, 0, 0, 1, 0, 0);
}

function studioPaintThumbs() {
  const host = document.getElementById('shareThumbs');
  if (!host || host.childElementCount === Studio.LAYOUTS.length) return;
  host.innerHTML = Studio.LAYOUTS.map(t => `<button type="button" role="tab" data-layout="${t.id}">${t.name}</button>`).join('');
}

function studioDrawShare(withThumbs) {
  const canvas = document.getElementById('shareCanvas');
  if (!canvas) return;
  const size = Studio.SIZES.card;
  if (canvas.width !== size.w) canvas.width = size.w;
  if (canvas.height !== size.h) canvas.height = size.h;
  studioPaintCard(canvas.getContext('2d'), size.w, size.h, Studio.card.layout);
  if (withThumbs !== false) studioPaintThumbs();
  studioSyncShare();
}

async function studioExport() {
  const canvas = document.getElementById('shareCanvas');
  if (!canvas) return;
  await studioPhotoReady();
  const tilt = {...(Studio.card.tilt || {x: 0, y: 0})};
  Studio.card.tilt = {x: -6, y: 10};
  studioDrawShare(false);
  let png = '';
  try { png = canvas.toDataURL('image/png'); } catch (e) {}
  Studio.card.tilt = tilt;
  if (!png) {
    if (Studio.shareOpen) studioDrawShare(false);
    if (typeof notice === 'function') notice('No se pudo crear la imagen');
    return;
  }
  if (Studio.shareOpen) studioDrawShare(false);
  const raw = png.split(',')[1] || '';
  if (window.Native && Native.sharePng) { Native.sharePng(raw); return; }
  try {
    const blob = await (await fetch(png)).blob();
    const file = new File([blob], 'archerytrace.png', {type: 'image/png'});
    if (navigator.share && (!navigator.canShare || navigator.canShare({files: [file]}))) {
      await navigator.share({files: [file], title: 'ArcheryTrace'});
      return;
    }
  } catch (e) {}
  const a = document.createElement('a');
  a.href = png;
  a.download = 'archerytrace.png';
  a.click();
}

studioMount();
