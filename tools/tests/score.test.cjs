const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');
const Score = require('../../mobile/score.js');
const Backup = require('../../mobile/backup.js');

const arrow = (value, extra = {}) => ({aim_score: 80, draw_ms: 3000, settle_ms: 200, hr_bpm: 90, result: value == null ? undefined : {value}, ...extra});

test('arrow values score X and 10 as ten points and can be cleared without the impact', () => {
  assert.equal(Score.points('X'), 10);
  assert.equal(Score.points('10'), 10);
  assert.equal(Score.points('M'), 0);
  assert.equal(Score.points('9'), 9);
  assert.equal(Score.points('0'), null);
  assert.equal(Score.points('Y'), null);
  const shot = {t_ms: 1, result: {value: '9', impact: {x: 0.2, y: -0.1}}};
  assert.equal(Score.set(shot, 'X'), true);
  assert.deepEqual(shot.result, {value: 'X', impact: {x: 0.2, y: -0.1}});
  assert.equal(Score.set(shot, null), true);
  assert.deepEqual(shot.result, {impact: {x: 0.2, y: -0.1}});
  assert.equal(Score.set({candidate: true}, '10'), false);
  assert.equal(Score.set(shot, 'Y'), false);
  assert.equal(shot.result.impact.x, 0.2);
});

test('totals count the set and the session without old shots or candidates', () => {
  const shots = [arrow('X'), arrow('10'), arrow('9'), arrow('M'), {aim_score: 50}, {candidate: true, result: {value: 'X'}}];
  const t = Score.totals(shots);
  assert.equal(t.arrows, 5);
  assert.equal(t.scored, 4);
  assert.equal(t.score, 29);
  assert.equal(t.x, 1);
  assert.equal(t.ten, 1);
  assert.equal(Score.totalsLine(t), '29 puntos · media 7,3 · 1 X · 1 diez');
  assert.equal(Score.totals([{aim_score: 80}]).scored, 0);
  assert.equal(Score.totalsLine(Score.totals([])), '');
});

test('value groups average execution and the sentence waits for four arrows', () => {
  const high = [0, 1, 2, 3].map(i => arrow(i < 3 ? 'X' : '10', {aim_score: 82 + i, draw_ms: 3000 + i * 100, settle_ms: 180, hr_bpm: 88}));
  const rest = [arrow('9', {aim_score: 70, draw_ms: 5000}), arrow('7', {aim_score: 60}), arrow('M', {aim_score: 40, hr_bpm: 110})];
  const groups = Score.groups([...high, ...rest]);
  const x10 = groups.find(g => g.id === 'x10');
  assert.equal(x10.n, 4);
  assert.equal(groups.find(g => g.id === '98').n, 1);
  assert.equal(groups.find(g => g.id === 'low').n, 1);
  assert.equal(groups.find(g => g.id === 'm').n, 1);
  assert.ok(x10.aim >= 80 && x10.aim_min >= 80);
  assert.ok(Math.abs(x10.shot_s - 4.35) < 0.05, x10.shot_s);
  assert.match(Score.groupLine(x10), /X-10 · 4 flechas · estabilidad 8\d · tiro 4,[34] s/);
  const said = Score.insight([...high, ...rest]);
  assert.equal(said.enough, true);
  assert.match(said.text, /Tus X-10 salen con 4-5 s de tiro y estabilidad ≥80/);
  assert.equal(Score.insight(high.slice(0, 3)).enough, false);
  assert.match(Score.insight(high.slice(0, 3)).text, /al menos 4/);
  const soft = Score.insight([0, 1, 2, 3].map(() => arrow('9', {aim_score: 70, draw_ms: 2800})));
  assert.match(soft.text, /Tus 9-8 salen con unos 4 s de tiro y estabilidad media 70/);
});

test('the backup carries the arrow value because it lives on the shot', () => {
  const mem = new Map();
  const storage = {
    getItem: k => mem.get(k) ?? null,
    setItem: (k, v) => mem.set(k, String(v)),
    key: i => [...mem.keys()][i] ?? null,
    get length() { return mem.size; }
  };
  storage.setItem('atSessions', JSON.stringify([{id: 1, shots: [{t_ms: 5, result: {value: 'X', impact: {x: 1, y: 2}}}]}]));
  const copy = Backup.build(storage, {exportedAt: '2026-10-11T08:00:00.000Z', app: '4.13'});
  assert.equal(copy.storage.atSessions[0].shots[0].result.value, 'X');
  assert.equal(copy.storage.atSessions[0].shots[0].result.impact.y, 2);
});

