const test = require('node:test');
const assert = require('node:assert/strict');
const Trace = require('../../mobile/trace-geom.js');

test('yaw wrap stays on the short arc across ±180°', () => {
  assert.equal(Trace.yawDelta(179, -179), -2);
  assert.equal(Trace.yawDelta(-179, 179), 2);
  assert.equal(Trace.yawDelta(10, 10), 0);
  assert.equal(Trace.yawDelta(0, 180), -180);
  assert.equal(Trace.yawDelta(10, 370), 0);
  const anchor = Trace.circMean([179, -179]);
  assert.ok(Math.abs(Trace.yawDelta(anchor, 180)) < 1e-6, anchor);
  assert.ok(Math.abs(Trace.yawDelta(178, anchor)) < 3, Trace.yawDelta(178, anchor));
});

test('a high-frequency wobble shrinks and a slow aim remains', () => {
  const t = Array.from({length: 40}, (_, i) => -1950 + i * 50);
  const yaw = t.map((_, i) => 0.5 * Math.sin(i / 7) + (i % 2 ? 0.9 : -0.9));
  const shot = {yaw_c: yaw, pitch_deg: t.map(() => 0), trace_t: t, tilt_x: t.map(() => 10), tilt_y: t.map(() => 10), dt: 50};
  const view = Trace.view(shot);
  assert.equal(view.unit, 'deg');
  assert.ok(view.stepSmooth < view.stepRaw * 0.55, `${view.stepSmooth} vs ${view.stepRaw}`);
  assert.ok(view.smoothAimSd > 0.15, view.smoothAimSd);
  assert.ok(view.pts.every(p => Math.hypot(p[0], p[1]) <= view.scale + 1e-6), JSON.stringify(view.pts.map(p => Math.hypot(p[0], p[1]))));
});

test('an acceleration spike and a magnetic glitch do not drag the aim', () => {
  const t = [-350, -300, -250, -200, -150, -100, -50, 0];
  const yaw = [10, 10.2, 10.1, 48, 10.4, 10.2, 10.5, 10.3];
  const shot = {
    yaw_c: yaw, pitch_deg: t.map(() => 20), trace_t: t, dt: 50,
    tilt_x: t.map(() => 0), tilt_y: t.map(() => 0),
    window: {pre: t, mag_pre: [1000, 1000, 1000, 1800, 1000, 1000, 1000, 1000]},
    mag_b: [400, 400, 400, 900, 400, 400, 400, 400]
  };
  const view = Trace.view(shot);
  const at = view.pts.find(p => p[2] === -200);
  assert.ok(at && Math.abs(at[0]) < 3, JSON.stringify(at));
  assert.ok(view.pts.filter(p => p[2] <= 0).every(p => Math.abs(p[0]) < 4), JSON.stringify(view.pts));
});

test('field traces keep the aim and cut the follow-through down to a short tick', () => {
  const shots = require('./fixtures/release-paint-20261002.json');
  const views = shots.map(s => Trace.view({...s, pos_x: s.pos_x, pos_y: s.pos_y}));
  assert.ok(views.every(v => v.unit === 'deg'));
  const ratio = views.map(v => v.stepRaw > 0 ? v.stepSmooth / v.stepRaw : 1);
  const median = ratio.slice().sort((a, b) => a - b)[Math.floor(ratio.length / 2)];
  assert.ok(median < 0.85, median);
  assert.ok(median > 0.2, median);
  for (const [i, v] of views.entries()) {
    const follow = v.pts.filter(p => p[2] > 0);
    assert.ok(follow.length <= 1, i + ':' + follow.length);
    if (follow.length) assert.ok(Math.hypot(follow[0][0], follow[0][1]) <= 0.75 + 1e-6, JSON.stringify(follow[0]));
    const aim = v.pts.filter(p => p[2] <= 0);
    assert.ok(aim.length >= 4, i);
  }
});

test('the whole aim fits the scale and a wild follow-through stays a short tick', () => {
  const n = 30;
  const t = Array.from({length: n}, (_, i) => -(n - 1 - i) * 50);
  const yaw = t.map((_, i) => 20 + (i === 4 ? 0.6 : 0));
  const pitch = t.map((_, i) => (i === 4 || i === 5) ? 3.5 : 0);
  const shot = {
    yaw_c: yaw, pitch_deg: pitch, trace_t: t, dt: 50,
    tilt_x: t.map(() => 0), tilt_y: t.map(() => 0),
    post_yaw: [80, 120], post_pitch: [40, 55], post_t: [40, 90]
  };
  const view = Trace.view(shot);
  const aim = view.pts.filter(p => p[2] <= 0);
  const maxAim = Math.max(...aim.map(p => Math.hypot(p[0], p[1])));
  assert.ok(maxAim > 2, maxAim);
  assert.ok(view.scale + 1e-6 >= maxAim, `scale ${view.scale} aim ${maxAim}`);
  const follow = view.pts.filter(p => p[2] > 0);
  assert.equal(follow.length, 1);
  const r = Math.hypot(follow[0][0], follow[0][1]);
  assert.ok(r <= 0.75 + 1e-6, r);
  assert.ok(r < view.scale * 0.5, `tick on the rim ${r} scale ${view.scale}`);
});
