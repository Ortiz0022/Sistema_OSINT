# Pruebas unitarias de las reglas de negocio (ítem 4.2)

| Campo | Valor |
|---|---|
| Ítem del checklist | 4.2 — Etapa 4, Pruebas |
| Responsable | Integrante 1 (Katheryn Méndez) |
| Revisor | Integrante 2 |
| Base | Prueba base del 2.2 (`server/utils/csvParser.test.ts`) y criterios del 1.1 ([flujos-criticos.md](flujos-criticos.md)) |
| Estado | Borrador para revisión |

## 1. Cómo ejecutarlas

Se usa el mismo comando que definió el ítem 2.2 y que corre el CI del ítem 3.1:

```bash
npm ci
npm run test
```

Resultado esperado: **75 pruebas, 67 aprobadas y 8 marcadas como fallo esperado**, código de salida 0. Las pruebas no usan internet ni datos reales: la red se simula y el ETL del TSE se ejecuta sobre un ZIP ficticio en una carpeta temporal.

## 2. Convención: fallo esperado (`it.fails`)

El 1.1 define qué **debe** cumplir el sistema. Algunos criterios todavía no se cumplen; son los hallazgos HP registrados en el 7.5.

- Para esos criterios se escribe la prueba con el comportamiento **exigido** y se marca `it.fails`. El nombre de la prueba incluye el hallazgo y el Issue, por ejemplo `[HP-04, Issue #6]`.
- Vitest la reporta como *expected fail*. El CI sigue en verde y el incumplimiento queda demostrado y visible en el reporte.
- Cuando alguien corrija el código, esa prueba empezará a fallar ("se esperaba un fallo, pero pasó"). En ese momento se quita el `.fails` y el Issue HP se cierra con esa evidencia.
- **La expectativa nunca se cambia para que coincida con el código.**

Cada prueba con `it.fails` se ejecutó también sin el `.fails` para confirmar que falla por la razón del hallazgo y no por un error de la prueba.

## 3. Archivos

| Archivo | Flujo | Qué prueba |
|---|---|---|
| `server/utils/csvParser.test.ts` | FLU-01 | Prueba base del 2.2 (Integrante 3): parser del CSV del OIJ. |
| `server/services/oijService.test.ts` | FLU-01 | Servicio del proxy OIJ: cálculos, caché, reintentos, errores del OIJ y exposición de datos de víctimas. |
| `server/routes/oij.test.ts` | FLU-01 | Contrato HTTP de `/api/security/*`: códigos 400 y 500 y mensajes sin detalles internos. |
| `scripts/process-tse-electoral-roll.test.ts` | FLU-02 | ETL del padrón: agregación, ausencia de datos personales, errores de entrada y conservación del dataset anterior. |
| `src/services/locationService.test.ts` | FLU-03 | Servicio territorial (DTA): orden, caché, timeout, estructura inválida y codificación de IDs. |
| `src/modules/publicData/services/publicDataService.test.ts` | FLU-03 | Descarga del dataset de Datos Públicos: motivos de error y caché. |
| `src/modules/publicData/services/publicDataAnalytics.test.ts` | FLU-03 | Buscador: tildes, identificación, territorio y entradas maliciosas. |

## 4. Matriz de trazabilidad

**Leyenda:** "Pasa" significa que el código cumple el criterio. "Fallo esperado" significa que la prueba demuestra el incumplimiento (ver sección 2). "Sin prueba" indica el motivo.

### FLU-01 — Consulta de estadísticas de seguridad (proxy OIJ)

