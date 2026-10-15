import com.eduardgilm.archerytrace.*;
import java.io.*;
import java.util.*;

// Reproduce CSV crudos reales (fixtures) por el detector.
// javac -d /tmp/rp android/src/com/eduardgilm/archerytrace/{WitParser,ShotDetector}.java tools/tests/ReplayCsvTest.java && java -cp /tmp/rp ReplayCsvTest
public class ReplayCsvTest {
    static List<Map<String,Object>> replay(String path) throws IOException { return replay(path, 0); }
    // tremor > 0: añade temblor de principiante (senos de 4–9 Hz + ruido) de esa amplitud por eje, en °/s
    static List<Map<String,Object>> replay(String path, double tremor) throws IOException {
        Random rnd = new Random(7);
        List<Map<String,Object>> shots = new ArrayList<>();
        ShotDetector d = new ShotDetector(new ShotDetector.Listener() {
            public void onShot(Map<String,Object> s) { shots.add(s); }
            public void onLive(double x, double y, boolean st, long h) {}
        });
        try (BufferedReader r = new BufferedReader(new FileReader(path))) {
            String l;
            while ((l = r.readLine()) != null) {
                if (!l.startsWith("S,")) continue;
                String[] c = l.split(",", -1);
                WitParser.Sample s = new WitParser.Sample();
                s.tMs = Long.parseLong(c[1]);
                s.ax = Float.parseFloat(c[2]); s.ay = Float.parseFloat(c[3]); s.az = Float.parseFloat(c[4]);
                s.gx = Float.parseFloat(c[5]); s.gy = Float.parseFloat(c[6]); s.gz = Float.parseFloat(c[7]);
                if (tremor > 0) { double tt = s.tMs / 1000.0;
                    s.gx += (float) (tremor * Math.sin(2 * Math.PI * 4.3 * tt) + rnd.nextGaussian() * tremor * 0.3);
                    s.gy += (float) (tremor * Math.sin(2 * Math.PI * 6.1 * tt + 1) + rnd.nextGaussian() * tremor * 0.3);
                    s.gz += (float) (tremor * Math.sin(2 * Math.PI * 8.7 * tt + 2) + rnd.nextGaussian() * tremor * 0.3); }
                s.roll = Float.parseFloat(c[8]); s.pitch = Float.parseFloat(c[9]); s.yaw = Float.parseFloat(c[10]);
                d.onSample(s);
            }
        }
        return shots;
    }
    public static void main(String[] a) throws Exception {
        String dir = a.length > 0 ? a[0] : "tools/tests/fixtures/";
        List<Map<String,Object>> shots = replay(dir + "raw-3shots.csv");
        long t0 = firstT(dir + "raw-3shots.csv");
        for (Map<String,Object> s : shots)
            System.out.printf(Locale.ROOT, "tiro t=%.2fs hold=%sms score=%s sd=%s° settle=%sms dx=%s° dy=%s°%n",
                (((Number) s.get("t")).longValue() - t0) / 1000.0, s.get("drawms"), s.get("score"), s.get("aim_sd_deg"), s.get("settle"), s.get("aim_dx_deg"), s.get("aim_dy_deg"));
        if (shots.size() != 3) throw new AssertionError("esperaba 3 tiros, hay " + shots.size());
        double[] expect = {24.06, 48.92, 70.72};
        for (int i = 0; i < 3; i++) {
            double ts = (((Number) shots.get(i).get("t")).longValue() - t0) / 1000.0;
            if (Math.abs(ts - expect[i]) > 0.15) throw new AssertionError("tiro " + i + " en " + ts);
            if (((Number) shots.get(i).get("drawms")).longValue() < 3000) throw new AssertionError("sostenimiento corto");
        }
        List<Map<String,Object>> handling = replay(dir + "raw-handling.csv");
        if (!handling.isEmpty()) throw new AssertionError("manejo dio " + handling.size() + " tiros");
        System.out.println("OK 3 tiros reales y 0 en manejo");
        // principiante: mismos tiros con temblor añadido (media |giro| ≈ 10–25 °/s durante el apunte)
        for (double amp : new double[]{8, 14, 20}) {
            int n3 = replay(dir + "raw-3shots.csv", amp).size(), nh = replay(dir + "raw-handling.csv", amp).size();
            System.out.println("temblor " + amp + " °/s por eje -> " + n3 + " tiros, manejo " + nh);
            if (n3 != 3 || nh != 0) throw new AssertionError("temblor " + amp + ": " + n3 + "/" + nh);
        }
        System.out.println("OK principiante");
    }
    static long firstT(String path) throws IOException {
        try (BufferedReader r = new BufferedReader(new FileReader(path))) { String l; while ((l = r.readLine()) != null) if (l.startsWith("S,")) return Long.parseLong(l.split(",")[1]); }
        return 0;
    }
}
