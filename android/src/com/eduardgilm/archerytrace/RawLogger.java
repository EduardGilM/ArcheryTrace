package com.eduardgilm.archerytrace;

import java.io.BufferedWriter;
import java.io.File;
import java.io.FileOutputStream;
import java.io.OutputStreamWriter;
import java.nio.charset.StandardCharsets;
import java.util.Locale;

// CSV crudo: cada trama decodificada (S) y cada evento (E).
// Búfer grande en el servicio nativo; se vacía cada segundo y al cerrar.
public final class RawLogger {
    public static final String HEADER = "type,t_ms,ax_g,ay_g,az_g,gx_dps,gy_dps,gz_dps,roll_deg,pitch_deg,yaw_deg,event";
    private BufferedWriter out;
    private File file;
    private final StringBuilder sb = new StringBuilder(160);

    public synchronized File open(File dir, String name) {
        close();
        try {
            if (!dir.exists() && !dir.mkdirs()) return null;
            file = new File(dir, name + ".csv");
            out = new BufferedWriter(new OutputStreamWriter(new FileOutputStream(file, false), StandardCharsets.UTF_8), 1 << 16);
            out.write(HEADER); out.write('\n');
            return file;
        } catch (Exception e) { out = null; return null; }
    }
    public synchronized boolean isOpen() { return out != null; }
    public synchronized File file() { return file; }

    public synchronized void sample(WitParser.Sample s) {
        if (out == null) return;
        sb.setLength(0);
        sb.append("S,").append(s.tMs);
        f(s.ax); f(s.ay); f(s.az); f(s.gx); f(s.gy); f(s.gz); f(s.roll); f(s.pitch); f(s.yaw);
        sb.append(",\n");
        try { out.append(sb); } catch (Exception e) { out = null; }
    }
    private void f(float v) { sb.append(',').append(String.format(Locale.ROOT, "%.4f", v)); }

    public synchronized void event(long tMs, String what) {
        if (out == null) return;
        try { out.write("E," + tMs + ",,,,,,,,,," + what.replace(',', ';').replace('\n', ' ') + "\n"); } catch (Exception e) { out = null; }
    }
    public synchronized void flush() { try { if (out != null) out.flush(); } catch (Exception ignored) { } }
    public synchronized void close() {
        try { if (out != null) { out.flush(); out.close(); } } catch (Exception ignored) { }
        out = null;
    }

    // deja sólo los n archivos más nuevos de la carpeta (sólo archivos propios de la app)
    public static void prune(File dir, int n) {
        if (dir == null) return;
        File[] fs = dir.listFiles();
        if (fs == null || fs.length <= n) return;
        java.util.Arrays.sort(fs, (a, b) -> Long.compare(b.lastModified(), a.lastModified()));
        for (int i = n; i < fs.length; i++) fs[i].delete();
    }
}
