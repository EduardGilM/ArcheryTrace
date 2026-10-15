package com.eduardgilm.archerytrace;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

// Detector de suelta para un WIT montado en el arco, diseñado con datos reales (3 tiros + manejo).
//
// Qué se vio en los datos (WT901BLE68 a "200 Hz"):
//  - acel/giro solo cambian ~50 veces/s (cada valor se repite ~4 tramas); los ángulos sí a 200 Hz.
//  - en la suelta |a| sube en 4 tramas doblándose (1,4→2,9→5,8→11,6 g): artefacto del firmware,
//    así que el valor del pico no es fiable; solo sirve como "hubo golpe".
//  - antes de cada tiro, el arco está quieto: |giro| medio 0,5 °/s (máx 1,3) durante ≥4,8 s.
//  - tras el tiro, vibración: |giro| medio ~50 °/s en el segundo siguiente.
//  - golpes de manejo (bajar el arco, mover la mano) llegan con el arco ya moviéndose (50–170 °/s).
//
// Regla: SUELTA = golpe de acel (|a|-1g > SPIKE_G) tras un sostenimiento quieto
// (en el STILL_WINDOW_MS previo: |giro| medio < HOLD_DPS y máximo < HOLD_MAX_DPS), con orientación parecida a la de la tanda,
// confirmada por vibración posterior (|giro| medio > RING_DPS en POST_CHECK_MS). Refractario REFRACTORY_MS.
public final class ShotDetector {
    public interface Listener {
        void onShot(Map<String, Object> shot);
        void onLive(double aimX, double aimY, boolean steady, long holdMs);
    }

    // Umbrales con margen frente a lo medido (entre paréntesis):
    public static final double HOLD_DPS = 25;         // media de |giro| antes del golpe; tolera temblor de principiante (experto: 0,5; principiante: 10–25; manejo: 170–540)
    public static final double HOLD_MAX_DPS = 80;     // pico permitido en la ventana (experto: 1,3)
    public static final long STILL_WINDOW_MS = 1000;  // ventana de quietud antes del golpe (tiros: ≥4,8 s quietos)
    public static final long HOLD_MIN_MS = 500;       // sostenimiento mínimo (media móvil < HOLD_DPS)
    public static final long HOLD_MAX_MS = 30000;     // más quieto que esto = arco apoyado, no apuntando (tiros: 5–7 s)
    public static final double SPIKE_G = 1.5;         // |a|-1g (tiros: >10 g con artefacto); el manejo también da golpes, lo filtra la quietud
    public static final long SPIKE_WINDOW_MS = 80;    // el golpe ocupa ~4 tramas (≈40 ms)
    public static final double RING_DPS = 15;         // vibración tras soltar POR ENCIMA del temblor previo (tiros: ~50 °/s)
    public static final double MAX_ELEV_DEG = 35;     // eje de puntería casi horizontal = arco levantado apuntando
    public static final long POST_CHECK_MS = 1500;
    public static final double HORIZ_FRAC = 0.6;      // golpe en el plano horizontal (hacia la diana): tiros 0,76–0,89; apoyar 0,11; manejo 0,45
    public static final double TILT_AFTER_DEG = 20;   // vuelco del arco tras soltar: tiros 50–55°; apoyar 7°; manejo 24°
    public static final double BORE_COS = 0.7;        // golpe alineado con el eje de tiro aprendido en la sesión (≈45°)
    public static final double MAX_TILT_DEG = 30;     // giro de la vertical vs la tanda (tiros: <2°)
    public static final long REFRACTORY_MS = 3000;
    public static final double SETTLE_DPS = 25;       // fin de la vibración (tiros: pico ~70 °/s, cae a ~20 en ~1 s)
    static final long PRE_MS = 3000, POST_MS = 2500, END_GAP_MS = 45000;

