import com.eduardgilm.archerytrace.*;
import java.util.*;

// Situaciones sin tiro: caminar con el arco, dejarlo en el soporte, poner la flecha. Ninguna debe contar.
public class ScenariosTest {
    static List<Map<String,Object>> shots = new ArrayList<>();
    static ShotDetector d; static long t = 1_000_000; static Random r = new Random(3);
    static void f(double ax, double ay, double az, double gx, double gy, double gz) {
        WitParser.Sample s = new WitParser.Sample(); s.tMs = t; t += 5;
        s.ax = (float) ax; s.ay = (float) ay; s.az = (float) az; s.gx = (float) gx; s.gy = (float) gy; s.gz = (float) gz;
        d.onSample(s);
    }
    static void fresh() { shots.clear(); d = new ShotDetector(new ShotDetector.Listener() {
        public void onShot(Map<String,Object> s) { shots.add(s); } public void onLive(double x, double y, boolean st, long h) {} }); }
    static void idle(int n, double trem) { for (int i = 0; i < n; i++) f(0, 0, 1, r.nextGaussian() * trem, r.nextGaussian() * trem, r.nextGaussian() * trem); }
    static void check(String name) { System.out.println(name + " -> " + shots.size()); if (!shots.isEmpty()) throw new AssertionError(name); }
    public static void main(String[] a) {
        // caminar: pasos a 2 Hz (golpes verticales de hasta 2,5 g) y balanceo 30–60 °/s, 30 s
        fresh();
        for (int i = 0; i < 6000; i++) { double ph = (i % 100) / 100.0; double step = ph < 0.06 ? 2.5 * Math.sin(Math.PI * ph / 0.06) : 0;
            f(0.2 * Math.sin(i / 30.0) + r.nextGaussian() * 0.1, 0.1 * r.nextGaussian(), 1 + step, 40 * Math.sin(i / 25.0) + r.nextGaussian() * 15, 30 * Math.cos(i / 40.0), r.nextGaussian() * 15); }
        check("caminar");
        // dejar en el soporte: bajar el arco, golpe vertical de 3 g, pequeño bamboleo y quieto
        fresh(); idle(600, 3);
        for (int i = 0; i < 300; i++) f(0, 0, 1, 50 * Math.sin(i / 20.0), 40, 10);
        for (int i = 0; i < 6; i++) f(0.3, 0.2, 4, 30, 20, 10);
        for (int i = 0; i < 400; i++) f(0, 0, 1, 25 * Math.cos(i / 4.0) * Math.exp(-i / 40.0), 0, 0);
        idle(4000, 0.3);
        check("soporte");
        // poner la flecha: arco bajado y quieto con temblor 15 °/s, golpecito de 2,5 g horizontal al encajar
        fresh(); idle(400, 15);
        for (int k = 0; k < 3; k++) { for (int i = 0; i < 4; i++) f(2.5, 0.8, 1, 20, 10, 5); idle(800, 15); }
        check("flecha");
        // golpe con el arco apoyado tras 30 s quieto
        fresh(); idle(6000, 0.3); for (int i = 0; i < 4; i++) f(3, 1, 1, 60, 200, 50);
        for (int i = 0; i < 400; i++) f(0, 0, 1, 60 * Math.cos(i / 3.0) * Math.exp(-i / 60.0), 0, 0);
        check("golpe en reposo");
        System.out.println("OK escenarios sin tiro");
    }
}
