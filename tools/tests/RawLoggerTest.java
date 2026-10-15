import com.eduardgilm.archerytrace.*;
import java.io.File;
import java.nio.file.Files;
import java.util.List;

// javac -d /tmp/rt android/src/com/eduardgilm/archerytrace/{WitParser,RawLogger}.java tools/tests/RawLoggerTest.java && java -cp /tmp/rt RawLoggerTest
public class RawLoggerTest {
    public static void main(String[] a) throws Exception {
        File dir = Files.createTempDirectory("rawlogs").toFile();
        RawLogger log = new RawLogger();
        if (log.open(dir, "test") == null) throw new AssertionError("no abre");
        WitParser p = new WitParser(log::sample);
        byte[] pk = new byte[160];
        for (int k = 0; k < 8; k++) { pk[k*20] = 0x55; pk[k*20+1] = 0x61; pk[k*20+6] = 0x00; pk[k*20+7] = 0x08; } // az = 1 g
        long t0 = System.nanoTime();
        log.event(1000, "connect AA:BB");
        for (int i = 0; i < 250; i++) p.feed(pk, 1000 + i * 40L);      // 10 s a 200 Hz = 2000 tramas
        log.event(11000, "shot t=10999, peak_mg=3000");
        log.close();
        double ms = (System.nanoTime() - t0) / 1e6;
        List<String> lines = Files.readAllLines(new File(dir, "test.csv").toPath());
        long s = lines.stream().filter(l -> l.startsWith("S,")).count(), e = lines.stream().filter(l -> l.startsWith("E,")).count();
        if (!lines.get(0).equals(RawLogger.HEADER) || s != 2000 || e != 2) throw new AssertionError("filas S=" + s + " E=" + e);
        if (!lines.get(2).endsWith(",0.0000,0.0000,1.0000,0.0000,0.0000,0.0000,0.0000,0.0000,0.0000,")) throw new AssertionError(lines.get(2));
        if (lines.get(lines.size()-1).split(",", -1).length != 12) throw new AssertionError("columnas evento");
        System.out.println("OK raw log: " + s + " tramas + " + e + " eventos en " + Math.round(ms) + " ms; ej: " + lines.get(2));
    }
}
