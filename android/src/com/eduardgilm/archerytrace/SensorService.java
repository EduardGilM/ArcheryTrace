package com.eduardgilm.archerytrace;

import android.annotation.SuppressLint;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.Service;
import android.bluetooth.BluetoothAdapter;
import android.bluetooth.BluetoothDevice;
import android.bluetooth.BluetoothGatt;
import android.bluetooth.BluetoothGattCallback;
import android.bluetooth.BluetoothGattCharacteristic;
import android.bluetooth.BluetoothGattDescriptor;
import android.bluetooth.BluetoothGattService;
import android.bluetooth.BluetoothManager;
import android.bluetooth.BluetoothProfile;
import android.bluetooth.le.ScanCallback;
import android.bluetooth.le.ScanResult;
import android.bluetooth.le.ScanSettings;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Handler;
import android.os.IBinder;
import android.os.Looper;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

// Servicio en primer plano: conecta por BLE con el inclinómetro WIT montado en el arco,
// detecta cada flecha y la conserva hasta que la UI confirma su almacenamiento.
@SuppressLint("MissingPermission")
public class SensorService extends Service {
    static EventQueue inbox, outbox;
    static SensorService instance;
    static volatile String STATUS = "";
    static volatile boolean CONNECTED = false;
    static volatile MainActivity ui;

    static final UUID NOTIFY = UUID.fromString("0000ffe4-0000-1000-8000-00805f9a34fb");
    static final UUID WRITE = UUID.fromString("0000ffe9-0000-1000-8000-00805f9a34fb");
    static final UUID CCCD = UUID.fromString("00002902-0000-1000-8000-00805f9b34fb");
    
    private final Handler handler = new Handler(Looper.getMainLooper());
    private SharedPreferences prefs;
    private BluetoothAdapter adapter;
    private BluetoothGatt gatt;
    private BluetoothGattCharacteristic writeChar;
    private boolean scanning;
    private WitParser parser;
    // Grabación cruda opcional (botón «Grabar datos»): un CSV nuevo al activarla o al empezar sesión.
    final RawLogger raw = new RawLogger();
    private final Runnable rawFlush = new Runnable() { public void run() { raw.flush(); handler.postDelayed(this, 1000); } };
    private void rawEvent(String what) { raw.event(System.currentTimeMillis(), what); }
    private boolean rawEnabled() { return prefs.getBoolean("rawLog", false); }
    private void openRaw() {
        if (!rawEnabled() || sid.isEmpty()) return;
        java.io.File dir = getExternalFilesDir("rawlogs");
        String stamp = new java.text.SimpleDateFormat("yyyyMMdd-HHmmss", java.util.Locale.ROOT).format(new java.util.Date());
        if (dir != null && raw.open(dir, stamp + "_" + sid) != null) {
            rawEvent("log_start sid=" + sid + " connected=" + CONNECTED + String.format(java.util.Locale.ROOT, " rate_hz=%.1f", rateHz));
            handler.removeCallbacks(rawFlush); handler.post(rawFlush);
        }
    }
    private void closeRaw(String why) {
        if (!raw.isOpen()) return;
        rawEvent("log_end " + why);
        raw.close(); handler.removeCallbacks(rawFlush);
    }
    private ShotDetector detector;
    private CandidateRecorder cands;
    private long lastSampleT;
    private String sid = "";
    private long eid = 0, lastShotAt = 0, samples = 0, rateWindow = 0;
    private double rateHz = 0;