    // compatibilidad con órdenes antiguas (ya no se usan para detectar)
    public int boreAxis = 1, boreSign = 1;
    public double thresholdMg = SPIKE_G * 1000;

    private final Listener listener;
    private final List<Pt> hist = new ArrayList<>();
    private double ux = 1, uy = 0, uz = 0;            // vertical (arriba) en marco sensor
    private double bx = 0, by = 1, bz = 0;            // eje hacia la diana (se aprende del golpe)
    private boolean boreLearned = false;
    private double yaw = 0, pitch = 0, yawZero = 0;
    private long lastT = -1, steadySince = -1, lastShot = -1, lastLive = 0, zeroAt = -1;
    private boolean needZero = true, tandaCounted = false;
    private long zeroSeg = -2;
    public int endIndex = 0;
    private double[] tandaUp = null;
    private Cand cand;
    private long lastReject = Long.MIN_VALUE / 2;
    // golpes descartados (para diagnosticar en el CSV crudo / logcat)
    public interface RejectSink { void onReject(long t, String why); }
    public RejectSink rejectSink;
    private void reject(long t, String why) { if (rejectSink != null) rejectSink.onReject(t, why); }

    // Ventana de quietud antes del golpe: media y máximo de |giro| en STILL_WINDOW_MS.
    private String stillBefore(long st) {
        double sum = 0, max = 0; int n = 0; long first = Long.MAX_VALUE;
        for (Pt q : hist) if (q.t < st - 30 && q.t >= st - 30 - STILL_WINDOW_MS) { sum += q.gyro; max = Math.max(max, q.gyro); n++; first = Math.min(first, q.t); }
        if (n < 10 || st - 30 - first < STILL_WINDOW_MS * 0.8) return "poca historia";
        double mean = sum / n;
        if (mean >= HOLD_DPS) return String.format(java.util.Locale.ROOT, "giro medio %.1f°/s", mean);
        if (max >= HOLD_MAX_DPS) return String.format(java.util.Locale.ROOT, "giro máx %.1f°/s", max);
        return null;
    }
    // duración del sostenimiento: desde que la media móvil (~250 ms) de |giro| bajó de HOLD_DPS
    private double gyroEma = 100;
    private long stillSince = -1;
    private long stillFrom = -1, stillEnd = Long.MIN_VALUE / 2;   // último tramo quieto ya cerrado
    private long holdLength(long st) {
        if (stillSince >= 0) return Math.max(0, st - stillSince);
        return lastT - stillEnd <= SPIKE_WINDOW_MS + 100 && stillFrom >= 0 ? Math.max(0, st - stillFrom) : 0;
    }
    private long brokenHold = 0, brokenAt = Long.MIN_VALUE / 2;

    static final class Pt { long t; double yaw, pitch, mag, gyro, ax, ay, az; }
    static final class Cand { long t; long holdMs; double peak; double[] up; double[] holdAcc; double preMean, horiz; boolean holdOk; String info = ""; boolean confirmed; }

    public ShotDetector(Listener l) { listener = l; }

