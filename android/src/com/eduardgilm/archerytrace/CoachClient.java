package com.eduardgilm.archerytrace;

import android.app.Activity;
import org.json.JSONObject;
import java.net.HttpURLConnection;
import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.util.concurrent.Executors;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.atomic.AtomicBoolean;

/** Acceso preparado en la APK del grupo; la clave de OpenRouter permanece en Cloudflare. */
final class CoachClient {
    interface Reply { void accept(String id,String result,String error); }
    private static final String ENDPOINT="https://archerytrace-coach.archerytrace-coach.workers.dev/chat";
    private final Activity activity;
    private final Reply reply;
    private final String token;
    private final ExecutorService executor=Executors.newSingleThreadExecutor();
    private final AtomicBoolean busy=new AtomicBoolean();
    private volatile HttpURLConnection connection;
    CoachClient(Activity activity,Reply reply) {
        this.activity=activity;this.reply=reply;String code="";
        try(java.io.InputStream in=activity.getAssets().open("coach-access.txt")){
            byte[] bytes=new byte[256];int n=in.read(bytes);String value=new String(bytes,0,n,StandardCharsets.UTF_8).trim();
            if(in.read()==-1&&value.matches("[A-Za-z0-9_-]{32,128}"))code=value;
        }catch(Exception ignored){}token=code;
    }
    String ask(String id,String body) {
        if(token.isEmpty())return "Esta compilación no tiene acceso al entrenador.";
        if(body==null||body.getBytes(StandardCharsets.UTF_8).length>4000000)return "La consulta es demasiado grande. No se han recortado tus datos; pide un intervalo de fechas.";
        if(!busy.compareAndSet(false,true))return "El entrenador ya está respondiendo.";
        executor.execute(()->{
            String result="",error="";
            try {
                HttpURLConnection c=(HttpURLConnection)new URI(ENDPOINT).toURL().openConnection();connection=c;
                c.setInstanceFollowRedirects(false);c.setConnectTimeout(15000);c.setReadTimeout(330000);c.setRequestMethod("POST");c.setDoOutput(true);
                c.setRequestProperty("Authorization","Bearer "+token);c.setRequestProperty("Content-Type","application/json");
                byte[] bytes=body.getBytes(StandardCharsets.UTF_8);c.setFixedLengthStreamingMode(bytes.length);try(java.io.OutputStream out=c.getOutputStream()){out.write(bytes);}
                int status=c.getResponseCode();java.io.InputStream stream=status==200?c.getInputStream():c.getErrorStream();if(stream==null)throw new java.io.IOException();
                try(java.io.InputStream in=stream;java.io.ByteArrayOutputStream out=new java.io.ByteArrayOutputStream()){
                    byte[] buffer=new byte[4096];int n;while((n=in.read(buffer))!=-1){if(out.size()+n>2000000)throw new java.io.IOException();out.write(buffer,0,n);}result=out.toString("UTF-8");
                }
                if(status!=200){error=new JSONObject(result).optString("error","No se pudo responder a la pregunta.");result="";}
            }catch(Exception ignored){error="No se pudo conectar con el entrenador. Comprueba tu conexión e inténtalo de nuevo.";}
            finally {HttpURLConnection c=connection;connection=null;if(c!=null)c.disconnect();busy.set(false);}
            if(!activity.isDestroyed())reply.accept(id,result,error);
        });return "";
    }
    void close() {HttpURLConnection c=connection;if(c!=null)c.disconnect();executor.shutdownNow();}
}
