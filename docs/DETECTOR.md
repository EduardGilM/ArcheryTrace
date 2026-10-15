# Detector de tiros (ShotDetector)

Candidato: golpe de aceleración |a|-1g ≥ 1,5 g. Se decide 1,5 s después.

## Regla
Obligatorio (común a todo arco):
1. **Golpe horizontal** ≥ 60 % (hacia la diana; medido contra la gravedad, no contra el montaje del sensor).
2. **Vibración** 80–500 ms tras el golpe ≥ movimiento de los 250 ms previos + 15 °/s.

Más al menos **un apoyo**:
- vuelco del arco ≥ 20° a 1,0–1,5 s (sling / arco que cae);
- sostenimiento ≥ 0,5 s (media de giro < 25 °/s, pico < 80 °/s en el último segundo);
- golpe alineado (cos ≥ 0,7) con la línea de tiro aprendida en la sesión (desde la 1ª flecha);
- arranque brusco: vibración ≥ 3 × movimiento previo + 10 °/s.

Bloqueos: arco quieto > 30 s (apoyado); con eje aprendido, puntería a > 35° de la horizontal; vertical a > 30° de la de la tanda.

Todo candidato (aceptado o no) guarda un CSV de 10 s antes / 3 s después en `files/candidates/` (máx. 150 archivos o 50 MB) con los valores de cada rasgo.
Eventos de sesión (conexión, tandas, tiros, descartes) en `files/sessionlogs/` (50 últimos).

## Datos reales que lo respaldan
Sólo **arco compuesto** (3 tiros + 1 apoyo + 1 manejo, 2026-10-15). Tiros: horizontal 0,77–0,89; vibración 37–50 °/s sobre ~1; vuelco 50–56°; sostenido 7–9 s.
Apoyar el arco: horizontal 0,17. Manejo: 0,27.

## Supuestos sin verificar (falta grabar)
| Arco | Supuesto | Riesgo |
|---|---|---|
| Recurvo olímpico | golpe horizontal y vuelco fuerte con sling; clicker no genera golpe ≥1,5 g | clicker |
| Barebow / tradicional / longbow | sin vuelco, sostenimiento corto o nulo (instintivo); aceptado por arranque brusco o línea de tiro | 1ª flecha de un instintivo sin sling depende sólo del arranque brusco |
| Arco inclinado (cant) | no afecta: todo se mide contra la gravedad | cant variable > 30° entre flechas |
| Montaje del sensor | cualquiera: la línea de tiro se aprende por sesión | — |
| Compuesto con disparador | vibración menor que recurvo | ya verificado sólo con este arco |

Sintéticos (no reales) en `ScenariosTest`: longbow instintivo inclinado 20°, recurvo con vuelco; caminar, soporte, poner flecha, golpe en reposo → 0.
Criterio permanente: `AllRecordingsTest` + `fixtures/expected.txt` (toda grabación real con su nº de tiros).
