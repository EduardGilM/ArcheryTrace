package com.eduardgilm.archerytrace;

// Decodifica tramas WitMotion (WT901BLE y familia).
// BLE: 20 bytes 0x55 0x61 + 9 int16 LE (acel, giro, ángulo), sin checksum.
// Serie/USB: tramas de 11 bytes 0x55 0x51/0x52/0x53 con checksum de suma.
// Solo lectura: nunca escribe registros del sensor.
public final class WitParser {
    public interface Sink { void onSample(Sample s); }

    public static final class Sample {
        public long tMs;
        public float ax, ay, az;      // g
        public float gx, gy, gz;      // °/s
        public float roll, pitch, yaw; // ° (fusión interna del sensor)
    }

    private final byte[] buf = new byte[512];
    private int len = 0;
    private final Sink sink;
    private final Sample serial = new Sample();
    private boolean serialAcc, serialGyro;

    // A 200 Hz el sensor agrupa 8 tramas en una notificación de 160 bytes:
    // se reparten hacia atrás desde la llegada con este periodo (ms).
    public volatile double periodMs = 5;
    private final java.util.ArrayList<Sample> batch = new java.util.ArrayList<>();
    private long lastT = Long.MIN_VALUE;

    public WitParser(Sink sink) { this.sink = sink; }

    private static float i16(byte[] b, int o) { return (short) ((b[o] & 0xFF) | (b[o + 1] << 8)); }

    public void feed(byte[] data, long tMs) {
        for (byte v : data) {
            if (len == buf.length) { System.arraycopy(buf, 1, buf, 0, --len); }
            buf[len++] = v;
        }
        int i = 0;
        while (len - i >= 2) {
            if ((buf[i] & 0xFF) != 0x55) { i++; continue; }
            int type = buf[i + 1] & 0xFF;
            if (type == 0x61) {
                if (len - i < 20) break;
                Sample s = new Sample();
                s.tMs = tMs;
                s.ax = i16(buf, i + 2) / 32768f * 16f;
                s.ay = i16(buf, i + 4) / 32768f * 16f;
                s.az = i16(buf, i + 6) / 32768f * 16f;
                s.gx = i16(buf, i + 8) / 32768f * 2000f;
                s.gy = i16(buf, i + 10) / 32768f * 2000f;
                s.gz = i16(buf, i + 12) / 32768f * 2000f;
                s.roll = i16(buf, i + 14) / 32768f * 180f;
                s.pitch = i16(buf, i + 16) / 32768f * 180f;
                s.yaw = i16(buf, i + 18) / 32768f * 180f;
                batch.add(s);
                i += 20;
            } else if (type >= 0x50 && type <= 0x5F) {
                if (len - i < 11) break;
                int sum = 0;
                for (int k = 0; k < 10; k++) sum += buf[i + k] & 0xFF;
                if ((sum & 0xFF) != (buf[i + 10] & 0xFF)) { i++; continue; }
                float a = i16(buf, i + 2), b = i16(buf, i + 4), c = i16(buf, i + 6);
                if (type == 0x51) { serial.ax = a / 32768f * 16f; serial.ay = b / 32768f * 16f; serial.az = c / 32768f * 16f; serialAcc = true; }
                else if (type == 0x52) { serial.gx = a / 32768f * 2000f; serial.gy = b / 32768f * 2000f; serial.gz = c / 32768f * 2000f; serialGyro = true; }
                else if (type == 0x53) {
                    serial.roll = a / 32768f * 180f; serial.pitch = b / 32768f * 180f; serial.yaw = c / 32768f * 180f;
                    if (serialAcc && serialGyro) {
                        Sample s = new Sample();
                        s.tMs = tMs; s.ax = serial.ax; s.ay = serial.ay; s.az = serial.az;
                        s.gx = serial.gx; s.gy = serial.gy; s.gz = serial.gz;
                        s.roll = serial.roll; s.pitch = serial.pitch; s.yaw = serial.yaw;
                        batch.add(s);
                    }
                    serialAcc = serialGyro = false;
                }
                i += 11;
            } else i++;
        }
        if (i > 0) { System.arraycopy(buf, i, buf, 0, len - i); len -= i; }
        int n = batch.size();
        for (int k = 0; k < n; k++) {
            Sample s = batch.get(k);
            long t = Math.round(tMs - (n - 1 - k) * periodMs);
            if (lastT != Long.MIN_VALUE && t <= lastT) t = lastT + 1;
            s.tMs = lastT = t;
            sink.onSample(s);
        }
        batch.clear();
    }
}
