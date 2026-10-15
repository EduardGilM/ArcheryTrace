/* Trayectoria en grados. El FR165 no tiene giroscopio: el heading solo es
   observable con el acelerómetro cerca de 1 g y el campo magnético estable.
   qx/qy (doble integración) se ignoran: derivan y no aportan al dibujo. */
const Trace = {
  yawDelta(a, b) {
    if (!Number.isFinite(a) || !Number.isFinite(b)) return 0;
    let d = (a - b) % 360;
    if (d >= 180) d -= 360;
    else if (d < -180) d += 360;
    return d === 0 ? 0 : d;
  },
  circMean(vals) {
    let s = 0, c = 0, n = 0;
    for (const v of vals || []) {
      if (!Number.isFinite(v)) continue;
      const r = v * Math.PI / 180;
      s += Math.sin(r); c += Math.cos(r); n++;
    }
    if (!n || (s === 0 && c === 0)) return 0;
    return Math.atan2(s, c) * 180 / Math.PI;
  },
  fixYaw(yw0) {
    const yw = (yw0 || []).slice();
    let j = 0;
    while (j < yw.length) {
      let k = j;
      while (k + 1 < yw.length && yw[k + 1] === yw[j]) k++;
      if (k - j > 4) {
        const nv = yw[k + 1] ?? yw[j];
        for (let q = j; q <= k; q++) yw[q] = nv;
      }
      j = k + 1;
    }
    return yw;
  },
  holdMs(shot) {
    const s = shot || {};
    const t = s.trace_t || [], x = s.tilt_x || [], y = s.tilt_y || [];
    if (t.length && t.length === x.length && y.length === x.length) {
      let i = t.length - 1;
      const x0 = x[i] || 0, y0 = y[i] || 0;
      while (i >= 0 && Math.hypot((x[i] || 0) - x0, (y[i] || 0) - y0) < 80) i--;
      const h = i + 1 < t.length ? -t[i + 1] : 800;
      if (Number.isFinite(h) && h > 0) return Math.max(200, Math.min(2500, h));
    }
    return 800;
  },
  nearest(times, values, t) {
    if (!times || !values) return null;
    const n = Math.min(times.length, values.length);
    if (!n) return null;
    let best = 0, gap = Infinity;
    for (let i = 0; i < n; i++) {
      const d = Math.abs(times[i] - t);
      if (d < gap) { gap = d; best = i; }
    }
    return Number.isFinite(values[best]) ? values[best] : null;
  },
  // 1 cerca de 1 g y de |B| de referencia; 0 cuando la gravedad o el campo no sirven.
  trustAt(shot, t, magRef) {
    const s = shot || {};
    const w = s.window || {};
    const acc = this.nearest(w.pre, w.mag_pre, t);
    let trust = 1;
    if (Number.isFinite(acc)) {
      const d = Math.abs(acc - 1000) / 1000;
      if (d >= 0.28) trust = 0;
      else if (d > 0.12) trust = 1 - (d - 0.12) / 0.16;
    }
    const b = this.nearest(s.trace_t, s.mag_b, t);
    if (trust > 0 && Number.isFinite(b) && Number.isFinite(magRef) && magRef > 80) {
      const d = Math.abs(b - magRef) / magRef;
      if (d >= 0.22) trust = 0;
      else if (d > 0.08) trust = Math.min(trust, 1 - (d - 0.08) / 0.14);
    }
    return trust;
  },
  unwrap(yaw) {
    const u = [0];
    for (let i = 1; i < yaw.length; i++) u.push(u[i - 1] + this.yawDelta(yaw[i], yaw[i - 1]));
    return u;
  },
  // Pico aislado (sale y vuelve): no es un movimiento de apunte.
  despike(values, limit) {
    const y = values.slice();
    for (let i = 1; i < y.length - 1; i++) {
      const d0 = y[i] - y[i - 1], d1 = y[i + 1] - y[i];
      if (Math.abs(d0) > limit && Math.abs(d0 + d1) < limit * 0.5) y[i] = (y[i - 1] + y[i + 1]) / 2;
    }
    return y;
  },
  holdLowTrust(values, trust) {
    const y = values.slice();
    let last = null;
    for (let i = 0; i < y.length; i++) {
      if ((trust[i] ?? 1) >= 0.5 && Number.isFinite(y[i])) last = y[i];
      else if (last != null) y[i] = last;
    }
    let first = null;
    for (let i = 0; i < y.length; i++) if ((trust[i] ?? 1) >= 0.5) { first = y[i]; break; }
    if (first != null) for (let i = 0; i < y.length && (trust[i] ?? 1) < 0.5; i++) y[i] = first;
    return y;
  },
  // Paso bajo sin desfase: un polo ida y vuelta. fc ~ 3 Hz, por debajo del ruido
  // de muestra del magnetómetro y por encima del vaivén lento del apunte.
  zeroPhase(values, fs) {
    const rate = Number.isFinite(fs) && fs > 4 ? fs : 20;
    const a = 1 - Math.exp(-2 * Math.PI * 3.2 / rate);
    const fwd = values.slice();
    for (let i = 1; i < fwd.length; i++) fwd[i] = fwd[i - 1] + a * (fwd[i] - fwd[i - 1]);
    const back = fwd.slice().reverse();
    for (let i = 1; i < back.length; i++) back[i] = back[i - 1] + a * (back[i] - back[i - 1]);
    return back.reverse();
  },
  magRef(shot) {
    const b = (shot && shot.mag_b) || [];
    const ok = b.filter(v => Number.isFinite(v) && v > 80).slice().sort((x, y) => x - y);
    if (ok.length < 4) return null;
    return ok[Math.floor(ok.length / 2)];
  },
  sd(vals) {
    const a = (vals || []).filter(Number.isFinite);
    if (a.length < 2) return 0;
    const m = a.reduce((x, y) => x + y, 0) / a.length;
    return Math.sqrt(a.reduce((x, y) => x + (y - m) ** 2, 0) / a.length);
  },
  step(vals) {
    const d = [];
    for (let i = 1; i < (vals || []).length; i++) if (Number.isFinite(vals[i]) && Number.isFinite(vals[i - 1])) d.push(Math.abs(vals[i] - vals[i - 1]));
    return d.length ? d.reduce((x, y) => x + y, 0) / d.length : 0;
  },
  // Dirección del golpe, no su recorrido: sin giroscopio el ángulo durante el
  // impacto no es medible. Un trazo corto; el apunte sigue ocupando la diana.
  followTick(shot, scale) {
    const s = shot || {};
    const tx = s.traj_x || [], ty = s.traj_y || [];
    if (s.post_yaw && s.post_yaw.length) return null;
    let sx = 0, sy = 0, n = 0;
    for (let i = 0; i < Math.min(3, tx.length, ty.length); i++) {
      if (Number.isFinite(tx[i]) && Number.isFinite(ty[i])) { sx += tx[i]; sy += ty[i]; n++; }
    }
    if (!n) return null;
    const r = Math.hypot(sx, sy);
    if (r < 30) return null;
    const len = Math.min(Math.max(0.15, scale * 0.32), 0.75);
    return [sx / r * len, sy / r * len, 40];
  },
  view(shot) {
    const s = shot || {};
    const yawRaw = (s.yaw_c && s.yaw_c.length ? s.yaw_c : s.yaw_deg) || [];
    const dt = Number.isFinite(s.dt) && s.dt > 0 ? s.dt : 50;
    const at = (i, n) => (s.trace_t && Number.isFinite(s.trace_t[i]) ? s.trace_t[i] : (i - n) * dt);
    const compass = yawRaw.length > 2 && Math.max(...yawRaw) - Math.min(...yawRaw) > 0.5;
    if (!compass) {
      const bx = s.tilt_x || [], by = s.tilt_y || [], n = bx.length;
      const hn = Math.max(1, Math.floor(n / 5));
      let hx = 0, hy = 0;
      for (let i = Math.max(0, n - hn); i < n; i++) { hx += bx[i] || 0; hy += by[i] || 0; }
      hx /= hn; hy /= hn;
      const pts = bx.map((x, i) => [((x || 0) - hx) / 17.45, ((by[i] || 0) - hy) / 17.45, at(i, n)]);
      const radii = pts.map(p => Math.hypot(p[0], p[1])).sort((a, b) => a - b);
      const p90 = radii.length ? radii[Math.min(radii.length - 1, Math.floor(radii.length * 0.9))] : 1;
      return {pts, unit: 'tilt', scale: Math.max(0.25, p90 * 1.2), rawAimSd: 0, smoothAimSd: 0, stepRaw: 0, stepSmooth: 0};
    }
    const yaw = this.fixYaw(yawRaw.slice());
    const n = yaw.length;
    const t = yaw.map((_, i) => at(i, n));
    const pitch0 = s.pitch_deg || [];
    const pitchIn = yaw.map((_, i) => Number.isFinite(pitch0[i]) ? pitch0[i] : 0);
    const refB = this.magRef(s);
    const trust = t.map(tt => this.trustAt(s, tt, refB));
    let u = this.holdLowTrust(this.despike(this.unwrap(yaw), 12), trust);
    let pitch = this.holdLowTrust(this.despike(pitchIn, 8), trust);
    const rawU = u.slice(), rawP = pitch.slice();
    if (n >= 8) {
      const fs = 1000 / dt;
      u = this.zeroPhase(u, fs);
      pitch = this.zeroPhase(pitch, fs);
    }
    const hold = this.holdMs(s);
    const aimIdx = [];
    t.forEach((tt, i) => { if (tt >= -hold && tt <= 30) aimIdx.push(i); });
    const hn = Math.max(1, Math.floor(n / 5));
    const pool = aimIdx.length >= hn ? aimIdx : t.map((_, i) => i);
    const anchorIdx = pool.slice(-hn);
    const avg = idx => idx.reduce((sum, i) => sum + i, 0) / idx.length;
    const uA = avg(anchorIdx.map(i => u[i]));
    const pA = avg(anchorIdx.map(i => pitch[i]));
    const rawUA = avg(anchorIdx.map(i => rawU[i]));
    const rawPA = avg(anchorIdx.map(i => rawP[i]));
    const ptsAll = u.map((v, i) => [v - uA, pitch[i] - pA, t[i]]);
    const aim = (aimIdx.length ? aimIdx : t.map((_, i) => i));
    const lead = -hold - 200;
    const aimPhase = ptsAll.filter(p => p[2] >= lead && p[2] <= 30 && Number.isFinite(p[0]) && Number.isFinite(p[1]));
    const maxR = aimPhase.reduce((m, p) => Math.max(m, Math.hypot(p[0], p[1])), 0);
    const scale = Math.max(0.25, (maxR * 1.08) || 0.4);
    const pts = aimPhase.slice();
    const post = s.post_yaw || [];
    const postP = s.post_pitch || [];
    const postT = s.post_t || [];
    let follow = null;
    if (post.length && postP.length === post.length) {
      const anchorYaw = this.circMean(anchorIdx.map(i => yaw[i]));
      const anchorPitch = avg(anchorIdx.map(i => pitchIn[i]));
      for (let i = 0; i < post.length; i++) {
        if (!Number.isFinite(post[i]) || !Number.isFinite(postP[i])) continue;
        const dx = this.yawDelta(post[i], anchorYaw), dy = postP[i] - anchorPitch;
        const r = Math.hypot(dx, dy);
        const tt = Number.isFinite(postT[i]) ? postT[i] : (i + 1) * dt;
        if (!(r > 0.12) || !(tt > 0)) continue;
        const len = Math.min(r, 0.75, scale);
        follow = [dx / r * len, dy / r * len, tt];
        break;
      }
    }
    if (!follow) follow = this.followTick(s, scale);
    if (follow && Math.hypot(follow[0], follow[1]) <= scale + 1e-9) pts.push(follow);
    const aimRaw = aim.map(i => Math.hypot(rawU[i] - rawUA, rawP[i] - rawPA));
    const aimSm = aim.map(i => Math.hypot(ptsAll[i][0], ptsAll[i][1]));
    return {
      pts, unit: 'deg', scale,
      rawAimSd: this.sd(aimRaw), smoothAimSd: this.sd(aimSm),
      stepRaw: this.step(aim.map(i => rawU[i])), stepSmooth: this.step(aim.map(i => u[i]))
    };
  }
};
if (typeof module !== 'undefined') module.exports = Trace;
