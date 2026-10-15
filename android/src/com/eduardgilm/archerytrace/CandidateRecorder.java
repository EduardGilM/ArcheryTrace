package com.eduardgilm.archerytrace;

import java.io.File;
import java.io.FileWriter;
import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Locale;

// Captura siempre activa y ligera: guarda los últimos segundos de datos en memoria y, alrededor de cada
// candidato a tiro (aceptado o descartado, con el motivo), escribe un CSV corto en files/candidates/.
// Formato idéntico a RawLogger, así que se reproduce con ReplayCsvTest.
public final class CandidateRecorder {
    public static final long BEFORE_MS = 10000, AFTER_MS = 3000, KEEP_MS = BEFORE_MS + AFTER_MS + 1000;
    public static final int MAX_FILES = 150;
    private final ArrayDeque<float[]> ring = new ArrayDeque<>();
    private final ArrayDeque<Long> times = new ArrayDeque<>();
    private final List<String> labels = new ArrayList<>();
    private long pendingFrom = -1, dumpAt = -1;
    private final File dir;

    public CandidateRecorder(File dir) { this.dir = dir; }

    public synchronized void sample(WitParser.Sample s) {
        ring.addLast(new float[]{s.ax, s.ay, s.az, s.gx, s.gy, s.gz, s.roll, s.pitch, s.yaw});
        times.addLast(s.tMs);
        while (!times.isEmpty() && s.tMs - times.peekFirst() > KEEP_MS) { times.pollFirst(); ring.pollFirst(); }
        if (dumpAt >= 0 && s.tMs >= dumpAt) dump();
    }

    // t = instante del golpe; varios candidatos seguidos van al mismo archivo
    public synchronized void mark(long t, String label) {
        labels.add("E," + t + ",,,,,,,,,," + label.replace(',', ';').replace('\n', ' '));
        if (pendingFrom < 0) pendingFrom = t - BEFORE_MS;
        dumpAt = Math.max(dumpAt, t + AFTER_MS);
    }

    private void dump() {
        if (dir == null) { reset(); return; }
        StringBuilder sb = new StringBuilder(RawLogger.HEADER).append('\n');
        java.util.Iterator<Long> ti = times.iterator();
        for (float[] v : ring) {
            long t = ti.next();
            if (t < pendingFrom) continue;
            sb.append("S,").append(t);
            for (float x : v) sb.append(',').append(String.format(Locale.ROOT, "%.4f", x));
            sb.append(",\n");
        }
        for (String l : labels) sb.append(l).append('\n');
        final String body = sb.toString();
        final boolean shot = labels.toString().contains("shot");
        final String name = new java.text.SimpleDateFormat("yyyyMMdd-HHmmss", Locale.ROOT).format(new java.util.Date())
                + (shot ? "_shot" : "_reject") + ".csv";
        reset();
        new Thread(() -> {
            try {
                dir.mkdirs();
                try (FileWriter w = new FileWriter(new File(dir, name))) { w.write(body); }
                File[] fs = dir.listFiles();
                if (fs != null && fs.length > MAX_FILES) {
                    Arrays.sort(fs, (a, b) -> Long.compare(a.lastModified(), b.lastModified()));
                    for (int i = 0; i < fs.length - MAX_FILES; i++) fs[i].delete();
                }
            } catch (Exception ignored) { }
        }).start();
    }

    private void reset() { labels.clear(); pendingFrom = -1; dumpAt = -1; }
}
