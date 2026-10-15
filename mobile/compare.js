/* Dos sesiones lado a lado. Las trayectorias van en grados (yaw compensado y pitch),
   cada flecha anclada a su propio apunte: no se promedia el yaw crudo, que salta en ±180°. */
let ScoreApi, TraceApi;
if (typeof module !== 'undefined') {
  ScoreApi = require('./score.js');
  TraceApi = require('./trace-geom.js');
} else {
  ScoreApi = Score;
  TraceApi = Trace;
}
const Compare = {
  COLORS: ['#5ab0f0', '#ff7a1a'],
  usable(list) {
    return (list || []).filter(s => s && Number.isFinite(s.id) && (s.shots || []).some(x => x && !x.candidate));
  },
  real(session) {
    return ((session && session.shots) || []).filter(s => s && !s.candidate);
  },
  mean(vals) {
    const a = (vals || []).filter(Number.isFinite);
    return a.length ? a.reduce((x, y) => x + y, 0) / a.length : null;
  },
  summary(session) {
    const shots = this.real(session);
    const totals = ScoreApi.totals(shots);
    const place = !session || !session.tanda ? (session && session.mode) : session.mode === 'Outdoor' ? 'Tanda aire libre' : session.mode === 'Indoor' ? 'Tanda indoor' : 'Tanda';
    const gear = [place, session && (session.bow || session.profile), session && session.arrows].filter(Boolean).join(' · ');
    return {
      arrows: shots.length,
      score: totals.score,
      avg: totals.avg,
      scored: totals.scored,
      aim: this.mean(shots.map(s => s.aim_score)),
      shot: this.mean(shots.map(s => ScoreApi.shotSeconds(s))),
      settle: this.mean(shots.map(s => s.settle_ms)),
      hr: this.mean(shots.map(s => s.hr_bpm)),
      gear: gear || 'Sin equipo'
    };
  },
  rows(a, b) {
    const A = this.summary(a), B = this.summary(b);
    const cell = (v, digits, suffix) => this.text(v, digits, suffix);
    const diff = (x, y, digits, suffix) => this.deltaText(x, y, digits, suffix);
    return [
      {key: 'arrows', label: 'Flechas', a: cell(A.arrows, 0), b: cell(B.arrows, 0), d: diff(A.arrows, B.arrows, 0)},
      {key: 'score', label: 'Puntos', a: cell(A.score, 0), b: cell(B.score, 0), d: diff(A.score, B.score, 0)},
      {key: 'avg', label: 'Media', a: cell(A.avg, 1), b: cell(B.avg, 1), d: diff(A.avg, B.avg, 1)},
      {key: 'aim', label: 'Estabilidad', a: cell(A.aim, 0), b: cell(B.aim, 0), d: diff(A.aim, B.aim, 0)},
      {key: 'shot', label: 'Tiro', a: cell(A.shot, 1, ' s'), b: cell(B.shot, 1, ' s'), d: diff(A.shot, B.shot, 1, ' s')},
      {key: 'settle', label: 'Settle', a: cell(A.settle, 0, ' ms'), b: cell(B.settle, 0, ' ms'), d: diff(A.settle, B.settle, 0, ' ms')},
      {key: 'hr', label: 'Pulso', a: cell(A.hr, 0, ' ppm'), b: cell(B.hr, 0, ' ppm'), d: diff(A.hr, B.hr, 0, ' ppm')},
      {key: 'gear', label: 'Material', a: A.gear, b: B.gear, d: A.gear === B.gear ? 'Igual' : '–'}
    ];
  },
  text(v, digits, suffix) {
    const n = this.round(v, digits);
    if (n == null) return '–';
    return ((digits ? n.toFixed(digits) : String(n)).replace('.', ',')) + (suffix || '');
  },
  deltaText(a, b, digits, suffix) {
    if (!Number.isFinite(a) || !Number.isFinite(b)) return '–';
    const n = this.round(b - a, digits);
    if (n == null || n === 0) return '0';
    const body = (digits ? Math.abs(n).toFixed(digits) : String(Math.abs(n))).replace('.', ',');
    return (n > 0 ? '+' : '-') + body + (suffix || '');
  },
  round(v, digits) {
    if (!Number.isFinite(v)) return null;
    const m = 10 ** (digits || 0);
    return Math.round(v * m) / m;
  },
  setSeries(session) {
    const out = [];
    for (const s of this.real(session)) {
      const id = s.set_id;
      if (!out.length || out[out.length - 1].id !== id) out.push({id, shots: []});
      out[out.length - 1].shots.push(s);
    }
    return out.map(g => {
      const totals = ScoreApi.totals(g.shots);
      return {aim: this.mean(g.shots.map(s => s.aim_score)), score: totals.avg};
    });
  },
  // Hoy contra la anterior, o la sesión de la izquierda contra la mejor por puntos o estabilidad.
  pick(list, kind, leftId) {
    const rows = this.usable(list);
    if (rows.length < 2) return null;
    const newest = [...rows].sort((a, b) => b.id - a.id);
    const left = rows.find(s => s.id === leftId) || newest[0];
    if (kind === 'score') {
      const ranked = rows.filter(s => ScoreApi.totals(s.shots).scored > 0).sort((a, b) => {
        const A = ScoreApi.totals(a.shots), B = ScoreApi.totals(b.shots);
        return (B.avg - A.avg) || (B.score - A.score) || (b.id - a.id);
      });
      const best = ranked.find(s => s.id !== left.id);
      return best ? [left.id, best.id] : null;
    }
    if (kind === 'tanda') {
      const pool = rows.filter(s => s.tanda || (s.tandas && s.tandas.length));
      const anchor = left && left.tanda ? left : [...pool].sort((a, b) => b.id - a.id)[0];
      if (!anchor) return null;
      const other = pool.filter(s => s.id !== anchor.id && s.mode === anchor.mode).sort((a, b) => b.id - a.id)[0];
      return other ? [anchor.id, other.id] : null;
    }
    if (kind === 'aim') {
      const ranked = rows.filter(s => Number.isFinite(this.summary(s).aim)).sort((a, b) => this.summary(b).aim - this.summary(a).aim || b.id - a.id);
      const best = ranked.find(s => s.id !== left.id);
      return best ? [left.id, best.id] : null;
    }
    const other = newest.find(s => s.id !== left.id);
    return other ? [left.id, other.id] : null;
  },
  degreePath(shot) {
    const raw = shot && (shot.yaw_c && shot.yaw_c.length ? shot.yaw_c : shot.yaw_deg) || [];
    if (raw.length < 3 || raw.some(v => !Number.isFinite(v)) || Math.max(...raw) - Math.min(...raw) <= 0.5) return null;
    const pts = (TraceApi.view(shot).pts || []).filter(p => p[2] <= 30);
    return pts.length > 1 ? pts : null;
  },
  arrowPath(session, which) {
    const rows = this.real(session);
    if (which === 'mean') return this.meanPath(rows);
    const i = Number(which);
    if (!Number.isInteger(i) || i < 0 || i >= rows.length) return null;
    return this.degreePath(rows[i]);
  },
  meanPath(shots) {
    const paths = (shots || []).map(s => this.degreePath(s)).filter(p => p && p.length > 1);
    if (!paths.length) return null;
    if (paths.length === 1) return paths[0];
    const t0 = Math.max(...paths.map(p => p[0][2]));
    const t1 = Math.min(...paths.map(p => p[p.length - 1][2]));
    if (!(t1 > t0)) return null;
    const step = Math.max(20, (t1 - t0) / 40);
    const pts = [];
    for (let t = t0; t <= t1 + step * 0.01; t += step) {
      const xs = [], ys = [];
      for (const p of paths) {
        const s = this.sampleAt(p, t);
        if (!s) continue;
        xs.push(s[0]); ys.push(s[1]);
      }
      if (xs.length === paths.length) pts.push([this.mean(xs), this.mean(ys), t]);
    }
    return pts.length > 1 ? pts : null;
  },
  sampleAt(path, t) {
    if (t < path[0][2] - 1 || t > path[path.length - 1][2] + 1) return null;
    let i = 1;
    while (i < path.length && path[i][2] < t) i++;
    if (i >= path.length) return [path[path.length - 1][0], path[path.length - 1][1]];
    const a = path[i - 1], b = path[i];
    const span = b[2] - a[2];
    if (!(span > 0)) return [b[0], b[1]];
    const u = (t - a[2]) / span;
    return [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u];
  }
};
if (typeof module !== 'undefined') module.exports = Compare;
