# Entrenador para un grupo pequeño

La pestaña **Entrenador** es un chat con `xiaomi/mimo-v2.6-flash` mediante OpenRouter. No tiene selector, aviso inferior, contraseña ni configuración manual. Responde exclusivamente sobre tiro con arco y rechaza preguntas de otras materias.

La selección es automática: «analízame la sesión de hoy» incluye exclusivamente hoy; «analiza mis tiros» abarca todo el historial que cabe en la consulta. Entiende fechas, intervalos, la sesión actual, las últimas sesiones y referencias a la selección anterior. Las sesiones pedidas expresamente se respetan, aunque sean antiguas. Si la fecha no tiene datos, lo explica sin sustituirla por otra.

Las peticiones inequívocas de sesiones de hoy, ayer o anteayer y las precisiones de hora se resuelven también en el servidor, aunque el modelo las clasifique por error como ajenas al tema. «Mira mi sesión de ayer y analízala» seguido de «sí que la hay, a las 14:45» conserva ayer y busca esa hora en ese día; una respuesta anterior que negara la sesión no prevalece sobre el catálogo actual. Esta resolución acepta solo solicitudes completas de sesiones y aclaraciones breves vinculadas a ellas, sin convertir mensajes de otros temas en consultas válidas. La falta de coincidencias se explica como falta de datos para esa selección, sin rechazar la pregunta ni inventar una sincronización pendiente.

Las preguntas abiertas sobre datos propios, como «dime algo interesante de mis tiros», usan todo el historial. «De todas mis sesiones» también fija ese conjunto. `general` se reserva para conocimiento de técnica, material o reglas que no necesita entrenamientos personales; no puede dejar sin datos una petición de análisis global. Las restricciones explícitas de fecha, sesión o equipo mantienen su alcance.

El móvil calcula un resumen de cada sesión con todas sus flechas: recuentos, medias, desviaciones, mínimos y máximos de estabilidad, sostenimiento, dispersión angular, puntuación, impactos, pico de suelta, inestabilidad y recuperación; flechas por tanda, recuento de flechas manuales, primeros y últimos tercios y hasta seis flechas extremas identificadas. Los nombres personales, de equipo y del sensor no se incluyen. Los grupos numéricos identifican equipos, modalidades, formatos y versiones comparables.

La primera llamada recibe esos resúmenes, la pregunta y hasta doce mensajes anteriores (24 000 caracteres). El modelo utiliza la función **read_training_data** para seleccionar el conjunto del análisis y pedir detalle adicional de hasta ocho sesiones, tandas o flechas. El detalle normal contiene tablas compactas de métricas; puede añadir las estadísticas de las señales cuando sean necesarias. Para contrastar una relación global entre medidas, puede pedir las métricas individuales de todo el conjunto. Puede pedir las señales temporales originales de hasta tres flechas por sesión. La app ejecuta esa lectura sobre los datos locales y realiza la segunda llamada con los resúmenes de todo el conjunto seleccionado y el detalle solicitado. No añade una tercera llamada: si las pruebas recibidas no permiten una conclusión, debe explicar la limitación.

Los detalles conservan los números originales de flecha y tanda. Las señales de una flecha se envían completas cuando se piden; las flechas manuales no inventan señales. El servidor valida la selección, la estructura numérica, los recuentos, las tandas y las lecturas solicitadas. El detalle de unas sesiones sirve como evidencia y no sustituye las estadísticas de todo el conjunto. Los totales por equipo se combinan ponderando por flecha, con su dispersión. Un resumen no permite por sí solo afirmar una correlación o la forma de una traza.

Los resúmenes reducen mucho el tamaño de historiales largos. Si aun así una consulta general supera los 4 MB, se dejan fuera sesiones completas empezando por las más antiguas hasta que quepa. El servidor añade un aviso con sesiones y flechas excluidas, recuento incluido y fechas. Se mantiene al menos la sesión más reciente con flechas; no se trocean sus flechas. Una consulta sobre fechas o sesiones concretas nunca se recorta: si no cabe completa, pide acotar tandas o flechas. El recorte solo afecta a la consulta y no borra entrenamientos del móvil.

Al cambiar el conjunto incluido, el análisis conserva las preguntas anteriores para entender referencias y aclaraciones, pero no recibe las respuestas anteriores de otro conjunto. Las referencias posteriores conservan la selección que realmente se analizó. El servidor mantiene compatibilidad con el protocolo v2 de las APK anteriores, que usan la selección JSON y el envío de medidas por flecha; las nuevas APK usan el protocolo v3 con resúmenes y la herramienta de lectura.

Sesiones y conversaciones permanecen en el móvil. Al entrar en Entrenador o volver a la app se abre un chat nuevo. **Nuevo chat** también permite empezar otro desde la propia pestaña; **Historial** permite abrir y continuar una conversación anterior. Cada chat conserva sus ochenta mensajes más recientes y su propia selección de sesiones, y todos se incluyen en la exportación manual existente. La conversación guardada por las versiones anteriores se traslada al historial sin perderla. Las respuestas pendientes se guardan en el chat donde se hizo la pregunta, aunque se haya abierto otro.

El contexto incluye fechas locales para preguntas como «ayer» y grupos numéricos que permiten comparar el mismo equipo, modalidad, formato y versión de métricas. No envía nombres del arquero, nombres de equipos ni identificadores del sensor. Las trazas temporales completas solo se envían para las flechas que solicita la herramienta de lectura. El texto que escriba el usuario sí se envía como parte de la consulta.

El Worker no tiene base de datos ni almacena entrenamientos o conversaciones. Calcula los hechos y realiza la consulta con proveedores de retención cero que no recopilen datos; si no hay uno compatible, falla. El historial y el chat ya guardados pueden consultarse sin conexión; responder requiere Internet.

