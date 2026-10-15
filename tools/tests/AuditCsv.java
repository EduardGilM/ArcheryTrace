import com.eduardgilm.archerytrace.*;
import java.io.*;
import java.util.*;

// Auditoría: reproduce cada CSV y lista cada candidato (aceptado o descartado) con los 4 rasgos.
// java -cp ... AuditCsv file1.csv file2.csv ...
public class AuditCsv {
    public static void main(String[] a) throws Exception {
        for (String f : a) {
            long[] t0 = {-1};
            List<String> rows = new ArrayList<>();
            ShotDetector d = new ShotDetector(new ShotDetector.Listener() {
                public void onShot(Map<String,Object> s) { rows.add(String.format(Locale.ROOT, "%8.2f  ACEPTADO   %s", (((Number) s.get("t")).longValue() - t0[0]) / 1000.0, s.get("sig"))); }
                public void onLive(double x, double y, boolean st, long h) {}
            });
            d.rejectSink = (t, why) -> rows.add(String.format(Locale.ROOT, "%8.2f  DESCARTADO %s", (t - t0[0]) / 1000.0, why));
            try (BufferedReader r = new BufferedReader(new FileReader(f))) {
                String l;
                while ((l = r.readLine()) != null) {
                    if (!l.startsWith("S,")) continue;
                    String[] c = l.split(",", -1);
                    WitParser.Sample s = new WitParser.Sample();
                    s.tMs = Long.parseLong(c[1]); if (t0[0] < 0) t0[0] = s.tMs;
                    s.ax = Float.parseFloat(c[2]); s.ay = Float.parseFloat(c[3]); s.az = Float.parseFloat(c[4]);
                    s.gx = Float.parseFloat(c[5]); s.gy = Float.parseFloat(c[6]); s.gz = Float.parseFloat(c[7]);
                    d.onSample(s);
                }
            }
            System.out.println("== " + new File(f).getName() + ": " + rows.size() + " candidatos");
            for (String x : rows) System.out.println(x);
        }
    }
}