    @Override public void onCreate() {
        super.onCreate();
        instance = this;
        prefs = getSharedPreferences("sensor", MODE_PRIVATE);
        SharedPreferences q = getSharedPreferences("inbox", MODE_PRIVATE);
        inbox = new EventQueue(new EventQueue.Disk() {
            public String read() { return q.getString("events", ""); }
            public boolean write(String value) { return q.edit().putString("events", value).commit(); }
        });
        outbox = new EventQueue(new EventQueue.Disk() {
            public String read() { return q.getString("commands", ""); }
            public boolean write(String value) { return q.edit().putString("commands", value).commit(); }
        });
        sid = prefs.getString("sid", ""); eid = prefs.getLong("eid", 0); lastShotAt = prefs.getLong("lastShotAt", 0);
        detector = new ShotDetector(new ShotDetector.Listener() {
            public void onShot(Map<String, Object> shot) { cands.mark(lastSampleT - ShotDetector.POST_MS, "shot hold=" + shot.get("drawms") + " score=" + shot.get("score")); handler.post(() -> recordShot(shot)); }
            public void onLive(double x, double y, boolean steady, long hold) { }
        });
        cands = new CandidateRecorder(getExternalFilesDir("candidates"));
        detector.rejectSink = (t, why) -> { raw.event(t, "reject " + why); cands.mark(t, "reject " + why); android.util.Log.i("ArcheryTraceShot", "descartado: " + why); };
        detector.boreAxis = prefs.getInt("boreAxis", 0);
        detector.boreSign = prefs.getInt("boreSign", 1);
        parser = new WitParser(s -> {
            samples++;
            long now = s.tMs;
            if (rateWindow == 0) rateWindow = now;
            if (now - rateWindow >= 2000) { rateHz = samples * 1000.0 / (now - rateWindow); samples = 0; rateWindow = now; if (rateHz > 5) parser.periodMs = 1000.0 / rateHz;
                raw.event(now, String.format(java.util.Locale.ROOT, "rate_hz=%.1f", rateHz)); }
            raw.sample(s);
            lastSampleT = s.tMs;
            detector.onSample(s);
            cands.sample(s);
        });
        NotificationManager nm = getSystemService(NotificationManager.class);
        if (nm.getNotificationChannel("live") == null)
            nm.createNotificationChannel(new NotificationChannel("live", "ArcheryTrace en vivo", NotificationManager.IMPORTANCE_LOW));
        startForeground(1, new Notification.Builder(this, "live")
            .setContentTitle("ArcheryTrace")
            .setContentText("Sensor del arco activo")
            .setSmallIcon(R.drawable.ic_notification)
            .setContentIntent(android.app.PendingIntent.getActivity(this, 0, new Intent(this, MainActivity.class), android.app.PendingIntent.FLAG_IMMUTABLE | android.app.PendingIntent.FLAG_UPDATE_CURRENT))
            .setOngoing(true).build());
        BluetoothManager bm = getSystemService(BluetoothManager.class);
        adapter = bm == null ? null : bm.getAdapter();
        connect();
        if (!sid.isEmpty()) { openRaw(); handler.postDelayed(endAfterGrace, GRACE_MS); }   // sesión abierta de antes de un reinicio
        if (ui != null) ui.drain();
    }

    // ---------- BLE ----------
    // Con un sensor recordado, connectGatt(autoConnect=true) deja al sistema esperar a que
    // aparezca (encendido = entrenando) sin escanear: bajo consumo y sin abrir la app.
    private void connect() {
        if (adapter == null || !adapter.isEnabled()) { status("Activa el Bluetooth"); handler.postDelayed(this::connect, 5000); return; }
        String addr = prefs.getString("address", "");
        if (addr.isEmpty()) { status("Sin sensor"); return; }
        if (gatt != null) { try { gatt.close(); } catch (Exception ignored) { } }
        status("Esperando al sensor");
        gatt = adapter.getRemoteDevice(addr).connectGatt(this, true, gattCallback, BluetoothDevice.TRANSPORT_LE);
    }

