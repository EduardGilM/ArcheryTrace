package com.eduardgilm.archerytrace;

import android.app.Activity;
import android.content.Intent;
import android.os.Bundle;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import java.util.Map;

public class MainActivity extends Activity {
    private WebView wv;
    private boolean started;
    private boolean pageReady;  // el drain antes de que cargue la página pierde los eventos
    private boolean draining;
    private CoachClient coach;
    private android.webkit.ValueCallback<android.net.Uri[]> fileCallback;

    @Override protected void onCreate(Bundle b) {
        super.onCreate(b);
        wv = new WebView(this);
        setContentView(wv);
        coach = new CoachClient(this, (id, result, error) -> push("CoachUI.receive(" + org.json.JSONObject.quote(id) + "," + org.json.JSONObject.quote(result) + "," + org.json.JSONObject.quote(error) + ")"));
        WebSettings s = wv.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);  // sin esto localStorage es null y el historial/live revientan
        wv.setWebChromeClient(new android.webkit.WebChromeClient() {
            // errores reales de JS a logcat (window.onerror solo ve "Script error." en file://)
            @Override public boolean onConsoleMessage(android.webkit.ConsoleMessage m) {
                if (m.messageLevel() == android.webkit.ConsoleMessage.MessageLevel.ERROR || m.messageLevel() == android.webkit.ConsoleMessage.MessageLevel.WARNING)
                    android.util.Log.w("ArcheryTraceJS", m.message() + " @" + m.sourceId() + ":" + m.lineNumber());
                return false;
            }
            @Override public boolean onJsConfirm(WebView view, String url, String message, android.webkit.JsResult result) {
                new android.app.AlertDialog.Builder(MainActivity.this).setMessage(message)
                    .setNegativeButton("Cancelar", (dialog, which) -> result.cancel())
                    .setPositiveButton("Confirmar", (dialog, which) -> result.confirm())
                    .setOnCancelListener(dialog -> result.cancel()).show();
                return true;
            }
            @Override public boolean onShowFileChooser(WebView view, android.webkit.ValueCallback<android.net.Uri[]> callback, FileChooserParams params) {
                if (fileCallback != null) fileCallback.onReceiveValue(null);
                fileCallback = callback;
                if (params != null && params.isCaptureEnabled()) openCamera();
                else openGallery();
                return true;
            }
        });
        // Solo recursos empaquetados en la aplicación.
        s.setAllowFileAccess(false);
        s.setAllowContentAccess(true);
        s.setAllowFileAccessFromFileURLs(false);
        s.setAllowUniversalAccessFromFileURLs(false);
        s.setBlockNetworkLoads(true);
        WebView.setWebContentsDebuggingEnabled((getApplicationInfo().flags & android.content.pm.ApplicationInfo.FLAG_DEBUGGABLE) != 0);
        wv.setWebViewClient(new WebViewClient() {
            @Override public void onPageFinished(WebView v, String url) { pageReady = true; deliverExportError(); drain(); }
            @Override public boolean shouldOverrideUrlLoading(WebView v, android.webkit.WebResourceRequest request) { return true; }
        });
        wv.addJavascriptInterface(new Bridge(), "Native");
        wv.loadUrl("file:///android_asset/index.html");
    }

    // drenar estado y tiros recibidos mientras la UI no estaba lista/visible
    void drain() {
        runOnUiThread(() -> {
            if (!pageReady || draining || SensorService.ui != this || SensorService.inbox == null) return;
            EventQueue.Entry e = SensorService.inbox.peek();
            if (e == null) return;
            draining = true;
            wv.evaluateJavascript("receiveNative(" + e.id + ",()=>{" + e.js + "})", result -> {
                draining = false;
                if ("true".equals(result)) {
                    try { SensorService.inbox.ack(e.id); drain(); }
                    catch (IllegalStateException error) { SensorService.status(error.getMessage()); }
                }
            });
        });
    }

    @Override protected void onResume() {
        super.onResume();
        SensorService.ui = this;
        if (pageReady) push("if(typeof CoachUI!=='undefined')CoachUI.resume()");
        if (pageReady) drain();  // sin página cargada, el drain se pierde: espera a onPageFinished
        if (pageReady) push("liveStatus(" + org.json.JSONObject.quote(SensorService.STATUS) + ")");
        // el FGS connectedDevice exige los permisos de Bluetooth concedidos
        if (!started && hasBlePermissions()) {
            started = true;
            startForegroundService(new Intent(this, SensorService.class));
        } else if (!started) {
            requestPermissions(blePermissions(), 1);
        }
    }
    private String[] blePermissions() {
        if (android.os.Build.VERSION.SDK_INT >= 33) return new String[]{"android.permission.BLUETOOTH_SCAN", "android.permission.BLUETOOTH_CONNECT", "android.permission.POST_NOTIFICATIONS"};
        if (android.os.Build.VERSION.SDK_INT >= 31) return new String[]{"android.permission.BLUETOOTH_SCAN", "android.permission.BLUETOOTH_CONNECT"};
        return new String[]{"android.permission.ACCESS_FINE_LOCATION"};
    }
    private boolean hasBlePermissions() {
        for (String p : blePermissions())
            if (!p.endsWith("NOTIFICATIONS") && checkSelfPermission(p) != android.content.pm.PackageManager.PERMISSION_GRANTED) return false;
        return true;
    }

    @Override protected void onPause() {
        SensorService.ui = null;
        super.onPause();
    }

    @Override protected void onDestroy() { if (coach != null) coach.close(); super.onDestroy(); }

    void push(final String js) {
        runOnUiThread(new Runnable() { @Override public void run() {
            if (pageReady) wv.evaluateJavascript(js, null);
        } });
    }

    private final Object exportLock = new Object();
    private String exportError;
    private java.io.File exportFile() { return new java.io.File(getFilesDir(), "export-pending.json"); }
    // El selector de documentos puede recrear la actividad: el JSON no cabe en el estado guardado.
    private void discardExport() {
        java.io.File file = exportFile();
        if (file.exists() && !file.delete()) file.deleteOnExit();
    }
    private void noticeExport(String message) { runOnUiThread(() -> { exportError = message; deliverExportError(); }); }
    // Si el selector recrea la actividad, la página aún no está lista y el aviso se perdería.
    private void deliverExportError() {
        if (!pageReady || exportError == null) return;
        String message = exportError;
        exportError = null;
        push("notice(" + org.json.JSONObject.quote(message) + ")");
    }
    public class Bridge {
        @android.webkit.JavascriptInterface public String chatCoach(String id, String json) { return coach.ask(id, json); }
        @android.webkit.JavascriptInterface public String diagnostics() { return SensorService.diagnostics(); }
        @android.webkit.JavascriptInterface public String command(String json) {
            try { SensorService.command(json); return ""; } catch(Exception e) { return e.getMessage(); }
        }
        // Copia: escritura nativa directa (sin selector de archivos, que dejaba documentos de 0 bytes si el
        // resultado no llegaba a escribirse). Se guarda en Descargas vía MediaStore, se comprueba el tamaño y se ofrece compartir.
        @android.webkit.JavascriptInterface public void export(String json) {
            if (json == null || json.isEmpty()) { noticeExport("No se pudo preparar la copia"); return; }
            synchronized (exportLock) {
                try {
                    byte[] bytes = json.getBytes(java.nio.charset.StandardCharsets.UTF_8);
                    java.io.File cache = new java.io.File(getCacheDir(), "backup.json");
                    try (java.io.FileOutputStream out = new java.io.FileOutputStream(cache)) { out.write(bytes); out.getFD().sync(); }
                    if (cache.length() != bytes.length) throw new java.io.IOException("copia incompleta");
                    String name = "ArcheryTrace-" + new java.text.SimpleDateFormat("yyyyMMdd-HHmm", java.util.Locale.ROOT).format(new java.util.Date()) + ".json";
                    String where = saveToDownloads(name, bytes);
                    final String msg = "Copia guardada en " + where + " (" + Math.max(1, bytes.length / 1024) + " KB)";
                    runOnUiThread(() -> {
                        push("notice(" + org.json.JSONObject.quote(msg) + ")");
                        try {
                            android.net.Uri uri = android.net.Uri.parse("content://com.eduardgilm.archerytrace.share/backup.json");
                            Intent send = new Intent(Intent.ACTION_SEND).setType("application/json");
                            send.putExtra(Intent.EXTRA_STREAM, uri);
                            send.putExtra(Intent.EXTRA_TITLE, name);
                            send.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
                            send.setClipData(android.content.ClipData.newRawUri(name, uri));
                            startActivity(Intent.createChooser(send, "Compartir copia"));
                        } catch (Exception ignored) { }
                    });
                } catch (Exception e) {
                    android.util.Log.w("ArcheryTraceJS", "export: " + e);
                    noticeExport("No se pudo guardar la copia: " + e.getMessage());
                }
            }
        }
        @android.webkit.JavascriptInterface public void restore() {
            runOnUiThread(() -> startActivityForResult(new Intent(Intent.ACTION_OPEN_DOCUMENT).setType("application/json").addCategory(Intent.CATEGORY_OPENABLE), 21));
        }
        @android.webkit.JavascriptInterface public void sharePng(String data) {
            try {
                String raw = data == null ? "" : data;
                int comma = raw.indexOf(',');
                if (raw.startsWith("data:") && comma >= 0) raw = raw.substring(comma + 1);
                byte[] bytes = android.util.Base64.decode(raw, android.util.Base64.DEFAULT);
                boolean jpeg = bytes.length > 2 && (bytes[0] & 0xFF) == 0xFF && (bytes[1] & 0xFF) == 0xD8;
                final String type = jpeg ? "image/jpeg" : "image/png";
                final String name = jpeg ? "archerytrace.jpg" : "archerytrace.png";
                try (java.io.FileOutputStream out = new java.io.FileOutputStream(new java.io.File(getCacheDir(), "share.png"))) { out.write(bytes); }
                runOnUiThread(() -> {
                    try {
                        android.net.Uri uri = android.net.Uri.parse("content://com.eduardgilm.archerytrace.share/share.png");
                        Intent send = new Intent(Intent.ACTION_SEND);
                        send.setType(type);
                        send.putExtra(Intent.EXTRA_STREAM, uri);
                        send.putExtra(Intent.EXTRA_TITLE, name);
                        send.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
                        send.setClipData(android.content.ClipData.newRawUri("ArcheryTrace", uri));
                        startActivity(Intent.createChooser(send, "Compartir"));
                    } catch (Exception e) {
                        push("notice(" + org.json.JSONObject.quote("No se pudo compartir") + ")");
                    }
                });
            } catch (Exception e) {
                runOnUiThread(() -> push("notice(" + org.json.JSONObject.quote("No se pudo compartir") + ")"));
            }
        }
    }
    // Descargas: MediaStore en Android 10+; antes, la carpeta Descargas propia de la app (sin permisos).
    private String saveToDownloads(String name, byte[] bytes) throws java.io.IOException {
        if (android.os.Build.VERSION.SDK_INT >= 29) {
            android.content.ContentValues v = new android.content.ContentValues();
            v.put(android.provider.MediaStore.MediaColumns.DISPLAY_NAME, name);
            v.put(android.provider.MediaStore.MediaColumns.MIME_TYPE, "application/json");
            v.put(android.provider.MediaStore.MediaColumns.RELATIVE_PATH, android.os.Environment.DIRECTORY_DOWNLOADS);
            v.put(android.provider.MediaStore.MediaColumns.IS_PENDING, 1);
            android.content.ContentResolver cr = getContentResolver();
            android.net.Uri uri = cr.insert(android.provider.MediaStore.Downloads.EXTERNAL_CONTENT_URI, v);
            if (uri == null) throw new java.io.IOException("sin acceso a Descargas");
            try {
                try (java.io.OutputStream out = cr.openOutputStream(uri, "w")) {
                    if (out == null) throw new java.io.IOException("sin destino");
                    out.write(bytes); out.flush();
                }
                v.clear(); v.put(android.provider.MediaStore.MediaColumns.IS_PENDING, 0);
                cr.update(uri, v, null, null);
                long size = -1;
                try (android.database.Cursor c = cr.query(uri, new String[]{android.provider.MediaStore.MediaColumns.SIZE}, null, null, null)) {
                    if (c != null && c.moveToFirst()) size = c.getLong(0);
                }
                if (size >= 0 && size != bytes.length) throw new java.io.IOException("tamaño " + size + " de " + bytes.length);
            } catch (java.io.IOException e) { try { cr.delete(uri, null, null); } catch (Exception ignored) {} throw e; }
            return "Descargas/" + name;
        }
        java.io.File dir = getExternalFilesDir(android.os.Environment.DIRECTORY_DOWNLOADS);
        if (dir == null) throw new java.io.IOException("sin almacenamiento");
        java.io.File f = new java.io.File(dir, name);
        try (java.io.FileOutputStream out = new java.io.FileOutputStream(f)) { out.write(bytes); out.getFD().sync(); }
        return f.getAbsolutePath();
    }
    private void finishExport(int result, Intent intent) {
        synchronized (exportLock) {
            if (result != RESULT_OK || intent == null || intent.getData() == null) { discardExport(); return; }
            java.io.File file = exportFile();
            android.net.Uri uri = intent.getData();
            if (!file.isFile()) { noticeExport("No se pudo guardar la copia"); return; }
            try {
                java.io.OutputStream opened = getContentResolver().openOutputStream(uri);
                if (opened == null) throw new java.io.IOException("sin destino");
                try (java.io.InputStream in = new java.io.FileInputStream(file); java.io.OutputStream out = opened) {
                    byte[] buffer = new byte[8192]; int n;
                    while ((n = in.read(buffer)) != -1) out.write(buffer, 0, n);
                }
                discardExport();
            } catch (Exception e) {
                discardExport();
                try { android.provider.DocumentsContract.deleteDocument(getContentResolver(), uri); } catch (Exception ignored) {}
                noticeExport("No se pudo guardar la copia");
            }
        }
    }
    private void cancelFile() {
        if (fileCallback != null) { fileCallback.onReceiveValue(null); fileCallback = null; }
    }
    private void openGallery() {
        try {
            Intent pick = new Intent(Intent.ACTION_GET_CONTENT);
            pick.setType("image/*");
            pick.addCategory(Intent.CATEGORY_OPENABLE);
            startActivityForResult(Intent.createChooser(pick, "Galería"), 42);
        } catch (Exception e) {
            cancelFile();
            push("notice(" + org.json.JSONObject.quote("No se pudo abrir la galería") + ")");
        }
    }
    private void openCamera() {
        if (checkSelfPermission(android.Manifest.permission.CAMERA) != android.content.pm.PackageManager.PERMISSION_GRANTED) {
            requestPermissions(new String[]{android.Manifest.permission.CAMERA}, 41);
            return;
        }
        try {
            android.net.Uri uri = android.net.Uri.parse("content://com.eduardgilm.archerytrace.share/camera.jpg");
            Intent cam = new Intent(android.provider.MediaStore.ACTION_IMAGE_CAPTURE);
            cam.putExtra(android.provider.MediaStore.EXTRA_OUTPUT, uri);
            cam.addFlags(Intent.FLAG_GRANT_WRITE_URI_PERMISSION | Intent.FLAG_GRANT_READ_URI_PERMISSION);
            cam.setClipData(android.content.ClipData.newRawUri("foto", uri));
            startActivityForResult(cam, 43);
        } catch (Exception e) {
            push("notice(" + org.json.JSONObject.quote("Sin cámara. Elige una foto de la galería.") + ")");
            openGallery();
        }
    }
    private void finishFile(int result, Intent intent, boolean camera) {
        android.net.Uri[] out = null;
        if (result == RESULT_OK) {
            if (camera) out = new android.net.Uri[]{android.net.Uri.parse("content://com.eduardgilm.archerytrace.share/camera.jpg")};
            else if (intent != null && intent.getData() != null) out = new android.net.Uri[]{intent.getData()};
        }
        if (fileCallback != null) fileCallback.onReceiveValue(out);
        fileCallback = null;
    }
    @Override public void onRequestPermissionsResult(int code, String[] perms, int[] grants) {
        super.onRequestPermissionsResult(code, perms, grants);
        if (code == 1) {
            if (!started && hasBlePermissions()) { started = true; startForegroundService(new Intent(this, SensorService.class)); }
            return;
        }
        if (code != 41) return;
        if (grants.length > 0 && grants[0] == android.content.pm.PackageManager.PERMISSION_GRANTED) openCamera();
        else {
            cancelFile();
            push("notice(" + org.json.JSONObject.quote("Sin permiso de cámara. Elige una foto de la galería.") + ")");
        }
    }
    @Override protected void onActivityResult(int request, int result, Intent intent) {
        super.onActivityResult(request,result,intent);
        if (request == 42 || request == 43) { finishFile(result, intent, request == 43); return; }
        if (request == 20) { finishExport(result, intent); return; }
        if (request != 21 || result != RESULT_OK || intent == null || intent.getData() == null) return;
        try (java.io.InputStream stream = getContentResolver().openInputStream(intent.getData())) {
            if (stream == null) throw new java.io.IOException("sin origen");
            java.io.ByteArrayOutputStream bytes=new java.io.ByteArrayOutputStream(); byte[] buffer=new byte[8192]; int n;
            while((n=stream.read(buffer))!=-1) { if(bytes.size()+n>20*1024*1024) throw new IllegalArgumentException("Copia demasiado grande"); bytes.write(buffer,0,n); }
            push("restoreBackup("+org.json.JSONObject.quote(bytes.toString("UTF-8"))+")");
        } catch(Exception e) { push("notice("+org.json.JSONObject.quote("No se pudo guardar o abrir la copia")+")"); }
    }

    static String toJson(Map m) { return new org.json.JSONObject(m).toString(); }
}
