import java.io.*;
import java.nio.file.*;
import java.util.*;

// Criterio de aceptación: cada grabación real listada en fixtures/expected.txt debe dar exactamente sus tiros reales.
// Las capturas automáticas *_shot.csv confirmadas se añaden a expected.txt con su número (normalmente 1).
public class AllRecordingsTest {
    public static void main(String[] a) throws Exception {
        String dir = a.length > 0 ? a[0] : "tools/tests/fixtures/";
        int bad = 0, files = 0;
        for (String l : Files.readAllLines(Paths.get(dir, "expected.txt"))) {
            l = l.trim(); if (l.isEmpty() || l.startsWith("#")) continue;
            String[] p = l.split("\\s+"); int want = Integer.parseInt(p[1]);
            int got = ReplayCsvTest.replay(dir + p[0]).size(); files++;
            System.out.println((got == want ? "OK   " : "FALLO") + " " + p[0] + ": " + got + " de " + want);
            if (got != want) bad++;
        }
        if (bad > 0) throw new AssertionError(bad + " grabaciones fallan");
        System.out.println("OK " + files + " grabaciones");
    }
}