    // Escáner de emparejado (solo a petición de la UI): sensores WIT, con RSSI medio.
    private final Map<String, double[]> seen = new HashMap<>();   // addr -> [rssi medio, n]
    private final Map<String, String> seenName = new HashMap<>();
    private long lastScanPush = 0;
    private void startScan() {
        if (scanning || adapter == null || !adapter.isEnabled() || adapter.getBluetoothLeScanner() == null) return;
        scanning = true; seen.clear(); seenName.clear();
        adapter.getBluetoothLeScanner().startScan(null, new ScanSettings.Builder().setScanMode(ScanSettings.SCAN_MODE_LOW_LATENCY).build(), scanCallback);
        handler.postDelayed(this::stopScan, 30000);
    }
    private void stopScan() {
        if (!scanning) return;
        scanning = false;
        try { adapter.getBluetoothLeScanner().stopScan(scanCallback); } catch (Exception ignored) { }
        pushScan(true);
    }
    static boolean isWit(String name, java.util.List<android.os.ParcelUuid> uuids) {
        if (uuids != null) for (android.os.ParcelUuid u : uuids) if (u.getUuid().toString().startsWith("0000ffe5")) return true;
        if (name == null) return false;
        String n = name.toUpperCase(java.util.Locale.ROOT);
        return n.startsWith("WT") || n.startsWith("BWT") || n.startsWith("WIT");
    }
    private final ScanCallback scanCallback = new ScanCallback() {
        @Override public void onScanResult(int type, ScanResult r) {
            android.bluetooth.le.ScanRecord rec = r.getScanRecord();
            String name = rec != null ? rec.getDeviceName() : null;
            if (!scanning || !isWit(name, rec != null ? rec.getServiceUuids() : null)) return;
            String a = r.getDevice().getAddress();
            double[] v = seen.get(a);
            if (v == null) seen.put(a, new double[]{r.getRssi(), 1});
            else { v[0] += (r.getRssi() - v[0]) * 0.35; v[1]++; }   // media exponencial
            if (name != null) seenName.put(a, name);
            pushScan(false);
        }
    };
    private void pushScan(boolean done) {
        long now = System.currentTimeMillis();
        if (!done && now - lastScanPush < 250) return;
        lastScanPush = now;
        org.json.JSONArray list = new org.json.JSONArray();
        for (Map.Entry<String, double[]> e : seen.entrySet()) {
            try {
                list.put(new org.json.JSONObject().put("address", e.getKey()).put("name", seenName.getOrDefault(e.getKey(), "WIT"))
                    .put("rssi", Math.round(e.getValue()[0])).put("n", (int) e.getValue()[1]));
            } catch (Exception ignored) { }
        }
        MainActivity u = ui;
        if (u != null) u.push("window.sensorScan&&sensorScan(" + list + "," + done + ")");
    }
    private void pair(String address, String name) {
        stopScan();
        if (paused) { paused = false; try { adapter.getBluetoothLeScanner().stopScan(pauseCallback); } catch (Exception ignored) { } }
        prefs.edit().putString("address", address).putString("name", name == null ? "WIT" : name).apply();
        connect();
    }

    // "Desconectar": corta y cierra la sesión, pero sin olvidar el sensor. No se reconecta
    // mientras siga encendido (si no, volvería al instante); al apagarse, vuelve la conexión automática.
    private boolean paused;
    private long pausedSeen;
    private final ScanCallback pauseCallback = new ScanCallback() {
        @Override public void onScanResult(int type, ScanResult r) { pausedSeen = System.currentTimeMillis(); }
    };
    private final Runnable pauseCheck = new Runnable() {
        public void run() {
            if (!paused) return;
            if (System.currentTimeMillis() - pausedSeen > 30000) { resumeAuto(); return; }
            handler.postDelayed(this, 10000);
        }
    };
    private void disconnectUntilOff() {
        if (gatt != null) { try { gatt.disconnect(); gatt.close(); } catch (Exception ignored) { } gatt = null; }
        CONNECTED = false; writeChar = null;
        handler.removeCallbacks(endAfterGrace);
        endSession();
        String addr = prefs.getString("address", "");
        if (addr.isEmpty() || adapter == null || adapter.getBluetoothLeScanner() == null) return;
        paused = true; pausedSeen = System.currentTimeMillis();
        try {
            adapter.getBluetoothLeScanner().startScan(java.util.Collections.singletonList(new android.bluetooth.le.ScanFilter.Builder().setDeviceAddress(addr).build()),
                new ScanSettings.Builder().setScanMode(ScanSettings.SCAN_MODE_LOW_POWER).build(), pauseCallback);
        } catch (Exception ignored) { }
        handler.postDelayed(pauseCheck, 10000);
        status("Desconectado");
    }
    private void resumeAuto() {
        if (paused) { paused = false; try { adapter.getBluetoothLeScanner().stopScan(pauseCallback); } catch (Exception ignored) { } }
        connect();
    }