test('indoor formats drop X from World Archery, keep it on Vegas, and score 11 on Lancaster', () => {
  assert.deepEqual(Score.FORMATS.wa.values, ['10', '9', '8', '7', '6', 'M']);
  assert.deepEqual(Score.FORMATS.vegas.values, ['X', '10', '9', '8', '7', '6', 'M']);
  assert.deepEqual(Score.FORMATS.lancaster.values, ['11', '10', '9', '8', '7', '6', 'M']);
  assert.equal(Score.DEFAULT_FORMAT, 'vegas');
  assert.equal(Score.points('11'), 11);
  assert.equal(Score.points('X'), 10);
  assert.equal(Score.valueAt(0, 0, 'wa'), '10');
  assert.equal(Score.valueAt(0, 0, 'vegas'), 'X');
  assert.equal(Score.valueAt(0, 0, 'lancaster'), '11');
  assert.equal(Score.valueAt(0, 0.15, 'wa'), '10');
  assert.equal(Score.valueAt(0, 0.15, 'vegas'), '10');
  assert.equal(Score.valueAt(0, 0.3, 'wa'), '9');
  assert.equal(Score.valueAt(0, 0.5, 'lancaster'), '8');
  assert.equal(Score.valueAt(0, 0.7, 'vegas'), '7');
  assert.equal(Score.valueAt(0, 0.9, 'wa'), '6');
  assert.equal(Score.valueAt(1.2, 0, 'lancaster'), 'M');
  assert.equal(Score.valueAt(0, 0), 'X');
  assert.equal(Score.formatOf({mode: 'Indoor', shots: [{result: {value: 'X'}}]}), 'vegas');
  assert.equal(Score.formatOf({mode: 'Indoor', shots: [{result: {value: '11'}}]}), 'vegas');
  assert.equal(Score.formatOf({mode: 'Indoor', shots: []}), 'vegas');
  assert.equal(Score.formatOf({mode: 'Indoor', scoreFormat: 'wa', shots: []}), 'wa');
  assert.equal(Score.formatOf({mode: 'Indoor', scoreFormat: 'lancaster', shots: []}), 'lancaster');
  assert.equal(Score.formatOf({mode: 'Outdoor', shots: [{result: {value: 'X'}}]}), null);
  assert.deepEqual(Score.valuesFor({mode: 'Indoor', shots: []}), ['X', '10', '9', '8', '7', '6', 'M']);
  assert.deepEqual(Score.valuesFor({mode: 'Indoor', scoreFormat: 'wa', shots: []}), ['10', '9', '8', '7', '6', 'M']);
  const shot = {t_ms: 1};
  assert.equal(Score.set(shot, 'X', 'wa'), false);
  assert.equal(Score.set(shot, '8', 'wa'), true);
  assert.equal(Score.set(shot, '11', 'lancaster'), true);
  assert.equal(shot.result.value, '11');
  assert.equal(Score.set(shot, 'X', 'vegas'), true);
  const placed = {t_ms: 2};
  assert.equal(Score.place(placed, 0, 0, 'wa'), true);
  assert.equal(placed.result.value, '10');
  const thirty = Array.from({length: 30}, () => ({result: {value: '11'}}));
  const t = Score.totals(thirty);
  assert.equal(t.score, 330);
  assert.equal(t.eleven, 30);
  assert.equal(t.x, 0);
  assert.equal(Score.roundMax(thirty, 'lancaster'), 330);
  assert.equal(Score.roundMax(thirty, 'wa'), 300);
  assert.equal(Score.roundMax(thirty, 'vegas'), 300);
  assert.equal(Score.arrowMax('wa'), 10);
  assert.equal(Score.totalsLine(t, 'lancaster'), '330/330 puntos · media 11 · 30 de 11');
  assert.equal(Score.totalsLine(Score.totals([{result: {value: '10'}}, {result: {value: '10'}}, {result: {value: '9'}}]), 'wa'), '29/30 puntos · media 9,7 · 2 dieces');
  assert.equal(Score.totalsLine(Score.totals([arrow('X'), arrow('10')]), 'vegas'), '20/20 puntos · media 10 · 1 X · 1 diez');
  assert.doesNotMatch(Score.totalsLine(Score.totals([arrow('10')]), 'wa'), /X/);
});

