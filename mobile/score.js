/* Valor de la flecha, aparte de la estabilidad aim_score.
   Diana reducida de compuesto: centro (0,0), y hacia abajo, radio 1 = anillo 6.
   La X es la mitad interior del 10. Fuera del 6 es M. */
const Score = {
  VALUES: ['X', '10', '9', '8', '7', '6', 'M'],
  // Indoor de compuesto. El 8, el 7, el 6 y la M están en los tres.
  // World Archery: el interior es 10, sin X. Vegas: la X vale 10 y se cuenta aparte. Lancaster: ese anillo vale 11.
  FORMATS: {
    wa: {id: 'wa', name: 'World Archery', values: ['10', '9', '8', '7', '6', 'M']},
    vegas: {id: 'vegas', name: 'Vegas', values: ['X', '10', '9', '8', '7', '6', 'M']},
    lancaster: {id: 'lancaster', name: 'Lancaster', values: ['11', '10', '9', '8', '7', '6', 'M']}
  },
  DEFAULT_FORMAT: 'vegas',
  GROUPS: [{id: 'x10', label: 'X-10'}, {id: '98', label: '9-8'}, {id: 'low', label: '≤7'}, {id: 'm', label: 'M'}],
  MIN: 4,
  FACE: 1.04,
  SPLIT: 20,
  // Sin formato guardado, una indoor antigua es Vegas: esas flechas usan X.
  formatOf(session) {
    if (!session || session.mode !== 'Indoor') return null;
    const stored = session.scoreFormat;
    if (stored === 'wa' || stored === 'vegas' || stored === 'lancaster') return stored;
    return this.DEFAULT_FORMAT;
  },
  arrowMax(format) {
    return format === 'lancaster' ? 11 : 10;
  },
  roundMax(shots, format) {
    const n = (shots || []).filter(s => s && !s.candidate).length;
    return n * this.arrowMax(format);
  },
  valuesFor(session) {
    const format = this.formatOf(session);
    return format ? this.FORMATS[format].values : this.VALUES;
  },
  // La línea cuenta en el anillo mayor. Cada anillo 10..6 ocupa 0,2. El centro (0,1) es X, 11 o el propio 10.
  valueAt(x, y, format) {
    if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
    const r = Math.hypot(x, y);
    if (r > 1) return 'M';
    if (format === 'wa') {
      if (r <= 0.2) return '10';
      const ring = 11 - Math.ceil(r * 5);
      return ring >= 6 && ring <= 9 ? String(ring) : 'M';
    }
    if (format === 'lancaster' && r <= 0.1) return '11';
    if (r <= 0.1) return 'X';
    const ring = 11 - Math.ceil(r * 5);
    return ring >= 6 && ring <= 10 ? String(ring) : null;
  },
  place(shot, x, y, format) {
    if (!shot || shot.candidate || !Number.isFinite(x) || !Number.isFinite(y)) return false;
    let px = x, py = y;
    const r = Math.hypot(x, y);
    if (r > this.FACE) { px = x * this.FACE / r; py = y * this.FACE / r; }
    const value = this.valueAt(px, py, format);
    if (this.points(value) == null) return false;
    shot.result = {value, impact: {x: px, y: py}};
    return true;
  },
  impacts(shots) {
    const out = [];
    for (const s of shots || []) {
      if (!s || s.candidate || this.points(s.result && s.result.value) == null) continue;
      const p = s.result.impact;
      if (!p || !Number.isFinite(p.x) || !Number.isFinite(p.y)) continue;
      out.push({x: p.x, y: p.y, value: s.result.value, t: s.t_ms});
    }
    return out;
  },
  groupCenter(pts) {
    if (!pts || !pts.length) return null;
    return {
      x: pts.reduce((n, p) => n + p.x, 0) / pts.length,
      y: pts.reduce((n, p) => n + p.y, 0) / pts.length
    };
  },
  split(shots) {
    const scored = (shots || []).filter(s => s && !s.candidate && this.points(s.result && s.result.value) != null);
    const mean = (rows, pick) => {
      const a = rows.map(pick).filter(v => v != null && Number.isFinite(v));
      return a.length ? a.reduce((x, y) => x + y, 0) / a.length : null;
    };
    const pack = rows => ({n: rows.length, aim: mean(rows, s => s.aim_score), shot_s: mean(rows, s => this.shotSeconds(s))});
    const high = scored.filter(s => s.result.value === 'X' || s.result.value === '10' || s.result.value === '11');
    const low = scored.filter(s => s.result.value !== 'X' && s.result.value !== '10' && s.result.value !== '11');
    return {
      n: scored.length,
      need: Math.max(0, this.SPLIT - scored.length),
      ready: scored.length >= this.SPLIT,
      high: pack(high),
      low: pack(low),
      points: scored.filter(s => Number.isFinite(s.aim_score)).map(s => ({value: s.result.value, aim: s.aim_score}))
    };
  },
  points(value) {
    if (value === '11') return 11;
    if (value === 'X' || value === '10') return 10;
    if (value === 'M') return 0;
    const n = Number(value);
    return Number.isInteger(n) && n >= 1 && n <= 9 ? n : null;
  },
  groupOf(value) {
    if (value === 'X' || value === '10' || value === '11') return 'x10';
    if (value === '9' || value === '8') return '98';
    if (value === 'M') return 'm';
    const n = Number(value);
    return Number.isInteger(n) && n >= 1 && n <= 7 ? 'low' : null;
  },
  set(shot, value, format) {
    if (!shot || shot.candidate) return false;
    if (value == null || value === '') {
      if (!shot.result) return true;
      const impact = shot.result.impact;
      if (impact == null) delete shot.result;
      else shot.result = {impact};
      return true;
    }
    const key = String(value);
    const allowed = format && this.FORMATS[format] ? this.FORMATS[format].values : this.VALUES;
    if (!allowed.includes(key)) return false;
    const impact = shot.result && shot.result.impact;
    shot.result = impact == null ? {value: key} : {value: key, impact};
    return true;
  },
  // El mismo número que la ficha llama «Tiempo de tiro» cuando el sensor mandó draw_ms.
  shotSeconds(shot) {
    return shot && Number.isFinite(shot.draw_ms) && shot.draw_ms >= 0 ? (shot.draw_ms + 1200) / 1000 : null;
  },
  totals(shots) {
    const rows = (shots || []).filter(s => s && !s.candidate);
    const scored = rows.filter(s => this.points(s.result && s.result.value) != null);
    const sum = scored.reduce((n, s) => n + this.points(s.result.value), 0);
    return {
      arrows: rows.length,
      scored: scored.length,
      score: scored.length ? sum : null,
      avg: scored.length ? sum / scored.length : null,
      x: scored.filter(s => s.result.value === 'X').length,
      ten: scored.filter(s => s.result.value === '10').length,
      nine: scored.filter(s => s.result.value === '9').length,
      eleven: scored.filter(s => s.result.value === '11').length
    };
  },
  scoreText(t, shots, format) {
    if (!t || t.score == null) return '';
    if (!format) return String(t.score);
    return t.score + '/' + this.roundMax(shots, format);
  },
  totalsLine(t, format) {
    if (!t || !t.scored) return '';
    const avg = Math.round(t.avg * 10) / 10;
    const avgText = Number.isInteger(avg) ? String(avg) : avg.toFixed(1).replace('.', ',');
    const bits = [];
    if (format === 'lancaster') {
      if (t.eleven) bits.push(t.eleven + ' de 11');
    } else if (format !== 'wa') bits.push(t.x + ' X');
    if (t.ten) bits.push(t.ten === 1 ? '1 diez' : t.ten + ' dieces');
    const head = format ? t.score + '/' + (t.arrows * this.arrowMax(format)) : String(t.score);
    return head + ' puntos · media ' + avgText + (bits.length ? ' · ' + bits.join(' · ') : '');
  },
  groups(shots) {
    const buckets = this.GROUPS.map(g => ({...g, n: 0, aim: [], shot_s: [], settle: []}));
    const byId = {};
    buckets.forEach(g => { byId[g.id] = g; });
    for (const s of shots || []) {
      if (!s || s.candidate) continue;
      const id = this.groupOf(s.result && s.result.value);
      if (!id) continue;
      const g = byId[id];
      g.n++;
      if (Number.isFinite(s.aim_score)) g.aim.push(s.aim_score);
      const sec = this.shotSeconds(s);
      if (sec != null) g.shot_s.push(sec);
      if (Number.isFinite(s.settle_ms)) g.settle.push(s.settle_ms);
    }
    const mean = a => a.length ? a.reduce((x, y) => x + y, 0) / a.length : null;
    return buckets.map(g => ({
      id: g.id, label: g.label, n: g.n,
      aim: mean(g.aim), aim_n: g.aim.length, aim_min: g.aim.length ? Math.min(...g.aim) : null,
      shot_s: mean(g.shot_s), shot_n: g.shot_s.length,
      settle: mean(g.settle), settle_n: g.settle.length
    }));
  },
  groupLine(g) {
    if (!g || !g.n) return '';
    const bits = [g.n + ' flecha' + (g.n === 1 ? '' : 's')];
    if (g.aim_n) bits.push('estabilidad ' + Math.round(g.aim));
    if (g.shot_n) bits.push('tiro ' + g.shot_s.toFixed(1).replace('.', ',') + ' s');
    if (g.settle_n) bits.push('estabilización ' + Math.round(g.settle) + ' ms');
    return g.label + ' · ' + bits.join(' · ');
  },
  sentence(g) {
    const bits = [];
    if (g.shot_n >= this.MIN) {
      const lo = Math.floor(g.shot_s), hi = Math.ceil(g.shot_s);
      bits.push(lo === hi ? 'unos ' + lo + ' s de tiro' : lo + '-' + hi + ' s de tiro');
    }
    if (g.aim_n >= this.MIN) bits.push(g.aim_min >= 80 ? 'estabilidad ≥80' : 'estabilidad media ' + Math.round(g.aim));
    return bits.length ? 'Tus ' + g.label + ' salen con ' + bits.join(' y ') + '.' : '';
  },
  insight(shots) {
    const groups = this.groups(shots);
    const ready = g => g.n >= this.MIN && (g.aim_n >= this.MIN || g.shot_n >= this.MIN) && this.sentence(g);
    const good = groups.find(g => g.id === 'x10' && ready(g)) || groups.find(ready);
    if (!good) return {enough: false, text: 'Hacen falta al menos 4 flechas en un mismo grupo de valor, con estabilidad o tiempo de tiro, para cruzarlas con la ejecución.'};
    return {enough: true, text: this.sentence(good)};
  }
};
if (typeof module !== 'undefined') module.exports = Score;
