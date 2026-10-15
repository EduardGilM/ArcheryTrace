/* Objetivos semanales y rachas, aparte de las sesiones.
   La semana es la ISO en el calendario local (lunes a domingo): no usa la fecha UTC.
   El día de una sesión es el de su id, que es la fecha en que se abrió. */
const GoalsScore = (typeof module !== 'undefined') ? require('./score.js') : Score;
const Goals = {
  KEY: 'atGoals',
  MONTHS: ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'],
  empty() { return {arrows: null, sessions: null, average: null, stability: null}; },
  load(storage) {
    try { return this.normalize(JSON.parse(storage.getItem(this.KEY) || 'null')); }
    catch (e) { return this.empty(); }
  },
  save(storage, goals) {
    const saved = this.normalize(goals);
    storage.setItem(this.KEY, JSON.stringify(saved));
    return saved;
  },
  normalize(raw) {
    const src = raw && typeof raw === 'object' ? raw : {};
    return {
      arrows: this.limit(src.arrows, 1, 500, 0),
      sessions: this.limit(src.sessions, 1, 14, 0),
      average: this.limit(src.average, 1, 10, 1),
      stability: this.limit(src.stability, 1, 100, 0)
    };
  },
  limit(value, min, max, digits) {
    if (value == null || value === '') return null;
    const n = Number(String(value).trim().replace(',', '.'));
    if (!Number.isFinite(n) || n <= 0) return null;
    const m = 10 ** digits;
    const q = Math.round(n * m) / m;
    if (q < min) return null;
    return Math.min(max, q);
  },
  localParts(value) {
    const d = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(d.getTime())) return null;
    return {y: d.getFullYear(), m: d.getMonth() + 1, d: d.getDate()};
  },
  daySerial(value) {
    const p = this.localParts(value);
    return p ? this.serial(p.y, p.m, p.d) : null;
  },
  dayKey(value) {
    const p = this.localParts(value);
    if (!p) return '';
    return p.y + '-' + String(p.m).padStart(2, '0') + '-' + String(p.d).padStart(2, '0');
  },
  serial(y, m, d) { return Math.round(Date.UTC(y, m - 1, d) / 86400000); },
  partsFromSerial(serial) {
    const d = new Date(serial * 86400000);
    return {y: d.getUTCFullYear(), m: d.getUTCMonth() + 1, d: d.getUTCDate()};
  },
  // Semana ISO a partir del día civil, sin pasar por la zona horaria del sensor.
  isoWeek(value) {
    const p = this.localParts(value);
    return p ? this.isoWeekFromParts(p.y, p.m, p.d) : null;
  },
  isoWeekFromParts(y, m, d) {
    const serial = this.serial(y, m, d);
    const dow = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
    const monday = serial - (dow + 6) % 7;
    const thursday = monday + 3;
    const isoYear = new Date(thursday * 86400000).getUTCFullYear();
    const jan4 = this.serial(isoYear, 1, 4);
    const jan4Dow = new Date(Date.UTC(isoYear, 0, 4)).getUTCDay();
    const week1 = jan4 - (jan4Dow + 6) % 7;
    return {year: isoYear, week: Math.round((monday - week1) / 7) + 1, monday};
  },
  realShots(session) {
    return ((session && session.shots) || []).filter(s => s && !s.candidate);
  },
  blankStats() { return {arrows: 0, sessions: 0, scoreSum: 0, scoreN: 0, aimSum: 0, aimN: 0}; },
  addSession(stats, session) {
    const shots = this.realShots(session);
    if (!shots.length) return false;
    stats.sessions++;
    stats.arrows += shots.length;
    for (const s of shots) {
      const pts = GoalsScore.points(s.result && s.result.value);
      if (pts != null) { stats.scoreSum += pts; stats.scoreN++; }
      if (Number.isFinite(s.aim_score)) { stats.aimSum += s.aim_score; stats.aimN++; }
    }
    return true;
  },
  reading(stats) {
    return {
      arrows: stats.arrows,
      sessions: stats.sessions,
      average: stats.scoreN ? stats.scoreSum / stats.scoreN : null,
      stability: stats.aimN ? stats.aimSum / stats.aimN : null
    };
  },
  meets(stats, goals) {
    const checks = [];
    if (goals.arrows != null) checks.push(stats.arrows >= goals.arrows);
    if (goals.sessions != null) checks.push(stats.sessions >= goals.sessions);
    if (goals.average != null) checks.push(stats.average != null && this.limit(stats.average, 0, 10, 1) >= goals.average);
    if (goals.stability != null) checks.push(stats.stability != null && Math.round(stats.stability) >= goals.stability);
    return checks.length > 0 && checks.every(Boolean);
  },
  goalsOn(goals) {
    return ['arrows', 'sessions', 'average', 'stability'].some(k => goals[k] != null);
  },
  // La racha actual sigue viva si el periodo de hoy todavía no se ha cumplido.
  // Un hueco en un periodo ya cerrado la corta. El mejor recorrido mira el histórico igual.
  streak(hits, nowSerial, step) {
    const keys = [...hits].filter(n => Number.isFinite(n)).sort((a, b) => a - b);
    if (!keys.length || nowSerial == null) return {current: 0, best: 0};
    const last = hits.has(nowSerial) ? nowSerial : nowSerial - step;
    if (last < keys[0]) return {current: 0, best: 0};
    let run = 0, best = 0;
    for (let s = keys[0]; s <= last; s += step) {
      run = hits.has(s) ? run + 1 : 0;
      if (run > best) best = run;
    }
    return {current: run, best};
  },
  buckets(sessions) {
    const weeks = new Map(), days = new Set();
    for (const session of sessions || []) {
      if (!session || !Number.isFinite(session.id)) continue;
      const week = this.isoWeek(session.id);
      const day = this.daySerial(session.id);
      if (!week || day == null) continue;
      const stats = weeks.get(week.monday) || this.blankStats();
      if (this.addSession(stats, session)) {
        weeks.set(week.monday, stats);
        days.add(day);
      }
    }
    return {weeks, days};
  },
  progress(sessions, goals, now = new Date()) {
    const g = this.normalize(goals);
    const current = this.isoWeek(now);
    const today = this.daySerial(now);
    const {weeks, days} = this.buckets(sessions);
    const stats = this.reading(weeks.get(current.monday) || this.blankStats());
    const metWeeks = new Set();
    if (this.goalsOn(g)) {
      for (const [monday, raw] of weeks) if (this.meets(this.reading(raw), g)) metWeeks.add(monday);
    }
    const weekStreak = this.streak(metWeeks, current.monday, 7);
    const dayStreak = this.streak(days, today, 1);
    const start = this.partsFromSerial(current.monday);
    const end = this.partsFromSerial(current.monday + 6);
    const span = this.dayText(start) + '–' + this.dayText(end);
    return {
      label: 'semana ' + current.week + ' · ' + span,
      goalsOn: this.goalsOn(g),
      met: this.meets(stats, g),
      stats,
      bars: this.bars(stats, g),
      days: dayStreak,
      weeks: weekStreak,
      streakText: this.streakText(dayStreak, weekStreak, this.goalsOn(g))
    };
  },
  bars(stats, goals) {
    const rows = [
      ['arrows', 'Flechas', stats.arrows, 0],
      ['sessions', 'Sesiones', stats.sessions, 0],
      ['average', 'Media', stats.average, 1],
      ['stability', 'Estabilidad', stats.stability, 0]
    ];
    return rows.filter(([key]) => goals[key] != null).map(([key, label, value, digits]) => {
      const goal = goals[key];
      const shown = value == null ? null : this.round(value, digits);
      const pct = shown == null ? 0 : Math.round(shown / goal * 100);
      const num = v => digits ? v.toFixed(digits).replace('.', ',') : String(v);
      const text = (shown == null ? '–' : num(shown)) + '/' + num(goal);
      return {id: key, label, value: text, text: text + ' · ' + pct + '%', pct, width: Math.max(0, Math.min(100, pct)), met: shown != null && shown >= goal};
    });
  },
  round(value, digits) {
    const m = 10 ** digits;
    return Math.round(value * m) / m;
  },
  dayText(p) { return p.d + ' ' + this.MONTHS[p.m - 1]; },
  streakText(days, weeks, goalsOn) {
    const followed = this.count(days.current, 'día seguido', 'días seguidos');
    const bestDays = this.count(days.best, 'día', 'días');
    if (!goalsOn) return 'Entrenando ' + followed + '. Mejor racha: ' + bestDays + '.';
    return 'Racha: ' + this.count(weeks.current, 'semana cumpliendo', 'semanas cumpliendo') + ' · ' + followed + '. Mejor racha: ' + this.count(weeks.best, 'semana', 'semanas') + ' · ' + bestDays + '.';
  },
  count(n, one, many) { return n + ' ' + (n === 1 ? one : many); }
};
if (typeof module !== 'undefined') module.exports = Goals;