| Criterio | Tipo | Pruebas | Resultado | Observación |
|---|---|---|---|---|
| FLU-01-CA01 | Éxito | 3 | Pasa | Totales, delito más frecuente, serie mensual y código territorial enviado al OIJ. |
| FLU-01-CA02 | Éxito | 2 | Pasa | Caché para la misma consulta (límite: parámetros distintos no la reutilizan). |
| FLU-01-CA03 | Éxito | 3 | Pasa | Detalle agregado y ordenado, y filtro por tipo de delito. |
| FLU-01-CA04 | Error | 3 | Pasa | Responde 400 sin `year` en ambos endpoints (límite: `year` vacío). |
| FLU-01-CA05 | Error | 2 | Fallo esperado | HP-01 (#3). Solo se prueba el formato no numérico; el rango depende de D-03. |
| FLU-01-CA06 | Error | 5 | Pasa (parcial) | Reintentos, caché sin fallos y respuesta 500 genérica. **El timeout de salida (HP-02, #4) no se prueba**: no existe un tiempo acordado (D-04). |
| FLU-01-CA07 | Error | 1 | Fallo esperado | HP-03 (#5): ante una respuesta inesperada del OIJ devuelve 0 incidentes. |
| FLU-01-CA08 | Uso indebido | 4 | Fallo esperado | HP-04 (#6): IDs no numéricos, parámetros repetidos, inyección en el payload y tipo de delito fuera de lista. |
| FLU-01-CA09 | Uso indebido | 0 | Sin prueba | HP-05 (#7). El servicio no expone el tamaño de la caché; el límite depende de D-04. |
| FLU-01-CA10 | Uso indebido | 0 | Sin prueba | HP-06 (#8). El límite de solicitudes depende de D-04. |
| FLU-01-CA11 | Uso indebido | 1 + 2.2 | Pasa | El detalle no contiene edad, sexo, nacionalidad, fecha ni víctima (también lo cubre la prueba base del 2.2). |
| FLU-01-CA12 | Uso indebido | 0 | Sin prueba | Bloqueado por D-02 (política de CORS). |

### FLU-02 — Generación y publicación de datasets por ETL

| Criterio | Tipo | Pruebas | Resultado | Observación |
|---|---|---|---|---|
| FLU-02-CA01 | Éxito | 3 | Pasa | Agregación por distrito, ausencia de cédulas, nombres, apellidos y fechas, y finales de línea de Windows. |
| FLU-02-CA02 | Éxito | 0 | Sin prueba | Los ETL de MEIC y SICOP descargan de internet al ejecutarse y no exponen funciones; se verifican con sus `verifyDataset.mjs`. |
| FLU-02-CA03 | Error | 4 | Pasa | Sin argumento, ruta inexistente, ZIP sin `distelec.txt` (conserva el dataset anterior) y ZIP sin padrón. |
| FLU-02-CA04 | Error | 0 | Sin prueba | Mismo motivo que CA02. Habría que separar la lógica del ETL de la descarga. |
| FLU-02-CA05 | Error | 1 | Fallo esperado | HP-07 (#9): los CODELEC sin correspondencia no quedan en los metadatos. |
| FLU-02-CA06 | Uso indebido | 0 | Sin prueba | Bloqueado por D-01 (qué datos personales se permiten). |
| FLU-02-CA07 | Uso indebido | 0 | Sin prueba | HP-09 (#11). Los límites de tamaño dependen de D-04. |
| FLU-02-CA08 | Uso indebido | 0 | Sin prueba | HP-10 (#12). Los dominios permitidos dependen de D-07. |
| FLU-02-CA09 | Uso indebido | 0 | Sin prueba | HP-11 (#13). Mismo motivo que CA02: el ETL descarga antes de escribir la salida. |
| FLU-02-CA10 | Uso indebido | 0 | Sin prueba | Es un control de proceso (D-05), no de código. |

### FLU-03 — Consulta territorial y búsqueda de entidades

| Criterio | Tipo | Pruebas | Resultado | Observación |
|---|---|---|---|---|
| FLU-03-CA01 | Éxito | 4 | Pasa | Orden oficial de la DTA, URL de distritos, caché y reutilización del dataset. |
| FLU-03-CA02 | Éxito | 4 | Pasa | Búsqueda sin importar tildes, por identificación y filtrada por territorio (límite: búsqueda vacía). |
| FLU-03-CA03 | Error | 3 | Pasa | Error HTTP, timeout de 8 s y reintento sin caché del fallo. |
| FLU-03-CA04 | Error | 10 | Pasa | Motivos `no_publicado`, `red` y `formato` (las 6 secciones obligatorias) y reintento. |
| FLU-03-CA05 | Error | 1 | Pasa | Lista vacía cuando no hay coincidencias. |
| FLU-03-CA06 | Uso indebido | 5 | Pasa (parcial) | El filtro trata como texto literal el HTML, los scripts, el texto tipo SQL y los caracteres de expresiones regulares, y soporta una búsqueda de 100 000 caracteres. **No se prueba** que la pantalla no ejecute el texto: eso depende del escape de React y requiere un DOM de navegador. |
| FLU-03-CA07 | Uso indebido | 5 | Pasa (parcial) | Rechaza estructuras inválidas, descarta valores no textuales y el servicio entrega un nombre con HTML sin modificarlo. **No se prueba** que la pantalla lo muestre como texto (mismo motivo que CA06). |

**Control adicional sin criterio propio:** 1 prueba (`OBS-03-2`) verifica que los IDs enviados a la DTA se codifican en la URL y no permiten recorrer otras rutas de la API. Protege la petición saliente; ningún criterio del 1.1 la describe.
| FLU-03-CA08 | Uso indebido | 0 | Sin prueba | HP-12 (#14). El tooltip de Leaflet necesita un DOM de navegador, que no está configurado en las pruebas. |
| FLU-03-CA09 | Uso indebido | 0 | Sin prueba | Bloqueado por D-01. |

## 5. Resumen

| | FLU-01 | FLU-02 | FLU-03 | Total |
|---|---|---|---|---|
| Criterios con al menos una prueba | 9 de 12 | 3 de 10 | 7 de 9 | 19 de 31 |
| De ellos, cubiertos solo en parte | 1 (CA06) | 0 | 2 (CA06, CA07) | 3 |
| Pruebas nuevas del 4.2 | 24 | 8 | 33 | 65 |
| De ellas, con fallo esperado | 7 | 1 | 0 | 8 |

Más las 10 pruebas base del 2.2, el total es de 75 pruebas. En FLU-03 hay 32 pruebas trazadas a criterios y 1 de control adicional (`OBS-03-2`).

## 6. Limitaciones

- Ningún criterio de FLU-02 sobre MEIC y SICOP tiene prueba unitaria: esos scripts mezclan descarga, transformación y escritura. Para probarlos habría que separar la lógica de transformación, y eso es un cambio de código de la aplicación que no le corresponde a este ítem.
- FLU-03-CA08 (tooltip del mapa) y la parte visual de FLU-03-CA06 y CA07 necesitan un entorno de navegador, como `jsdom`. Agregarlo cambia `package.json`, que es del Integrante 3.
- HP-13 (CSV del OIJ con filas malformadas) no tiene un criterio propio en el 1.1; lo cubre la prueba base del 2.2.
- Ocho de los criterios sin prueba dependen de dudas abiertas (D-01, D-02, D-04, D-05 y D-07), y el rango de años de FLU-01-CA05 depende de D-03. Cuando se decidan, se agregan sus pruebas.
- Las pruebas con fallo esperado no son pruebas aprobadas: demuestran hallazgos abiertos.
