# ArcheryTrace

Entrenador de tiro con arco con un inclinómetro **WitMotion (WIT) Bluetooth 5.0** montado en el arco y una app Android que analiza cada flecha en tiempo real: traza de apunte, sostenimiento, suelta y follow-through.

## Lo que hace

- 🎯 **Traza de apunte en vivo** mientras sostienes, y traza completa de cada flecha sobre la diana con reproducción.
- ⏱️ **Por flecha:** puntuación de sostenimiento (0–100), tiempo de sostenimiento, pico de la suelta, estabilidad y recuperación tras la suelta (follow-through).
- 🏹 **Sets automáticos y puntuación** tocando la diana (X a M, formatos Indoor).
- 🗂️ **Historial y perfil** con progreso, medias y comparación entre sesiones.
- 🖼️ **Tarjetas para compartir** en tres estilos: Cristal, Editorial y Obsidiana.

## Sensor

- WitMotion WT901BLE / BWT901 (BLE 5.0). Servicio `0000ffe5-…`, notificación `0000ffe4-…`, escritura `0000ffe9-…`.
- Trama BLE de 20 bytes `0x55 0x61`: acelerómetro (±16 g), giroscopio (±2000 °/s) y ángulos (±180°), int16 little-endian.
- También se decodifican las tramas serie de 11 bytes (`0x55 0x51/0x52/0x53` con checksum).
- Sesiones automáticas: el sensor vinculado se conecta solo al encenderse y la sesión se cierra si pasa 5 min apagado.
- Al conectar, la app envía siempre desbloqueo (`FF AA 69 88 B5`) y frecuencia 200 Hz (`FF AA 03 0B 00`) tras negociar el MTU y activar notificaciones. Nunca envía el comando de guardado: al apagar el sensor vuelve a su valor de fábrica. No escribe ningún otro ajuste ni calibración.

## Cómo analiza

- La vertical sale del acelerómetro y el giro del giroscopio, así que la puntería (izquierda/derecha y arriba/abajo) no depende de cómo esté montado el sensor; solo hay que elegir qué eje apunta a la diana (`axis`, por defecto +X).
- La suelta es un salto de |a| sobre 1 g (umbral calibrable desde una flecha real) o un pico de giro, siempre después de ≥0,5 s quieto.
- Cada flecha guarda 3 s antes y 1,2 s después de la suelta.

## Estructura

`mobile/` (interfaz web empaquetada), `android/` (APK sin Gradle: `SensorService` BLE, `WitParser`, `ShotDetector`), `tools/` (tests y scripts).

## Build

`bash android/build.sh`. En Windows (Git Bash) usa `tools/android/`; en Linux o macOS define `ANDROID_BUILD_TOOLS` y `ANDROID_JAR`.