    public void onSample(WitParser.Sample s) {
        long t = s.tMs;
        double dt = lastT < 0 ? 0 : Math.max(0, Math.min(0.1, (t - lastT) / 1000.0));
        lastT = t;
        double mag = Math.sqrt(s.ax * s.ax + s.ay * s.ay + s.az * s.az);
        double gyro = Math.sqrt(s.gx * s.gx + s.gy * s.gy + s.gz * s.gz);
        if (mag > 0.9 && mag < 1.1) {
            double k = hist.isEmpty() ? 1 : 0.03;
            ux += k * (s.ax / mag - ux); uy += k * (s.ay / mag - uy); uz += k * (s.az / mag - uz);
            double n = Math.sqrt(ux * ux + uy * uy + uz * uz); ux /= n; uy /= n; uz /= n;
        }
        // eje lateral = diana × arriba; izquierda/derecha = giro sobre la vertical, arriba/abajo = giro sobre el lateral
        double rx = by * uz - bz * uy, ry = bz * ux - bx * uz, rz = bx * uy - by * ux;
        double rn = Math.sqrt(rx * rx + ry * ry + rz * rz);
        if (rn > 1e-3) { rx /= rn; ry /= rn; rz /= rn; }
        yaw += -(s.gx * ux + s.gy * uy + s.gz * uz) * dt;
        pitch += (s.gx * rx + s.gy * ry + s.gz * rz) * dt;
        if (mag > 0.95 && mag < 1.05) {
            double accPitch = Math.toDegrees(Math.asin(Math.max(-1, Math.min(1, bx * ux + by * uy + bz * uz))));
            pitch += 0.01 * (accPitch - pitch);
        }
        gyroEma += (gyro - gyroEma) * Math.min(1, dt / 0.25);
        if (gyroEma < HOLD_DPS) { if (stillSince < 0) stillSince = t; }
        else { if (stillSince >= 0) { stillFrom = stillSince; stillEnd = t; } stillSince = -1; }
        Pt p = new Pt(); p.t = t; p.yaw = yaw; p.pitch = pitch; p.mag = mag * 1000; p.gyro = gyro; p.ax = s.ax; p.ay = s.ay; p.az = s.az;
        hist.add(p);
        while (!hist.isEmpty() && t - hist.get(0).t > PRE_MS + POST_MS + 1500) hist.remove(0);

        if (lastShot >= 0 && t - lastShot > END_GAP_MS && zeroAt <= lastShot) { needZero = true; tandaCounted = false; tandaUp = null; }

        long holdBefore = steadySince < 0 ? 0 : t - steadySince;
        double jump = Math.abs(mag - 1);

        // Candidato = golpe de acel. Bloqueos duros: arco en reposo (>20 s quieto) y arco no levantado.
        if (cand == null && jump > SPIKE_G && (lastShot < 0 || t - lastShot > REFRACTORY_MS)) {
            long st = startOfSpike(t);
            String why = null;
            if (holdLength(st) > HOLD_MAX_MS) why = "arco en reposo " + holdLength(st) / 1000 + " s";
            if (why == null && boreLearned) {
                double elev = Math.toDegrees(Math.asin(Math.max(-1, Math.min(1, bx * ux + by * uy + bz * uz))));
                if (Math.abs(elev) > MAX_ELEV_DEG) why = String.format(java.util.Locale.ROOT, "arco no levantado (puntería a %.0f°)", elev);
            }
            if (why == null) {
                cand = new Cand(); cand.t = st; cand.holdMs = holdLength(st); cand.peak = jump;
                cand.up = new double[]{ux, uy, uz}; cand.holdAcc = holdMean(cand.t);
                cand.preMean = meanGyro(st - 280, st - 30);   // justo antes: en tiro instintivo la tensión aún se mueve
                String sb = stillBefore(st);
                cand.holdOk = sb == null && cand.holdMs >= HOLD_MIN_MS;
                double dx = s.ax - cand.holdAcc[0], dy = s.ay - cand.holdAcc[1], dz = s.az - cand.holdAcc[2];
                double along = dx * ux + dy * uy + dz * uz, n = Math.sqrt(dx * dx + dy * dy + dz * dz);
                cand.horiz = n < 1e-6 ? 0 : Math.sqrt(Math.max(0, n * n - along * along)) / n;
            } else if (t - lastReject > 1000) { lastReject = t; reject(st, why); }
        }
        if (gyro < HOLD_DPS) { if (steadySince < 0) steadySince = t; }
        else { if (steadySince >= 0) { brokenHold = t - steadySince; brokenAt = t; } steadySince = -1; }
        if (cand != null) {
            if (t - cand.t <= SPIKE_WINDOW_MS) cand.peak = Math.max(cand.peak, jump);
            if (!cand.confirmed && t - cand.t >= POST_CHECK_MS) {
                // Firma de la suelta: cuenta rasgos (hacen falta 3 de 4) + orientación de la tanda (obligatoria)
                double ring = meanGyro(cand.t + SPIKE_WINDOW_MS, cand.t + 500);
                double tilt = tiltAfter(cand);
                boolean fHoriz = cand.horiz >= HORIZ_FRAC, fRing = ring > cand.preMean + RING_DPS, fTilt = tilt >= TILT_AFTER_DEG;
                // golpe en la línea ya aprendida de esta sesión (vale para cualquier montaje del sensor)
                boolean fBore = false; double boreCos = 0;
                if (boreLearned) { boreCos = joltBoreCos(cand); fBore = boreCos >= BORE_COS; }
                boolean fStrong = ring >= 3 * cand.preMean + 10;   // arranque brusco: la vibración triplica el movimiento justo anterior
                int support = (fTilt ? 1 : 0) + (cand.holdOk ? 1 : 0) + (fBore ? 1 : 0) + (fStrong ? 1 : 0);
                int score = (fHoriz ? 1 : 0) + (fRing ? 1 : 0) + support;
                String info = String.format(java.util.Locale.ROOT, "golpe horizontal %.2f%s, vibración %.0f°/s sobre %.0f%s, vuelco %.0f°%s, sostenido %d ms%s",
                    cand.horiz, fHoriz ? "✓" : "✗", ring, cand.preMean, fRing ? (fStrong ? "✓✓" : "✓") : "✗", tilt, fTilt ? "✓" : "✗", cand.holdMs, cand.holdOk ? "✓" : "✗")
                    + (boreLearned ? String.format(java.util.Locale.ROOT, ", línea de tiro %.2f%s", boreCos, fBore ? "✓" : "✗") : "");
                cand.info = info;
                // obligatorio: golpe horizontal + vibración (lo común a todo arco); y al menos un apoyo
                if (!fHoriz || !fRing || support < 1) { reject(cand.t, "firma insuficiente: " + info); cand = null; }
                else if (!orientationOk(cand.up)) { reject(cand.t, "orientación distinta a la tanda: " + info); cand = null; }
                else cand.confirmed = true;
            }
            if (cand != null && cand.confirmed && t - cand.t >= POST_MS) {
                learnBore(cand);
                if (needZero) {   // primera flecha de la tanda: el cero es el apunte de los 500 ms antes de soltar
                    double sy = 0; int n = 0;
                    for (Pt q : hist) if (q.t >= cand.t - 530 && q.t < cand.t - 30) { sy += q.yaw; n++; }
                    if (n > 0) yawZero = sy / n;
                }
                emit(cand); needZero = false; lastShot = cand.t; cand = null; steadySince = -1;
            }
        }
        long holdMs = steadySince < 0 ? 0 : t - steadySince;
        // cero de la tanda: se rehace en cada sostenimiento hasta la primera flecha (manda el apunte justo antes de tirar)
        if (needZero && cand == null && holdMs >= 500 && zeroSeg != steadySince) {
            yawZero = yaw; zeroAt = t; zeroSeg = steadySince;
            if (!tandaCounted) { endIndex++; tandaCounted = true; }
        }
        if (t - lastLive >= 50) { lastLive = t; listener.onLive(yaw - yawZero, pitch, gyro < HOLD_DPS, holdMs); }
    }

