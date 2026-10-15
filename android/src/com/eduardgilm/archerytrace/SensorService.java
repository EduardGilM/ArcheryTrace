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
    static final long SESSION_IDLE_MS = 20 * 60 * 1000;

    private final Handler handler = new Handler(Looper.getMainLooper());
    private SharedPreferences prefs;
    private BluetoothAdapter adapter;
    private BluetoothGatt gatt;
    private BluetoothGattCharacteristic writeChar;
    private boolean scanning;
    private WitParser parser;
    private ShotDetector detector;
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
            public void onShot(Map<String, Object> shot) { handler.post(() -> recordShot(shot)); }
            public void onLive(double x, double y, boolean steady, long hold) {
                MainActivity u = ui;
                if (u != null) u.push(String.format(java.util.Locale.ROOT, "window.sensorLive&&sensorLive(%.3f,%.3f,%b,%d,%.0f)", x, y, steady, hold, rateHz));
            }
        });
        detector.boreAxis = prefs.getInt("boreAxis", 0);
        detector.boreSign = prefs.getInt("boreSign", 1);
        detector.thresholdMg = prefs.getFloat("thresholdMg", 2500f);
        parser = new WitParser(s -> {
            samples++;
            long now = s.tMs;
            if (rateWindow == 0) rateWindow = now;
            if (now - rateWindow >= 2000) { rateHz = samples * 1000.0 / (now - rateWindow); samples = 0; rateWindow = now; if (rateHz > 5) parser.periodMs = 1000.0 / rateHz; }
            detector.onSample(s);
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
        if (ui != null) ui.drain();
    }

    // ---------- BLE ----------
    private void connect() {
        if (adapter == null || !adapter.isEnabled()) { status("Activa el Bluetooth"); handler.postDelayed(this::connect, 5000); return; }
        String addr = prefs.getString("address", "");
        if (!addr.isEmpty()) {
            status("Conectando con el sensor…");
            BluetoothDevice d = adapter.getRemoteDevice(addr);
            gatt = d.connectGatt(this, true, gattCallback, BluetoothDevice.TRANSPORT_LE);
        } else startScan();
    }

    private void startScan() {
        if (scanning || adapter == null || adapter.getBluetoothLeScanner() == null) return;
        scanning = true; status("Buscando sensor…");
        adapter.getBluetoothLeScanner().startScan(null, new ScanSettings.Builder().setScanMode(ScanSettings.SCAN_MODE_LOW_LATENCY).build(), scanCallback);
        handler.postDelayed(() -> { if (scanning) { stopScan(); status("Sensor no encontrado"); handler.postDelayed(this::startScan, 10000); } }, 20000);
    }
    private void stopScan() {
        scanning = false;
        try { adapter.getBluetoothLeScanner().stopScan(scanCallback); } catch (Exception ignored) { }
    }
    static boolean isWit(String name) {
        if (name == null) return false;
        String n = name.toUpperCase(java.util.Locale.ROOT);
        return n.startsWith("WT") || n.startsWith("BWT") || n.contains("WIT");
    }
    private final ScanCallback scanCallback = new ScanCallback() {
        @Override public void onScanResult(int type, ScanResult r) {
            String name = r.getScanRecord() != null ? r.getScanRecord().getDeviceName() : null;
            if (!scanning || !isWit(name)) return;
            stopScan();
            prefs.edit().putString("address", r.getDevice().getAddress()).putString("name", name).apply();
            handler.post(SensorService.this::connect);
        }
    };

    private final BluetoothGattCallback gattCallback = new BluetoothGattCallback() {
        @Override public void onConnectionStateChange(BluetoothGatt g, int st, int state) {
            if (state == BluetoothProfile.STATE_CONNECTED) {
                g.requestConnectionPriority(BluetoothGatt.CONNECTION_PRIORITY_HIGH);
                // a 200 Hz llegan notificaciones de 160 bytes: hace falta MTU grande
                if (!g.requestMtu(247)) g.discoverServices();
            } else if (state == BluetoothProfile.STATE_DISCONNECTED) {
                CONNECTED = false; writeChar = null;
                status("Sensor sin conexión");
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
            handler.post(() -> { ensureSession(); status("Sensor listo"); });
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
        long now = System.currentTimeMillis();
        if (!sid.isEmpty() && now - Math.max(lastShotAt, prefs.getLong("startedAt", 0)) < SESSION_IDLE_MS) return;
        if (!sid.isEmpty()) event("end", new HashMap<>());
        sid = (now / 1000) + "-trace"; eid = -1;
        prefs.edit().putString("sid", sid).putLong("startedAt", now).apply();
        Map<String, Object> m = new HashMap<>(); m.put("build", 1);
        event("start", m);
    }
    private void endSession() {
        if (sid.isEmpty()) return;
        event("end", new HashMap<>());
        sid = ""; prefs.edit().putString("sid", "").apply();
    }
    private void recordShot(Map<String, Object> shot) {
        ensureSession();
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
                case "rescan":
                    prefs.edit().remove("address").apply();
                    if (gatt != null) { gatt.close(); gatt = null; }
                    CONNECTED = false; startScan(); break;
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
        }
        return MainActivity.toJson(v);
    }

    @Override public int onStartCommand(Intent i, int flags, int id) { return START_STICKY; }
    @Override public void onDestroy() {
        instance = null; CONNECTED = false;
        handler.removeCallbacksAndMessages(null);
        stopScan();
        if (gatt != null) { try { gatt.close(); } catch (Exception ignored) { } }
        super.onDestroy();
    }
    @Override public IBinder onBind(Intent i) { return null; }
}
