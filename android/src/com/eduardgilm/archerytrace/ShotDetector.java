package com.eduardgilm.archerytrace;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

// Análisis tipo shot-trainer: orientación de puntería independiente del montaje,
// traza de apunte en vivo, detección de la suelta y métricas por flecha
// (sostenimiento, suelta y follow-through).
public final class ShotDetector {
    public interface Listener {
        void onShot(Map<String, Object> shot);
        void onLive(double aimX, double aimY, boolean steady, long holdMs);
    }

    // eje del sensor que apunta hacia la diana (0=X, 1=Y, 2=Z), con signo
    public int boreAxis = 0;
    public int boreSign = 1;
    public double thresholdMg = 2500;   // salto de |a|-1g que cuenta como suelta
    public double gyroShotDps = 250;    // alternativa: pico de giro tras sostener
    static final long PRE_MS = 3000, POST_MS = 1200, REFRACTORY_MS = 2500;
    static final double STEADY_DPS = 12;

    private final Listener listener;
    private final List<Pt> hist = new ArrayList<>();
    private double ux = 0, uy = 0, uz = 1;   // vertical (arriba) en marco sensor
    private double yaw = 0, pitch = 0;        // ángulo de apunte (°)
    private long lastT = -1, steadySince = -1, lastShot = -1, lastLive = 0;
    private Pending pending;

    static final class Pt { long t; double yaw, pitch, mag, gyro; }
    static final class Pending { long t; int idx; double peak; long holdMs; }

    public ShotDetector(Listener l) { listener = l; }

    private double bore(double x, double y, double z) {
        return (boreAxis == 0 ? x : boreAxis == 1 ? y : z) * boreSign;
    }

    public void onSample(WitParser.Sample s) {
        long t = s.tMs;
        double dt = lastT < 0 ? 0 : Math.min(0.2, (t - lastT) / 1000.0);
        lastT = t;
        double mag = Math.sqrt(s.ax * s.ax + s.ay * s.ay + s.az * s.az);
        double gyro = Math.sqrt(s.gx * s.gx + s.gy * s.gy + s.gz * s.gz);
        // vertical: paso bajo del acelerómetro solo cuando está cerca de 1 g
        if (mag > 0.85 && mag < 1.15) {
            double k = lastT < 0 || dt == 0 ? 1 : 0.04;
            ux += k * (s.ax / mag - ux); uy += k * (s.ay / mag - uy); uz += k * (s.az / mag - uz);
            double n = Math.sqrt(ux * ux + uy * uy + uz * uz); ux /= n; uy /= n; uz /= n;
        }
        // eje de puntería y eje lateral en marco sensor
        double bx = boreAxis == 0 ? boreSign : 0, by = boreAxis == 1 ? boreSign : 0, bz = boreAxis == 2 ? boreSign : 0;
        double rx = by * uz - bz * uy, ry = bz * ux - bx * uz, rz = bx * uy - by * ux;
        double rn = Math.sqrt(rx * rx + ry * ry + rz * rz);
        if (rn > 1e-3) { rx /= rn; ry /= rn; rz /= rn; }
        // giro a izquierda/derecha = ω·arriba ; arriba/abajo = ω·lateral
        yaw += -(s.gx * ux + s.gy * uy + s.gz * uz) * dt;
        pitch += (s.gx * rx + s.gy * ry + s.gz * rz) * dt;
        if (mag > 0.9 && mag < 1.1) {
            double accPitch = Math.toDegrees(Math.asin(Math.max(-1, Math.min(1, bore(ux, uy, uz)))));
            pitch += 0.02 * (accPitch - pitch);
        }
        Pt p = new Pt(); p.t = t; p.yaw = yaw; p.pitch = pitch; p.mag = mag * 1000; p.gyro = gyro;
        hist.add(p);
        while (!hist.isEmpty() && t - hist.get(0).t > PRE_MS + POST_MS + 1000) hist.remove(0);

        long holdBefore = steadySince < 0 ? 0 : t - steadySince;   // sostenimiento hasta la muestra anterior
        if (pending == null) { if (gyro < STEADY_DPS) { if (steadySince < 0) steadySince = t; } else steadySince = -1; }
        long holdMs = steadySince < 0 ? 0 : t - steadySince;

        if (pending == null && (lastShot < 0 || t - lastShot > REFRACTORY_MS)) {
            double jump = Math.abs(mag - 1) * 1000;
            if (holdBefore >= 500 && (jump > thresholdMg || gyro > gyroShotDps)) {
                pending = new Pending(); pending.t = t; pending.idx = hist.size() - 1; pending.peak = jump; pending.holdMs = holdBefore;
            }
        }
        if (pending != null) {
            pending.peak = Math.max(pending.peak, Math.abs(mag - 1) * 1000);
            if (t - pending.t >= POST_MS) { emit(pending); lastShot = pending.t; pending = null; steadySince = -1; }
        }
        if (t - lastLive >= 50) { lastLive = t; listener.onLive(yaw, pitch, gyro < STEADY_DPS, holdMs); }
    }