    // Sesiones automáticas: empieza al conectar; termina si el sensor sigue sin volver tras el margen.
    static final long GRACE_MS = 5 * 60 * 1000;   // un corte breve no parte la sesión
    private final Runnable endAfterGrace = () -> { if (!CONNECTED) { endSession(); status("Sensor apagado"); } };

    private final BluetoothGattCallback gattCallback = new BluetoothGattCallback() {
        @Override public void onConnectionStateChange(BluetoothGatt g, int st, int state) {
            if (state == BluetoothProfile.STATE_CONNECTED) {
                g.requestConnectionPriority(BluetoothGatt.CONNECTION_PRIORITY_HIGH);
                // a 200 Hz llegan notificaciones de 160 bytes: hace falta MTU grande
                if (!g.requestMtu(247)) g.discoverServices();
            } else if (state == BluetoothProfile.STATE_DISCONNECTED) {
                CONNECTED = false; writeChar = null;
                rawEvent("disconnect");
                status("Sensor sin conexión");
                handler.removeCallbacks(endAfterGrace);
                handler.postDelayed(endAfterGrace, GRACE_MS);
            }
        }
        @Override public void onMtuChanged(BluetoothGatt g, int mtu, int st) { g.discoverServices(); }
        @Override public void onServicesDiscovered(BluetoothGatt g, int st) {
            BluetoothGattCharacteristic notify = null;
            for (BluetoothGattService s : g.getServices()) {
                if (s.getCharacteristic(NOTIFY) != null) notify = s.getCharacteristic(NOTIFY);
                if (s.getCharacteristic(WRITE) != null) writeChar = s.getCharacteristic(WRITE);
            }
            if (notify == null) { status("Dispositivo sin canal WIT"); return; }
            g.setCharacteristicNotification(notify, true);
            BluetoothGattDescriptor d = notify.getDescriptor(CCCD);
            if (d != null) {
                if (android.os.Build.VERSION.SDK_INT >= 33) g.writeDescriptor(d, BluetoothGattDescriptor.ENABLE_NOTIFICATION_VALUE);
                else { d.setValue(BluetoothGattDescriptor.ENABLE_NOTIFICATION_VALUE); g.writeDescriptor(d); }
            }
            CONNECTED = true;
            handler.post(() -> { handler.removeCallbacks(endAfterGrace); ensureSession(); if (!raw.isOpen()) openRaw(); rawEvent("connect " + g.getDevice().getAddress()); status("Sensor listo"); });
        }
        // tras activar las notificaciones (y con el MTU ya negociado): 200 Hz volátil, nunca se guarda
        @Override public void onDescriptorWrite(BluetoothGatt g, BluetoothGattDescriptor d, int st) {
            if (CCCD.equals(d.getUuid()) && prefs.getBoolean("autoRate", true))
                handler.postDelayed(() -> setRate(200), 300);
        }
        @Override public void onCharacteristicChanged(BluetoothGatt g, BluetoothGattCharacteristic c, byte[] value) {
            parser.feed(value, android.os.SystemClock.elapsedRealtime() + bootOffset());
        }
        @SuppressWarnings("deprecation")
        @Override public void onCharacteristicChanged(BluetoothGatt g, BluetoothGattCharacteristic c) {
            if (android.os.Build.VERSION.SDK_INT < 33) parser.feed(c.getValue(), android.os.SystemClock.elapsedRealtime() + bootOffset());
        }
    };
    private long offset = Long.MIN_VALUE;
    private long bootOffset() { if (offset == Long.MIN_VALUE) offset = System.currentTimeMillis() - android.os.SystemClock.elapsedRealtime(); return offset; }

