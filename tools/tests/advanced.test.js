const assert = require('assert');
const Adv = require('../../mobile/advanced.js');
// flecha sintética: quieta 0,05° alrededor del punto de suelta, luego el arco sube 30°
const t = [], y = [], p = [], pt = [], py = [], pp = [];
for (let k = -3000; k <= 0; k += 5) { t.push(k); y.push(0.05 * Math.sin(k / 50)); p.push(k < -1000 ? (k + 1000) / -4000 : 0); }
for (let k = 5; k <= 2500; k += 5) { pt.push(k); py.push(0); pp.push(Math.min(30, k / 30)); }
const m = Adv.metrics({ trace_t: t, yaw_c: y, pitch_deg: p, post_t: pt, post_yaw: py, post_pitch: pp, draw_ms: 8000, settle_ms: 1000 });
assert(m.band < 0.1, 'banda ' + m.band); assert(Math.abs(m.follow - 30) < 1, 'seguimiento ' + m.follow);
assert(Math.abs(m.hold - 8) < 1e-9); assert(Adv.metrics({ trace_t: [], yaw_c: [], pitch_deg: [] }) === null);
assert(Math.abs(Adv.cm(1, 18) - 31.4) < 0.1);
console.log('OK advanced', m.band.toFixed(3), m.follow.toFixed(1));
