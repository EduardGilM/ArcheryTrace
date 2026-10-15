const test = require('node:test');
const assert = require('node:assert/strict');
const {execFileSync} = require('node:child_process');
const path = require('node:path');
const Goals = require('../../mobile/goals.js');
const Backup = require('../../mobile/backup.js');

const at = (y, m, d, h = 12) => new Date(y, m - 1, d, h).getTime();
const arrow = (aim, value) => ({t_ms: aim, aim_score: aim, candidate: false, result: value ? {value} : undefined});
const session = (id, shots) => ({id, shots});

test('ISO weeks use the local calendar and a Sunday night stays in the previous week', () => {
  const sunday = Goals.isoWeek(new Date(2025, 11, 28, 23, 30));
  const monday = Goals.isoWeek(new Date(2025, 11, 29, 0, 30));
  assert.deepEqual([sunday.year, sunday.week], [2025, 52]);
  assert.deepEqual([monday.year, monday.week], [2026, 1]);
  assert.equal(monday.monday - sunday.monday, 7);
  assert.equal(Goals.dayKey(new Date(2025, 11, 28, 23, 30)), '2025-12-28');
  assert.equal(Goals.daySerial(new Date(2026, 2, 9, 0, 30)) - Goals.daySerial(new Date(2026, 2, 8, 23, 30)), 1);
  assert.equal(Goals.isoWeek(new Date(2025, 11, 31, 23)).week, 1);
  assert.equal(Goals.isoWeek(new Date(2025, 11, 31, 23)).year, 2026);
});

test('the same local Sunday is not pulled into Monday when the zone is behind UTC', () => {
  const goals = path.resolve(__dirname, '../../mobile/goals.js');
  execFileSync(process.execPath, ['-e', `
    const Goals = require(${JSON.stringify(goals)});
    const sunday = new Date(2025, 11, 28, 23, 30);
    const monday = new Date(2025, 11, 29, 0, 30);
    const a = Goals.isoWeek(sunday), b = Goals.isoWeek(monday);
    if (a.year !== 2025 || a.week !== 52) throw new Error('sunday ' + JSON.stringify(a));
    if (b.year !== 2026 || b.week !== 1) throw new Error('monday ' + JSON.stringify(b));
    if (Goals.dayKey(sunday) !== '2025-12-28') throw new Error(Goals.dayKey(sunday));
    if (Goals.daySerial(new Date(2026, 2, 9, 0, 30)) - Goals.daySerial(new Date(2026, 2, 8, 23, 30)) !== 1) throw new Error('gap');
  `], {env: {...process.env, TZ: 'Pacific/Honolulu'}});
});

test('a missed day or week ends the streak and the current period stays open until it closes', () => {
  const goals = {arrows: 4, sessions: null, average: null, stability: null};
  const mon = at(2026, 10, 5), tue = at(2026, 10, 6), wed = at(2026, 10, 7);
  const shots = [arrow(80), arrow(80), arrow(80), arrow(80)];
  const sessions = [session(mon, shots), session(tue, shots), session(wed, shots)];
  const mid = Goals.progress(sessions, goals, new Date(2026, 9, 8, 9));
  assert.equal(mid.days.current, 3);
  assert.equal(mid.days.best, 3);
  assert.equal(mid.weeks.current, 1);
  const afterGap = Goals.progress(sessions, goals, new Date(2026, 9, 9, 9));
  assert.equal(afterGap.days.current, 0);
  assert.equal(afterGap.days.best, 3);
  const later = Goals.progress([...sessions, session(at(2026, 10, 10), shots)], goals, new Date(2026, 9, 10, 18));
  assert.equal(later.days.current, 1);
  assert.equal(later.days.best, 3);
});

test('week gaps and the year boundary count ISO weeks, and an open week does not erase the previous one', () => {
  const goals = {arrows: 2, sessions: 1, average: 9, stability: 80};
  const pack = (id, values, aim) => session(id, values.map((value, i) => arrow(aim, value)));
  const week52 = pack(at(2025, 12, 22), ['X', '10'], 90);
  const week1 = pack(at(2025, 12, 30), ['9', '9'], 85);
  const open = Goals.progress([week52, week1], goals, new Date(2026, 0, 7, 8));
  assert.equal(open.weeks.current, 2);
  assert.equal(open.weeks.best, 2);
  assert.match(open.streakText, /2 semanas cumpliendo/);
  const skipped = Goals.progress([week52, pack(at(2026, 1, 12), ['X', 'X'], 90)], goals, new Date(2026, 0, 12, 12));
  assert.equal(skipped.weeks.current, 1);
  assert.equal(skipped.weeks.best, 1);
  const low = Goals.progress([pack(at(2026, 1, 12), ['6', '6'], 90)], goals, new Date(2026, 0, 12, 12));
  assert.equal(low.met, false);
  assert.equal(low.bars.find(b => b.id === 'average').met, false);
  const noScore = Goals.progress([session(at(2026, 1, 12), [arrow(90), arrow(90)])], goals, new Date(2026, 0, 12, 12));
  assert.equal(noScore.bars.find(b => b.id === 'average').text.startsWith('–/'), true);
  assert.equal(noScore.met, false);
});

test('this week shows bars and percentage, and old sessions without values still count arrows', () => {
  const now = new Date(2026, 9, 11, 18);
  const goals = {arrows: 10, sessions: 2, average: null, stability: 80};
  const current = session(at(2026, 10, 6, 19), [arrow(70), arrow(90), {...arrow(100), candidate: true}]);
  const previous = session(at(2026, 9, 28), [arrow(80), arrow(80), arrow(80), arrow(80)]);
  const report = Goals.progress([current, previous, {id: at(2026, 10, 8), shots: []}], goals, now);
  assert.equal(report.stats.arrows, 2);
  assert.equal(report.stats.sessions, 1);
  assert.equal(report.bars.find(b => b.id === 'arrows').text, '2/10 · 20%');
  assert.equal(report.bars.find(b => b.id === 'arrows').width, 20);
  assert.equal(report.bars.find(b => b.id === 'stability').met, true);
  assert.equal(report.met, false);
  assert.match(report.label, /semana 41/);
  assert.match(report.streakText, /0 semanas cumpliendo/);
  assert.match(report.streakText, /0 días seguidos/);
  assert.match(report.streakText, /1 día\./);
});

test('goals are stored under atGoals, blanks turn a target off, and the export keeps them', () => {
  const storage = new Map();
  const box = {getItem: k => storage.get(k) ?? null, setItem: (k, v) => storage.set(k, String(v)), key: i => [...storage.keys()][i] ?? null, get length() { return storage.size; }};
  assert.deepEqual(Goals.load(box), Goals.empty());
  const saved = Goals.save(box, {arrows: '30', sessions: '', average: '8,5', stability: '0', extra: 4});
  assert.deepEqual(saved, {arrows: 30, sessions: null, average: 8.5, stability: null});
  assert.equal(Goals.load(box).average, 8.5);
  assert.equal(Goals.save(box, {arrows: 9000, sessions: 1, average: 0.2, stability: 80}).arrows, 500);
  box.setItem('atSessions', '[]');
  const copy = Backup.build(box);
  assert.equal(copy.storage.atGoals.arrows, 500);
  assert.deepEqual(copy.storage.atSessions, []);
});