    // Frecuencia de salida: escritura VOLÁTIL (sin comando de guardado), solo bajo petición
    // explícita del usuario desde la app. Códigos WIT: 0x06=10Hz 0x07=20Hz 0x08=50Hz 0x09=100Hz 0x0B=200Hz.
    private boolean setRate(int hz) {
        if (gatt == null || writeChar == null) return false;
        int code = hz >= 200 ? 0x0B : hz >= 100 ? 0x09 : hz >= 50 ? 0x08 : hz >= 20 ? 0x07 : 0x06;
        write(new byte[]{(byte) 0xFF, (byte) 0xAA, 0x69, (byte) 0x88, (byte) 0xB5});
        handler.postDelayed(() -> write(new byte[]{(byte) 0xFF, (byte) 0xAA, 0x03, (byte) code, 0x00}), 150);
        return true;
    }
    @SuppressWarnings("deprecation")
    private void write(byte[] v) {
        if (gatt == null || writeChar == null) return;
        if (android.os.Build.VERSION.SDK_INT >= 33) gatt.writeCharacteristic(writeChar, v, BluetoothGattCharacteristic.WRITE_TYPE_DEFAULT);
        else { writeChar.setValue(v); gatt.writeCharacteristic(writeChar); }
    }

    // ---------- sesiones y eventos ----------
    private void ensureSession() {
        if (!sid.isEmpty()) return;
        long now = System.currentTimeMillis();
        sid = (now / 1000) + "-trace"; eid = -1;
        prefs.edit().putString("sid", sid).putLong("startedAt", now).apply();
        openRaw();
        rawEvent("session_start");
        Map<String, Object> m = new HashMap<>(); m.put("build", 1);
        event("start", m);
    }
    private void endSession() {
        if (sid.isEmpty()) return;
        rawEvent("session_end");
        closeRaw("session_end");
        event("end", new HashMap<>());
        sid = ""; prefs.edit().putString("sid", "").apply();
    }
    private void recordShot(Map<String, Object> shot) {
        android.util.Log.i("ArcheryTraceShot", "tiro hold=" + shot.get("drawms") + " score=" + shot.get("score") + " settle=" + shot.get("settle"));
        ensureSession();
        rawEvent("shot t=" + shot.get("t") + " peak_mg=" + shot.get("peak") + " score=" + shot.get("score") + " hold_ms=" + shot.get("drawms") + " settle_ms=" + shot.get("settle") + " end=" + shot.get("endIdx"));
        lastShotAt = System.currentTimeMillis();
        prefs.edit().putLong("lastShotAt", lastShotAt).apply();
        event("shot", shot);
    }
    private void event(String kind, Map<String, Object> m) {
        m.put("kind", kind); m.put("sid", sid); m.put("eid", ++eid);
        prefs.edit().putLong("eid", eid).apply();
        dispatch("liveEvent(" + MainActivity.toJson(m) + ")");
    }
    static void dispatch(String js) {
        try { inbox.offer(js); }
        catch (IllegalStateException e) { status(e.getMessage()); return; }
        if (ui != null) ui.drain();
    }