## Activación y despliegue

1. Crea una clave de OpenRouter exclusiva para ArcheryTrace y fija su presupuesto. La clave permanece exclusivamente como secreto en Cloudflare.
2. Si aún no existen códigos locales, genera los accesos desde la raíz:

   ```powershell
   node tools/coach-access.cjs 5
   ```

   Conserva `output/coach/access.json` y `output/coach/access-hashes.txt`, ambos privados e ignorados por Git. El primero contiene accesos revocables; el segundo sus hashes para el Worker.

3. Desde `coach/`:

   ```powershell
   npm install
   npm test
   npm run check
   npx wrangler login --device
   npm run deploy
   npx wrangler secret put OPENROUTER_API_KEY
   Get-Content -LiteralPath ../output/coach/access-hashes.txt -Raw | npx wrangler secret put ACCESS_HASHES
   ```

   `OPENROUTER_API_KEY` es el nombre literal: no lo sustituyas por la clave. Introduce la clave solo cuando aparezca `Enter a secret value`; debe terminar con `Uploaded secret OPENROUTER_API_KEY`. Desde la raíz, el comando equivalente es:

   ```powershell
   .\coach\node_modules\.bin\wrangler.cmd secret put OPENROUTER_API_KEY --config .\coach\wrangler.jsonc
   ```

4. `android/build.sh` incluye automáticamente el acceso 1 en la APK. La app lo utiliza desde Android, sin exponerlo a JavaScript ni a las copias JSON. `COACH_MEMBER` permite preparar otra APK con un acceso distinto. Este acceso de distribución puede extraerse de una APK compartida; es revocable y nunca es la clave de OpenRouter. Para revocarlo, elimina su hash del secreto `ACCESS_HASHES`. La distribución pública necesitará sustituir este acceso de grupo por acreditación de instalaciones y la futura suscripción.
5. Instala la APK firmada y abre **Entrenador**. La dirección está preparada en Android: `https://archerytrace-coach.archerytrace-coach.workers.dev/chat`. El acceso de red de la WebView sigue bloqueado; las consultas usan HTTPS nativo, sin redirecciones. No se activa ninguna pantalla de registro o contraseña.

## Límites y calidad

- Workers Free: no requiere un plan de pago. El tiempo esperando a OpenRouter no consume CPU; los límites gratuitos pueden rechazar consultas si se exceden. [Precios de Cloudflare](https://developers.cloudflare.com/workers/platform/pricing/).
- Cada acceso permite doce preguntas completas por minuto y el grupo cuarenta, por ubicación de Cloudflare. La selección y la respuesta tienen contadores separados con esos mismos límites, para que las dos llamadas de una pregunta no gasten dos plazas; ambas fases están limitadas, y las rutas antiguas de una sola llamada comparten el contador de respuestas. Un bloqueo devuelve HTTP 429 y `Retry-After: 60`. Son límites aproximados, no contabilidad global: el presupuesto de la clave en OpenRouter limita el gasto. Máximo 4 MB por petición, 5000 tokens para seleccionar sesiones y 10 000 para responder, con razonamiento activado y excluido del texto mostrado. MiMo no publica niveles de esfuerzo configurables; se utiliza su activación de razonamiento. El presupuesto de generación incluye el razonamiento interno y el texto final. Hay 300 segundos por llamada al proveedor, 330 segundos de espera en Android y 360 segundos en la interfaz, sin reintentos automáticos. Si una consulta general supera el tamaño admitido, aplica el recorte de sesiones antiguas con aviso; las selecciones concretas fallan y piden acotar si no caben completas. Un fallo del proveedor no provoca recortes ni reintentos automáticos. Las respuestas admiten hasta 100 000 caracteres y los mensajes JSON del proveedor y de Android hasta 2 MB para no rechazar respuestas largas por los antiguos límites de recepción. Una salida marcada como incompleta se rechaza, aunque contenga texto. Estos límites amplían el margen, pero no garantizan disponibilidad ni eliminan el límite de entrada de 4 MB. Una consulta puede cobrarse aunque el móvil pierda la conexión.
- Las coordenadas de impactos son normalizadas: x positivo=derecha, y positivo=abajo y radio 1=anillo 6. No son centímetros. El sensor mide el arco, no el cuerpo; una asociación no permite asegurar una causa biomecánica. Las flechas manuales solo aportan puntuación e impacto.
- Se validan datos, roles de conversación, tamaños y respuestas. Esto no demuestra que el texto generado sea correcto: revisa sus conclusiones junto a las medidas durante el piloto.
- Las copias automáticas de Android están desactivadas. La exportación manual conserva sesiones, conversaciones y antiguos informes sin incluir credenciales.
- `/analyze` sigue disponible para las APK anteriores; el chat utiliza `/chat`. El modelo se configura únicamente en `wrangler.jsonc`.

## Desarrollo

`npm test` (desde `coach/`) ejecuta pruebas con respuestas controladas, sin gasto. `npm run check` comprueba el empaquetado sin publicar. Para desarrollo, define los secretos en `coach/.dev.vars` (ignorado por Git) y usa `npm run dev`. La app Android solo acepta su endpoint HTTPS.

Referencias: [modelo MiMo](https://openrouter.ai/xiaomi/mimo-v2.6-flash), [secretos](https://developers.cloudflare.com/workers/configuration/secrets/), [límites de peticiones](https://developers.cloudflare.com/workers/runtime-apis/bindings/rate-limit/), [privacidad del enrutamiento](https://openrouter.ai/docs/guides/routing/provider-selection).
