const test = require('node:test');
const assert = require('node:assert/strict');
const Compare = require('../../mobile/compare.js');

const shot = (t, aim, extra = {}) => ({
  t_ms: t, set_id: extra.set_id ?? (t < 3000 ? 1 : 2), aim_score: aim, candidate: false,
  draw_ms: extra.draw_ms ?? 1800, settle_ms: extra.settle_ms ?? 200, hr_bpm: extra.hr_bpm ?? 80,
  result: extra.value ? {value: extra.value} : undefined,
  yaw_c: extra.yaw || [10, 12, 14, 16, 18],
  pitch_deg: extra.pitch || [0, 1, 2, 1, 0],
  trace_t: extra.trace_t || [-400, -300, -200, -100, -40]
});

test('summary faces score, stability, timing and gear, and the delta is the second minus the first', () => {
  const older = {id: 1, mode: 'Indoor', bow: 'Recurvo', arrows: 'X10', shots: [shot(1000, 70, {value: '9', draw_ms: 1800, settle_ms: 200, hr_bpm: 90}), shot(2000, 80, {value: '8', draw_ms: 1800, settle_ms: 200, hr_bpm: 80})]};
  const newer = {id: 2, mode: 'Indoor', bow: 'Recurvo', arrows: 'X10', shots: [shot(1000, 90, {value: 'X', draw_ms: 2800, settle_ms: 100, hr_bpm: 70}), shot(2000, 86, {value: '10', draw_ms: 2800, settle_ms: 100, hr_bpm: 60})]};
  const rows = Compare.rows(older, newer);
  const by = key => rows.find(r => r.key === key);
  assert.equal(by('arrows').d, '0');
  assert.equal(by('score').a, '17');
  assert.equal(by('score').b, '20');
  assert.equal(by('score').d, '+3');
  assert.equal(by('avg').a, '8,5');
  assert.equal(by('avg').b, '10,0');
  assert.equal(by('aim').a, '75');
  assert.equal(by('aim').b, '88');
  assert.equal(by('aim').d, '+13');
  assert.equal(by('shot').a, '3,0 s');
  assert.equal(by('shot').b, '4,0 s');
  assert.equal(by('shot').d, '+1,0 s');
  assert.equal(by('settle').d, '-100 ms');
  assert.equal(by('hr').d, '-20 ppm');
  assert.equal(by('gear').d, 'Igual');
  const bare = {id: 3, shots: [shot(1000, 50)]};
  assert.equal(Compare.rows(older, bare).find(r => r.key === 'score').b, '–');
  assert.equal(Compare.rows(older, bare).find(r => r.key === 'score').d, '–');
});

test('two rounds of the same mode can be compared and a free session is not one', () => {
  const shot = (t, score, value, set) => ({t_ms: t, set_id: set, aim_score: score, result: value ? {value} : undefined});
  const a = {id: 1, mode: 'Indoor', tanda: true, bow: 'Recurvo', shots: [shot(1, 80, '9', 1)]};
  const b = {id: 2, mode: 'Indoor', tanda: true, bow: 'Recurvo', shots: [shot(1, 90, 'X', 1)]};
  const free = {id: 3, mode: 'Indoor', shots: [shot(1, 70, '8', 1)]};
  assert.match(Compare.summary(a).gear, /Tanda indoor/);
  assert.equal(Compare.summary(free).gear.startsWith('Indoor'), true);
  assert.deepEqual(Compare.pick([free, a, b], 'tanda', 3), [2, 1]);
  assert.deepEqual(Compare.pick([a, b], 'tanda', 1), [1, 2]);
  assert.equal(Compare.pick([a, free], 'tanda', 1), null);
});

test('per-set series keep each end and skip candidates', () => {
  const s = {id: 1, shots: [shot(1000, 80, {value: '9'}), shot(2000, 60, {value: '7'}), {...shot(2500, 10), candidate: true}, shot(4000, 90, {set_id: 2, value: 'X'})]};
  const series = Compare.setSeries(s);
  assert.equal(series.length, 2);
  assert.equal(series[0].aim, 70);
  assert.equal(series[0].score, 8);
  assert.equal(series[1].score, 10);
});

test('the mean arrow stays on the short arc instead of averaging raw yaw across ±180°', () => {
  const trace = [-400, -300, -200, -100, -40];
  const low = shot(1000, 80, {yaw: [10, 12, 14, 16, 18], pitch: [0, 0, 0, 0, 0], trace_t: trace});
  const high = shot(2000, 80, {yaw: [170, 172, 174, 176, 178], pitch: [0, 0, 0, 0, 0], trace_t: trace});
  const mean = Compare.arrowPath({shots: [low, high]}, 'mean');
  assert.ok(mean && mean.length > 2);
  assert.ok(Math.abs(mean[0][0] + 8) < 1, String(mean[0][0]));
  assert.ok(mean.every(p => Math.abs(p[0]) < 20), JSON.stringify(mean.map(p => p[0])));
  const wrapped = Compare.degreePath(shot(1000, 80, {yaw: [10, 170, -170, -160, -150], pitch: [0, 0, 0, 0, 0]}));
  assert.ok(Math.abs(wrapped[1][0] + 40) < 0.01, String(wrapped[1][0]));
  assert.equal(Compare.degreePath(shot(1000, 80, {yaw: [1, 1, 1, 1.2, 1.2]})), null);
  assert.equal(Compare.arrowPath({shots: [low]}, 3), null);
  assert.equal(Compare.arrowPath({shots: [low]}, 0)[0][0], Compare.degreePath(low)[0][0]);
});

test('today, best score and best stability pick two different sessions', () => {
  const sessions = [
    {id: 1, shots: [shot(1000, 60, {value: '6'})]},
    {id: 2, shots: [shot(1000, 95, {value: '9'})]},
    {id: 3, shots: [shot(1000, 70)]}
  ];
  assert.deepEqual(Compare.pick(sessions, 'today'), [3, 2]);
  assert.deepEqual(Compare.pick(sessions, 'score', 3), [3, 2]);
  assert.deepEqual(Compare.pick(sessions, 'aim', 3), [3, 2]);
  assert.deepEqual(Compare.pick(sessions, 'score', 2), [2, 1]);
  assert.equal(Compare.pick([{id: 1, shots: [shot(1000, 80)]}], 'today'), null);
  assert.equal(Compare.pick(sessions.map(s => ({...s, shots: s.shots.map(x => ({...x, result: undefined}))})), 'score', 3), null);
});