    // órdenes desde la UI: se aplican en el móvil; al sensor solo va la frecuencia (volátil)
    static void command(String json) {
        if (instance == null) throw new IllegalStateException("Conecta el sensor e inténtalo de nuevo");
        instance.handler.post(() -> instance.apply(json));
    }
    private void apply(String json) {
        try {
            org.json.JSONObject c = new org.json.JSONObject(json);
            String action = c.optString("action");
            switch (action) {
                case "remove": {
                    Map<String, Object> m = new HashMap<>();
                    org.json.JSONArray a = c.optJSONArray("value");
                    java.util.List<Object> times = new java.util.ArrayList<>();
                    if (a != null) for (int i = 0; i < a.length(); i++) times.add(a.get(i));
                    m.put("times", times); event("remove", m); break;
                }
                case "calibrateShot": {
                    double peak = c.optDouble("value", 0);
                    Map<String, Object> m = new HashMap<>();
                    if (peak > 150) {
                        detector.thresholdMg = peak * 0.6;
                        prefs.edit().putFloat("thresholdMg", (float) detector.thresholdMg).apply();
                        m.put("applied", true); m.put("result", "Umbral de suelta: " + Math.round(detector.thresholdMg) + " mG");
                    } else { m.put("applied", false); m.put("result", "Pico no válido"); }
                    m.put("requestId", c.optString("requestId")); event("calibration", m); break;
                }
                case "axis": {
                    int v = c.optInt("value", 0);   // 0..5: +X,+Y,+Z,-X,-Y,-Z
                    detector.boreAxis = v % 3; detector.boreSign = v >= 3 ? -1 : 1;
                    prefs.edit().putInt("boreAxis", detector.boreAxis).putInt("boreSign", detector.boreSign).apply(); break;
                }
                case "rate": if (!setRate(c.optInt("value", 50))) status("Sensor sin conexión"); break;
                case "end": endSession(); break;
                case "mark": rawEvent(c.optString("value", "mark")); break;
                case "rawlog": {
                    boolean on = c.optBoolean("value", false);
                    prefs.edit().putBoolean("rawLog", on).apply();
                    if (on) openRaw(); else closeRaw("user_off");
                    break;
                }
                case "scan": startScan(); break;
                case "stopScan": stopScan(); break;
                case "pair": pair(c.optString("value"), c.optString("name", "WIT")); break;
                case "disconnect": disconnectUntilOff(); break;
                case "connect": resumeAuto(); break;
                case "forget":
                    if (paused) { paused = false; try { adapter.getBluetoothLeScanner().stopScan(pauseCallback); } catch (Exception ignored) { } }
                    handler.removeCallbacks(endAfterGrace); endSession();
                    prefs.edit().remove("address").remove("name").apply();
                    if (gatt != null) { gatt.close(); gatt = null; }
                    CONNECTED = false; status("Sin sensor"); break;
                default: break; // modo, perfil, etc.: solo estado del móvil
            }
        } catch (Exception e) { status("Orden no válida"); }
    }

    static void status(String s) {
        STATUS = s;
        MainActivity u = ui;
        if (u != null) u.push("liveStatus(" + org.json.JSONObject.quote(s) + ")");
    }
    static String diagnostics() {
        Map<String, Object> v = new HashMap<>();
        v.put("status", STATUS); v.put("connected", CONNECTED);
        v.put("pending", inbox == null ? 0 : inbox.size()); v.put("commands", 0);
        v.put("version", 1);
        if (instance != null) {
            v.put("receivedAt", instance.lastShotAt); v.put("rate", Math.round(instance.rateHz));
            v.put("name", instance.prefs.getString("name", ""));
            v.put("paired", !instance.prefs.getString("address", "").isEmpty());
            v.put("session", !instance.sid.isEmpty());
            v.put("paused", instance.paused);
            v.put("rawLog", instance.rawEnabled());
            v.put("recording", instance.raw.isOpen());
            java.io.File f = instance.raw.file();
            if (f != null) v.put("rawFile", f.getAbsolutePath());
        }
        return MainActivity.toJson(v);
    }

    @Override public int onStartCommand(Intent i, int flags, int id) { return START_STICKY; }
    @Override public void onDestroy() {
        instance = null; CONNECTED = false;
        handler.removeCallbacksAndMessages(null);
        stopScan();
        closeRaw("service_stop");
        if (gatt != null) { try { gatt.close(); } catch (Exception ignored) { } }
        super.onDestroy();
    }
    @Override public IBinder onBind(Intent i) { return null; }
}
