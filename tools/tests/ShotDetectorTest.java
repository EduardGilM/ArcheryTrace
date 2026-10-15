import com.eduardgilm.archerytrace.*;
import java.util.*;

// javac -d /tmp/st android/src/com/eduardgilm/archerytrace/{WitParser,ShotDetector}.java tools/tests/ShotDetectorTest.java && java -cp /tmp/st ShotDetectorTest
public class ShotDetectorTest {
    static byte[] frame(double ax, double ay, double az, double gx, double gy, double gz) {
        short[] v = {(short)(ax/16*32768),(short)(ay/16*32768),(short)(az/16*32768),(short)(gx/2000*32768),(short)(gy/2000*32768),(short)(gz/2000*32768),0,0,0};
        byte[] b = new byte[20]; b[0]=0x55; b[1]=0x61;
        for (int i=0;i<9;i++){ b[2+i*2]=(byte)(v[i]&0xFF); b[3+i*2]=(byte)((v[i]>>8)&0xFF); }
        return b;
    }
    public static void main(String[] a) {
        List<Map<String,Object>> shots = new ArrayList<>();
        ShotDetector d = new ShotDetector(new ShotDetector.Listener() {
            public void onShot(Map<String,Object> s){ shots.add(s); }
            public void onLive(double x,double y,boolean st,long h){}
        });
        WitParser p = new WitParser(d::onSample);
        long t = 1_000_000; Random r = new Random(1);
        // sensor en el arco: +X hacia la diana, Z arriba
        for (int i=0;i<200;i++,t+=10) p.feed(frame(0,0,1,r.nextGaussian()*40,r.nextGaussian()*40,r.nextGaussian()*40), t); // apertura
        for (int i=0;i<250;i++,t+=10) p.feed(frame(0,0,1, 0, Math.sin(i/20.0)*2, Math.cos(i/25.0)*2), t);              // apunte quieto
        for (int i=0;i<4;i++,t+=10) p.feed(frame(4,0.5,1.5,50,300,120), t);                                           // suelta
        for (int i=0;i<200;i++,t+=10) p.feed(frame(0,0,1,30*Math.exp(-i/15.0),-20*Math.exp(-i/15.0),0), t);          // follow-through
        if (shots.size()!=1) throw new AssertionError("esperaba 1 flecha, hay "+shots.size());
        Map<String,Object> s = shots.get(0);
        long hold = ((Number)s.get("drawms")).longValue();
        if (hold < 2000) throw new AssertionError("sostenimiento corto: "+hold);
        if (((List<?>)s.get("yw2")).isEmpty() || ((List<?>)s.get("pyw")).isEmpty()) throw new AssertionError("sin traza");
        System.out.println("OK score="+s.get("score")+" hold="+hold+" peak="+s.get("peak")+" settle="+s.get("settle")+" rate="+s.get("rate")+" pre="+((List<?>)s.get("yw2")).size());
        // ruido de manejo sin sostener: ninguna flecha
        shots.clear();
        for (int i=0;i<300;i++,t+=10) p.feed(frame(r.nextGaussian()*3,0,1,r.nextGaussian()*200,0,0), t);
        if (!shots.isEmpty()) throw new AssertionError("falsa flecha sin sostener");
        System.out.println("OK sin falsos positivos");
        // 200 Hz real: 8 tramas por notificación de 160 bytes, cada una con su instante
        List<Long> ts = new ArrayList<>();
        WitParser b = new WitParser(x -> ts.add(x.tMs));
        byte[] pk = new byte[160];
        for (int k=0;k<8;k++) System.arraycopy(frame(0,0,1,0,0,0),0,pk,k*20,20);
        b.feed(pk, 10_000); b.feed(pk, 10_040);
        if (ts.size()!=16 || ts.get(7)!=10_000 || ts.get(0)!=9_965 || ts.get(8)!=10_005) throw new AssertionError("tiempos "+ts);
        System.out.println("OK lotes de 8 tramas");
    }
}