    // primera trama del golpe: retrocede mientras |a| siga lejos de 1 g
    private long startOfSpike(long t) {
        long st = t;
        for (int i = hist.size() - 1; i >= 0; i--) {
            Pt q = hist.get(i); if (t - q.t > SPIKE_WINDOW_MS) break;
            if (Math.abs(q.mag / 1000 - 1) > 0.3) st = q.t; else break;
        }
        return st;
    }
    private double[] holdMean(long before) {
        double x = 0, y = 0, z = 0; int n = 0;
        for (Pt q : hist) if (q.t < before - 30 && q.t >= before - 530) { x += q.ax; y += q.ay; z += q.az; n++; }
        return n == 0 ? new double[]{ux, uy, uz} : new double[]{x / n, y / n, z / n};
    }
    private double meanGyro(long from, long to) {
        double s = 0; int n = 0;
        for (Pt q : hist) if (q.t > from && q.t <= to) { s += q.gyro; n++; }
        return n == 0 ? 0 : s / n;
    }
    // cuánto vuelca el arco hacia delante tras soltar: vertical media 1,0–1,5 s después vs la del apunte
    private double tiltAfter(Cand c) {
        double sx = 0, sy = 0, sz = 0, dev = 0; int n = 0;
        for (Pt q : hist) if (q.t >= c.t + 1000 && q.t <= c.t + 1500) { sx += q.ax; sy += q.ay; sz += q.az; dev += (q.mag / 1000 - 1) * (q.mag / 1000 - 1); n++; }
        if (n == 0 || Math.sqrt(dev / n) > 0.3) return 0;   // aún agitándose: la vertical no es fiable
        double m = Math.sqrt(sx * sx + sy * sy + sz * sz);
        double d = (sx * c.up[0] + sy * c.up[1] + sz * c.up[2]) / m;
        return Math.toDegrees(Math.acos(Math.max(-1, Math.min(1, d))));
    }
    // coseno entre la parte horizontal del golpe y el eje de tiro aprendido (signo incluido: hacia la diana)
    private double joltBoreCos(Cand c) {
        Pt first = null;
        for (Pt q : hist) if (q.t >= c.t && Math.abs(q.mag / 1000 - 1) > SPIKE_G) { first = q; break; }
        if (first == null) return 0;
        double dx = first.ax - c.holdAcc[0], dy = first.ay - c.holdAcc[1], dz = first.az - c.holdAcc[2];
        double along = dx * c.up[0] + dy * c.up[1] + dz * c.up[2];
        dx -= along * c.up[0]; dy -= along * c.up[1]; dz -= along * c.up[2];
        double n = Math.sqrt(dx * dx + dy * dy + dz * dz);
        return n < 1e-6 ? 0 : (dx * bx + dy * by + dz * bz) / n;
    }
    private boolean orientationOk(double[] up) {
        if (tandaUp == null) { tandaUp = up; return true; }
        double c = up[0] * tandaUp[0] + up[1] * tandaUp[1] + up[2] * tandaUp[2];
        return Math.toDegrees(Math.acos(Math.max(-1, Math.min(1, c)))) <= MAX_TILT_DEG;
    }
    // el arco salta hacia la diana: la parte horizontal del primer impulso da el eje de puntería
    private void learnBore(Cand c) {
        Pt first = null;
        for (Pt q : hist) if (q.t >= c.t) { first = q; break; }
        if (first == null) return;
        double dx = first.ax - c.holdAcc[0], dy = first.ay - c.holdAcc[1], dz = first.az - c.holdAcc[2];
        double along = dx * c.up[0] + dy * c.up[1] + dz * c.up[2];
        dx -= along * c.up[0]; dy -= along * c.up[1]; dz -= along * c.up[2];
        double n = Math.sqrt(dx * dx + dy * dy + dz * dz);
        if (n < 0.1) return;
        dx /= n; dy /= n; dz /= n;
        double k = boreLearned ? 0.3 : 1;
        bx += k * (dx - bx); by += k * (dy - by); bz += k * (dz - bz);
        double m = Math.sqrt(bx * bx + by * by + bz * bz); bx /= m; by /= m; bz /= m;
        boreLearned = true;
    }
    public double[] bore() { return new double[]{bx, by, bz}; }

