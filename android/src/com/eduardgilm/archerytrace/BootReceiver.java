package com.eduardgilm.archerytrace;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

// arranca la escucha al encender el móvil: los tiros del sensor se acumulan sin abrir la app
public class BootReceiver extends BroadcastReceiver {
    @Override public void onReceive(Context c, Intent i) {
        try {
            c.startForegroundService(new Intent(c, SensorService.class));
        } catch (Exception e) {
            android.util.Log.d("ArcheryTrace", "boot start falló", e);
        }
    }
}