    private void emit(Pending e) {
        List<Double> yw = new ArrayList<>(), pt = new ArrayList<>(), mp = new ArrayList<>(), tt = new ArrayList<>(), tx = new ArrayList<>(), ty = new ArrayList<>();
        List<Double> pyw = new ArrayList<>(), ppt = new ArrayList<>(), mq = new ArrayList<>(), postT = new ArrayList<>();
        e.idx = 0;
        while (e.idx < hist.size() - 1 && hist.get(e.idx).t < e.t) e.idx++;
        Pt rel = hist.get(e.idx);
        // la referencia está en el instante previo a la suelta (último punto quieto)
        Pt ref = e.idx > 0 ? hist.get(e.idx - 1) : rel;
        double sumX = 0, sumY = 0, sumX2 = 0, sumY2 = 0, sumM = 0, sumM2 = 0; int n = 0;
        for (int i = 0; i < hist.size(); i++) {
            Pt q = hist.get(i); long d = q.t - e.t;
            if (d < -PRE_MS) continue;
            if (i < e.idx) {
                yw.add(round(q.yaw)); pt.add(round(q.pitch)); mp.add((double) Math.round(q.mag)); tt.add((double) d);
                tx.add(round((q.yaw - ref.yaw) * 17.45)); ty.add(round((q.pitch - ref.pitch) * 17.45));
                if (d >= -1000) { double x = q.yaw - ref.yaw, y = q.pitch - ref.pitch; sumX += x; sumY += y; sumX2 += x * x; sumY2 += y * y; sumM += q.mag; sumM2 += q.mag * q.mag; n++; }
            } else if (d > 0) {
                pyw.add(round(q.yaw)); ppt.add(round(q.pitch)); mq.add((double) Math.round(q.mag)); postT.add((double) d);
            }
        }
        double sdX = n > 1 ? Math.sqrt(Math.max(0, sumX2 / n - (sumX / n) * (sumX / n))) : 0;
        double sdY = n > 1 ? Math.sqrt(Math.max(0, sumY2 / n - (sumY / n) * (sumY / n))) : 0;
        double sdM = n > 1 ? Math.sqrt(Math.max(0, sumM2 / n - (sumM / n) * (sumM / n))) : 0;
        double aimSd = Math.hypot(sdX, sdY);
        // ajuste: 0.05° → ~90, 0.25° → ~60, 0.6° → ~30
        double score = Math.max(0, Math.min(100, 100 * Math.exp(-aimSd / 0.5)));
        long settle = -1;
        for (int i = e.idx + 1; i < hist.size(); i++) {
            Pt q = hist.get(i); if (q.t - e.t < 100) continue;
            boolean calm = true;
            for (int j = i; j < hist.size() && hist.get(j).t - q.t < 200; j++) if (hist.get(j).gyro > STEADY_DPS * 2) { calm = false; break; }
            if (calm) { settle = q.t - e.t; break; }
        }
        double dtMs = tt.size() > 1 ? (tt.get(tt.size() - 1) - tt.get(0)) / (tt.size() - 1) : 50;
        Map<String, Object> m = new java.util.HashMap<>();
        m.put("kind", "shot"); m.put("t", e.t); m.put("score", Math.round(score)); m.put("peak", Math.round(e.peak));
        m.put("instab", Math.round(sdM)); m.put("settle", settle); m.put("drawms", e.holdMs);
        m.put("dt", Math.max(1, Math.round(dtMs))); m.put("rate", Math.round(1000 / Math.max(1, dtMs)));
        m.put("clock", "sensor"); m.put("metric", 2);
        m.put("yw2", yw); m.put("pt", pt); m.put("tx", tx); m.put("ty", ty); m.put("trace_t", tt);
        m.put("mp", mp); m.put("pre_t", tt); m.put("mq", mq); m.put("post_t", postT); m.put("pyw", pyw); m.put("ppt", ppt);
        listener.onShot(m);
    }

    private static double round(double v) { return Math.round(v * 1000) / 1000.0; }
}