test('the compound face scores 10 to 6, the inner ten as X, and outside the six as a miss', () => {
  assert.equal(Score.valueAt(0, 0), 'X');
  assert.equal(Score.valueAt(0.1, 0), 'X');
  assert.equal(Score.valueAt(0.100001, 0), '10');
  assert.equal(Score.valueAt(0, 0.2), '10');
  assert.equal(Score.valueAt(0, 0.200001), '9');
  assert.equal(Score.valueAt(0, 0.4), '9');
  assert.equal(Score.valueAt(0, 0.400001), '8');
  assert.equal(Score.valueAt(0, 0.6), '8');
  assert.equal(Score.valueAt(0, 0.600001), '7');
  assert.equal(Score.valueAt(0, 0.8), '7');
  assert.equal(Score.valueAt(0, 0.800001), '6');
  assert.equal(Score.valueAt(0, 1), '6');
  assert.equal(Score.valueAt(1.01, 0), 'M');
  assert.equal(Score.valueAt(NaN, 0), null);
  const rings = {X: 0.05, '10': 0.15, '9': 0.3, '8': 0.5, '7': 0.7, '6': 0.9, M: 1.05};
  for (const [value, r] of Object.entries(rings)) assert.equal(Score.valueAt(0, r), value, value);
  assert.deepEqual(Score.VALUES, ['X', '10', '9', '8', '7', '6', 'M']);
  const shot = {t_ms: 4, aim_score: 88, tilt_x: [1, 2]};
  assert.equal(Score.place(shot, 0, 0.3), true);
  assert.equal(shot.result.value, '9');
  assert.deepEqual(shot.result.impact, {x: 0, y: 0.3});
  assert.deepEqual(shot.tilt_x, [1, 2]);
  assert.equal(Score.place(shot, 3, 0), true);
  assert.equal(shot.result.value, 'M');
  assert.ok(Math.abs(shot.result.impact.x - Score.FACE) < 1e-9);
  assert.equal(Score.set(shot, '8'), true);
  assert.equal(shot.result.value, '8');
  assert.equal(shot.result.impact.x, Score.FACE);
  assert.equal(Score.set(shot, '5'), false);
  assert.equal(shot.result.value, '8');
  assert.equal(Score.points('5'), 5);
  assert.equal(Score.totals([{result: {value: '5'}}]).score, 5);
  assert.equal(Score.set(shot, null), true);
  assert.equal(shot.result.value, undefined);
  assert.equal(Score.impacts([shot]).length, 0);
  assert.equal(Score.place({candidate: true}, 0, 0), false);
  assert.equal(Score.place(shot, NaN, 0), false);
});

test('a group map skips old arrows that have a value and no position', () => {
  const placed = arrow('X', {t_ms: 1, result: {value: 'X', impact: {x: 0.1, y: 0}}});
  const other = arrow('9', {t_ms: 2, result: {value: '9', impact: {x: -0.1, y: 0.2}}});
  const old = arrow('10', {t_ms: 3});
  const pts = Score.impacts([placed, other, old, {candidate: true, result: {value: 'X', impact: {x: 1, y: 1}}}]);
  assert.equal(pts.length, 2);
  assert.deepEqual(Score.groupCenter(pts), {x: 0, y: 0.1});
  assert.equal(Score.groupCenter([]), null);
  assert.equal(Score.totals([placed, other, old]).score, 29);
});

test('stability against score waits for twenty scored arrows', () => {
  const few = Array.from({length: 8}, (_, i) => arrow(i < 3 ? 'X' : '9'));
  const early = Score.split(few);
  assert.equal(early.ready, false);
  assert.equal(early.n, 8);
  assert.equal(early.need, 12);
  assert.equal(Score.split([arrow(null), {candidate: true, result: {value: 'X'}}]).need, 20);
  const many = [
    ...Array.from({length: 12}, () => arrow('10', {aim_score: 90, draw_ms: 1800})),
    ...Array.from({length: 8}, () => arrow('8', {aim_score: 70, draw_ms: 3800}))
  ];
  const split = Score.split(many);
  assert.equal(split.ready, true);
  assert.equal(split.need, 0);
  assert.equal(split.high.n, 12);
  assert.equal(split.low.n, 8);
  assert.equal(Math.round(split.high.aim), 90);
  assert.equal(Math.round(split.low.aim), 70);
  assert.ok(Math.abs(split.high.shot_s - 3) < 1e-9, split.high.shot_s);
  assert.ok(Math.abs(split.low.shot_s - 5) < 1e-9, split.low.shot_s);
  assert.equal(split.points.length, 20);
  const edge = Score.split(many.slice(0, 19));
  assert.equal(edge.ready, false);
  assert.equal(edge.need, 1);
  const withMiss = Score.split([...many.slice(0, 19), arrow('M', {aim_score: 40, draw_ms: 5000})]);
  assert.equal(withMiss.ready, true);
  assert.equal(withMiss.low.n, 8);
  assert.ok(withMiss.points.some(p => p.value === 'M'));
});

test('exported shots without an impact still score and split', () => {
  const dir = path.join(__dirname, 'fixtures');
  for (const name of ['release-paint-20261002.json', 'candidates-20261002.json']) {
    const shots = JSON.parse(fs.readFileSync(path.join(dir, name), 'utf8'));
    const totals = Score.totals(shots);
    assert.equal(totals.scored, 0);
    assert.equal(Score.impacts(shots).length, 0);
    assert.equal(Score.split(shots).ready, false);
    assert.equal(Score.groups(shots).every(g => g.n === 0), true);
    assert.equal(Score.insight(shots).enough, false);
  }
  const shot = JSON.parse(fs.readFileSync(path.join(dir, 'release-paint-20261002.json'), 'utf8'))[0];
  const copy = JSON.parse(JSON.stringify(shot));
  assert.equal(Score.place(copy, 0.12, -0.04), true);
  assert.equal(copy.result.value, '10');
  assert.equal(copy.aim_score, shot.aim_score);
  assert.equal(copy.tilt_x.length, shot.tilt_x.length);
  assert.equal(Score.totals([copy, shot]).scored, 1);
});