    private void emit(Cand e) {
        List<Double> yw = new ArrayList<>(), pt = new ArrayList<>(), mp = new ArrayList<>(), tt = new ArrayList<>(), tx = new ArrayList<>(), ty = new ArrayList<>();
        List<Double> pyw = new ArrayList<>(), ppt = new ArrayList<>(), mq = new ArrayList<>(), postT = new ArrayList<>();
        int idx = 0;
        while (idx < hist.size() - 1 && hist.get(idx).t < e.t) idx++;
        Pt ref = idx > 0 ? hist.get(idx - 1) : hist.get(idx);
        double sx = 0, sy = 0, sx2 = 0, sy2 = 0, sm = 0, sm2 = 0; int n = 0;
        for (int i = 0; i < hist.size(); i++) {
            Pt q = hist.get(i); long d = q.t - e.t;
            if (d < -PRE_MS) continue;
            if (i < idx) {
                yw.add(round(q.yaw - yawZero)); pt.add(round(q.pitch)); mp.add((double) Math.round(q.mag)); tt.add((double) d);
                tx.add(round((q.yaw - ref.yaw) * 17.45)); ty.add(round((q.pitch - ref.pitch) * 17.45));
                if (d >= -1000) { double x = q.yaw - ref.yaw, y = q.pitch - ref.pitch; sx += x; sy += y; sx2 += x * x; sy2 += y * y; sm += q.mag; sm2 += q.mag * q.mag; n++; }
            } else if (d > 0) {
                pyw.add(round(q.yaw - yawZero)); ppt.add(round(q.pitch)); mq.add((double) Math.round(q.mag)); postT.add((double) d);
            }
        }
        double sdX = n > 1 ? Math.sqrt(Math.max(0, sx2 / n - (sx / n) * (sx / n))) : 0;
        double sdY = n > 1 ? Math.sqrt(Math.max(0, sy2 / n - (sy / n) * (sy / n))) : 0;
        double sdM = n > 1 ? Math.sqrt(Math.max(0, sm2 / n - (sm / n) * (sm / n))) : 0;
        double aimSd = Math.hypot(sdX, sdY);
        double score = Math.max(0, Math.min(100, 100 * Math.exp(-aimSd / 0.5)));
        // recuperación: primera ventana de 250 ms tras la suelta con |giro| medio < SETTLE_DPS
        // (en los tiros reales el arco sigue moviéndose 15–40 °/s al bajarlo, así que no se exige quietud total)
        long settle = -1;
        for (long w = 150; w + 250 <= POST_MS; w += 50) {
            double mg = meanGyro(e.t + w, e.t + w + 250);
            if (mg > 0 && mg < SETTLE_DPS) { settle = w; break; }
        }
        double dtMs = tt.size() > 1 ? (tt.get(tt.size() - 1) - tt.get(0)) / (tt.size() - 1) : 50;
        Map<String, Object> m = new java.util.HashMap<>();
        m.put("kind", "shot"); m.put("t", e.t); m.put("score", Math.round(score)); m.put("peak", Math.round(e.peak * 1000));
        m.put("instab", Math.round(sdM)); m.put("settle", settle); m.put("drawms", e.holdMs); m.put("sig", e.info);
        m.put("aim_sd_deg", round(aimSd)); m.put("aim_dx_deg", round(ref.yaw - yawZero)); m.put("aim_dy_deg", round(ref.pitch));
        m.put("dt", Math.max(1, Math.round(dtMs))); m.put("rate", Math.round(1000 / Math.max(1, dtMs)));
        m.put("clock", "sensor"); m.put("metric", 3); m.put("endIdx", endIndex);
        m.put("yw2", yw); m.put("pt", pt); m.put("tx", tx); m.put("ty", ty); m.put("trace_t", tt);
        m.put("mp", mp); m.put("pre_t", tt); m.put("mq", mq); m.put("post_t", postT); m.put("pyw", pyw); m.put("ppt", ppt);
        listener.onShot(m);
    }
    private static double round(double v) { return Math.round(v * 1000) / 1000.0; }
}
