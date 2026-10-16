# Entrenador para un grupo pequeño

La pestaña **Entrenador** es un chat con `xiaomi/mimo-v2.6-flash` mediante OpenRouter. No tiene selector, aviso inferior, contraseña ni configuración manual. Responde exclusivamente sobre tiro con arco y rechaza preguntas de otras materias.

La selección es automática: «analízame la sesión de hoy» incluye exclusivamente hoy; «analiza mis tiros, dime cosas» incluye todas las sesiones y todas sus flechas. Entiende fechas, intervalos, la sesión actual, las últimas sesiones y referencias a la selección anterior. Si en un día hay varias sesiones, incluye todas salvo que se especifique una hora o sesión concreta. Si la fecha no tiene datos, lo explica sin sustituirla por otra.

Primero el modelo recibe la pregunta, hasta doce mensajes anteriores (24 000 caracteres en total) y un catálogo de fechas, horas y recuentos, sin medidas de tiro. Devuelve una selección estructurada o un rechazo de tema. La app resuelve esa selección localmente y hace una segunda consulta con todas las flechas seleccionadas. El servidor verifica fechas, selección y recuentos: no admite flechas omitidas ni sesiones añadidas. Al cambiar la selección, el análisis no recibe respuestas numéricas anteriores de otras sesiones.

No se recorta el historial a treinta sesiones ni las sesiones a 600 flechas. Se incluyen estabilidad, sostenimiento, impactos, puntuaciones y las medidas adicionales disponibles (picos, inestabilidad, recuperación, pulso, tiempos, versiones y rmssd sin atribuirle un origen no documentado). Para todas las series numéricas guardadas se calculan recuento, media, desviación, mínimo y máximo utilizando todas sus muestras en el móvil. Las señales vacías no se envían. Esto conserva sus estadísticas, no la forma completa de cada traza. Las sesiones con versiones mezcladas no permiten comparar las métricas del sensor.

Para análisis generales, el modelo recibe estadísticas de todas las flechas y ejemplos de los extremos, con totales por equipo ponderados por flecha. Cuando pide flechas o tandas concretas, recibe también la tabla individual de las sesiones seleccionadas. El detalle nunca sustituye el conjunto por unas pocas sesiones recientes.

Sesiones y conversaciones permanecen en el móvil. El chat conserva los ochenta mensajes más recientes y se incluye en la exportación manual existente.

El contexto incluye fechas locales para preguntas como «ayer» y grupos numéricos que permiten comparar el mismo equipo, modalidad, formato y versión de métricas. No envía nombres del arquero, nombres de equipos, identificadores del sensor ni trazas completas. El texto que escriba el usuario sí se envía como parte de la consulta.

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
- Cada acceso permite seis peticiones por minuto y el grupo veinte, por ubicación de Cloudflare. Una pregunta normal utiliza dos peticiones (selección y respuesta); un rechazo de tema solo una. Son límites aproximados, no contabilidad global: el presupuesto de la clave en OpenRouter limita el gasto. Máximo 4 MB por petición, 900 tokens para seleccionar y 2200 para responder, y 55 segundos por petición, sin reintentos automáticos. Si el tamaño o los límites del proveedor impiden analizar todo, la consulta falla y pide acotar fechas; nunca omite sesiones silenciosamente. Una consulta puede cobrarse aunque el móvil pierda la conexión.
- Las coordenadas de impactos son normalizadas: x positivo=derecha, y positivo=abajo y radio 1=anillo 6. No son centímetros. El sensor mide el arco, no el cuerpo; una asociación no permite asegurar una causa biomecánica. Las flechas manuales solo aportan puntuación e impacto.
- Se validan datos, roles de conversación, tamaños y respuestas. Esto no demuestra que el texto generado sea correcto: revisa sus conclusiones junto a las medidas durante el piloto.
- Las copias automáticas de Android están desactivadas. La exportación manual conserva sesiones, conversaciones y antiguos informes sin incluir credenciales.
- `/analyze` sigue disponible para las APK anteriores; el chat utiliza `/chat`. El modelo se configura únicamente en `wrangler.jsonc`.

## Desarrollo

`npm test` (desde `coach/`) ejecuta pruebas con respuestas controladas, sin gasto. `npm run check` comprueba el empaquetado sin publicar. Para desarrollo, define los secretos en `coach/.dev.vars` (ignorado por Git) y usa `npm run dev`. La app Android solo acepta su endpoint HTTPS.

Referencias: [modelo MiMo](https://openrouter.ai/xiaomi/mimo-v2.6-flash), [secretos](https://developers.cloudflare.com/workers/configuration/secrets/), [límites de peticiones](https://developers.cloudflare.com/workers/runtime-apis/bindings/rate-limit/), [privacidad del enrutamiento](https://openrouter.ai/docs/guides/routing/provider-selection).
