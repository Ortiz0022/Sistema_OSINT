# Flujos críticos — Sistema_OSINT (ítem 1.1)

| Campo | Valor |
|---|---|
| Ítem del checklist | 1.1 — Etapa 1, Planificación |
| Responsable | Integrante 1 (Katheryn Méndez) |
| Revisor | Integrante 2 |
| Estado del documento | Borrador para revisión |
| Código analizado | rama `main`, commit `c7b3cab` |
| Fecha | 2026-11-02 |

Este documento es la base de requisitos que usan el ítem 1.2 (arquitectura y permisos), la tabla de amenazas, el 4.2 (pruebas unitarias), el 4.8 y el `AGENTS.md`. Los IDs (`FLU-xx`, `FLU-xx-CAyy`, `D-xx`) son estables: si un criterio se elimina, su ID no se reutiliza.

---

## 1. Cómo leer este documento

Cada flujo separa tres tipos de información. No deben mezclarse.

| Tipo | Qué significa | Dónde aparece |
|---|---|---|
| **Regla aprobada** | Requisito que el equipo aceptó. Las pruebas lo validan y una diferencia con el código es un hallazgo. | Criterios de aceptación con estado de aprobación **Aprobado**. |
| **Comportamiento observado** | Lo que hace el código hoy, leído en el commit indicado, con referencia al archivo. No implica que sea correcto. | Subsección "Comportamiento observado" de cada flujo. |
| **Sugerencia pendiente de validar** | Idea de cómo cumplir un criterio. No es requisito hasta que alguien la apruebe. | Sección 5. |

**Estado de aprobación de los criterios.** Ningún criterio está aprobado todavía. Todos están como **Propuesto** y pasan a **Aprobado** cuando el revisor (Integrante 2) apruebe el PR de este documento. Los criterios que dependen de una duda abierta (sección 6) quedan **Bloqueados por D-xx** hasta que el responsable de esa duda la resuelva.

**Columna "Código hoy".** Indica si el comportamiento observado cumple el criterio: **Cumple**, **Parcial**, **No cumple** o **Sin definir** (depende de una duda). Se determinó **solo por lectura estática del código**: nada se ejecutó. La confirmación corresponde a las pruebas del 4.2. Un criterio que hoy no se cumple **no se ajusta para que coincida con el código**: es un hallazgo para el registro del 7.5.

**Tipos de criterio:** `[Éxito]`, `[Error]` (falla esperable de entrada o de una dependencia) y `[Uso indebido]` (abuso, acceso sin permiso o entrada maliciosa).

---

## 2. Contexto del sistema (observado)

- **Frontend:** React 19 + Vite. Tiene cinco rutas públicas (`/`, `/contratacion-publica`, `/seguridad`, `/datos-publicos`, `/padron-electoral`), definidas en [src/constants/routes.ts](../../src/constants/routes.ts).
- **Backend:** un servidor Express 5 ([server/index.ts](../../server/index.ts)) con un solo grupo de endpoints, `/api/security/*`, que funciona como proxy hacia el OIJ.
- **ETL:** scripts que se ejecutan localmente y generan JSON estáticos en `public/`, versionados en git. El navegador los descarga completos.
- **No existe:** autenticación, sesiones, roles, base de datos, exportaciones ni API keys. El [.env.example](../../.env.example) indica que no se requieren credenciales. Todo lo publicado es accesible para cualquier visitante anónimo.

### Índice de flujos

| ID | Flujo | Estado | Datos sensibles o impacto principal |
|---|---|---|---|
| FLU-01 | Consulta de estadísticas de seguridad a través del proxy OIJ | Existente | Única superficie de servidor expuesta. Riesgo de denegación de servicio, de agotar la memoria y de usar el servidor para amplificar peticiones contra la API del Poder Judicial. |
| FLU-02 | Generación y publicación de datasets por ETL (TSE, MEIC, SICOP) | Existente | Maneja datos personales: el padrón electoral completo y cédulas de personas físicas. Riesgo de fuga de datos y de publicar datos alterados. |
| FLU-03 | Consulta territorial y búsqueda de entidades en el navegador | Existente | Muestra datos de terceros y permite buscar por cédula. Riesgo de inyección en la interfaz y de perfilar personas. |

---

## 3. FLU-01 — Consulta de estadísticas de seguridad a través del proxy OIJ

### Por qué es crítico

`GET /api/security/stats` y `GET /api/security/details` son los únicos endpoints de servidor. Cualquier cliente HTTP puede llamarlos sin autenticarse, y cada consulta que no está en caché genera peticiones POST hacia una API del Poder Judicial. Una falla aquí puede:

- dejar caído el backend, ya sea por memoria o por peticiones que se quedan colgadas;
- convertir el servidor en un amplificador de tráfico contra un servicio del Estado, que podría bloquear nuestra IP;
- mostrar a la ciudadanía cifras de criminalidad falsas, por ejemplo "0 incidentes" cuando en realidad hubo un error.

Además, el CSV del OIJ que procesa `/details` trae por registro la edad, el sexo y la nacionalidad de la víctima, junto con la fecha, la hora y el distrito. Esos datos no deben salir del servidor.

### Actores, objetivo y resultado esperado

| | |
|---|---|
| **Actor principal** | Visitante anónimo (ciudadano, periodista, analista) desde la página `/seguridad`. |
| **Actor secundario** | Cualquier cliente HTTP que llame al endpoint directamente, sin pasar por la interfaz. |
| **Sistema externo** | API de estadísticas del OIJ (`pjenlinea3.poder-judicial.go.cr/estadisticasoij`). |
| **Objetivo** | Obtener estadísticas agregadas de delitos según año, tipo de delito y territorio (provincia, cantón, distrito). |
| **Resultado esperado** | Una respuesta JSON con totales, la distribución por tipo de delito, la serie mensual (`/stats`) y la tabla delito/subdelito (`/details`), servida desde caché cuando la consulta se repite. El visitante ve los indicadores o un mensaje de error claro, nunca cifras inventadas. |

### Comportamiento observado (commit `c7b3cab`)

- **OBS-01-1:** Los endpoints no tienen autenticación y se aplica `cors()` sin restricción de origen ([server/index.ts:8](../../server/index.ts#L8)).
- **OBS-01-2:** El único parámetro validado es `year`, y solo se comprueba que exista. Si falta, la respuesta es `400` ([server/routes/oij.ts:9](../../server/routes/oij.ts#L9), [:28](../../server/routes/oij.ts#L28)).
- **OBS-01-3:** No se valida el formato ni el rango de `year`. La interfaz solo ofrece los últimos 5 años ([SecurityView.tsx:24](../../src/modules/security/components/SecurityView.tsx#L24)), pero la API acepta cualquier valor.
- **OBS-01-4:** `provinceId`, `cantonId` y `districtId` se concatenan con `padStart` dentro del payload que se envía al OIJ sin validar que sean dígitos ([oijService.ts:48](../../server/services/oijService.ts#L48)). Los parámetros se convierten con `as string` sin verificar el tipo, y un parámetro repetido en la query llega como arreglo.
- **OBS-01-5:** Si `crimeType` no está en la lista de delitos conocidos, la consulta pasa a incluir los 6 tipos ([oijService.ts:72](../../server/services/oijService.ts#L72)).
- **OBS-01-6:** Cada endpoint tiene su propia caché en un `Map` en memoria con TTL de 30 minutos ([oijService.ts:26-28](../../server/services/oijService.ts#L26-L28)). La clave se arma con los parámetros que manda el cliente. La caché no tiene límite de tamaño y las entradas vencidas nunca se borran: solo se ignoran al leerlas.
- **OBS-01-7:** Hay reintentos: hasta 3 intentos por llamada ante errores 5xx o de red ([oijService.ts:4](../../server/services/oijService.ts#L4)). `/stats` hace 2 llamadas en paralelo y `/details` hace 1. Las llamadas salientes no tienen timeout.
- **OBS-01-8:** No hay limitación de tasa (*rate limiting*) por cliente.
- **OBS-01-9:** `/stats` no revisa `response.ok` antes de leer el JSON. Si la respuesta del OIJ no es un arreglo, el resultado es `totalIncidents: 0` y no se informa ningún error ([oijService.ts:118](../../server/services/oijService.ts#L118)). `/details` sí revisa `response.ok` ([oijService.ts:206](../../server/services/oijService.ts#L206)).
- **OBS-01-10:** Ante una excepción, la respuesta es `500` con un mensaje genérico, y el detalle solo se registra con `console.error` en el servidor ([oij.ts:21](../../server/routes/oij.ts#L21), [:40](../../server/routes/oij.ts#L40)). La caché solo guarda resultados exitosos.
- **OBS-01-11:** El parser del CSV descarta las filas con menos de 12 columnas y conserva solo Delito, SubDelito, Fecha, Provincia, Cantón y Distrito. La respuesta de `/details` contiene únicamente conteos por delito y subdelito ([csvParser.ts:39-48](../../server/utils/csvParser.ts#L39-L48)).
- **OBS-01-12:** Si la API falla, el frontend muestra un estado de error ([useSecurity.ts:45](../../src/modules/security/hooks/useSecurity.ts#L45), [SecurityView.tsx:93](../../src/modules/security/components/SecurityView.tsx#L93)).

### Criterios de aceptación

| ID | Tipo | Criterio | Código hoy | Aprobación |
|---|---|---|---|---|
| FLU-01-CA01 | [Éxito] | **Dado** un año ofrecido por la interfaz y un territorio válido de la DTA, **cuando** el visitante consulta `GET /api/security/stats`, **entonces** recibe `200` con `summary`, `chartCrimeTypes`, `chartMonthly` y `availableCrimeTypes`, calculados a partir de la respuesta del OIJ. | Cumple | Propuesto |
| FLU-01-CA02 | [Éxito] | **Dado** que la misma consulta se respondió con éxito hace menos de 30 minutos, **cuando** se repite con los mismos parámetros, **entonces** se responde desde la caché sin llamar al OIJ. | Cumple | Propuesto |
| FLU-01-CA03 | [Éxito] | **Dado** un año y un tipo de delito válidos, **cuando** el visitante consulta `GET /api/security/details`, **entonces** recibe `200` con `tableData` agregado por delito y subdelito, ordenado de mayor a menor. | Cumple | Propuesto |
| FLU-01-CA04 | [Error] | **Dado** una solicitud sin el parámetro `year`, **cuando** se llama a `/stats` o `/details`, **entonces** la respuesta es `400` con un mensaje que indica que `year` es obligatorio y no se contacta al OIJ. | Cumple | Propuesto |
| FLU-01-CA05 | [Error] | **Dado** un `year` que no es un año de 4 dígitos o que está fuera del rango permitido (ver D-03), **cuando** se llama a cualquiera de los dos endpoints, **entonces** la respuesta es `400` y no se contacta al OIJ. | No cumple | Bloqueado por D-03 (rango) |
| FLU-01-CA06 | [Error] | **Dado** que el OIJ no responde, responde con 5xx después de los reintentos o tarda más que el tiempo máximo acordado, **cuando** se procesa la consulta, **entonces** la respuesta es un error genérico (sin stack, URL interna ni payload), no se guarda nada en caché y la interfaz muestra un estado de error. | Parcial: no hay timeout en las llamadas salientes | Propuesto |
| FLU-01-CA07 | [Error] | **Dado** que el OIJ responde `200` pero con un formato inesperado (por ejemplo, algo que no es un arreglo o una página HTML), **cuando** se procesa `/stats`, **entonces** el sistema responde con error y **no** muestra cifras en cero como si fueran datos reales. | No cumple | Propuesto |
| FLU-01-CA08 | [Uso indebido] | **Dado** un cliente que envía en `provinceId`, `cantonId`, `districtId` o `crimeType` valores fuera del dominio esperado (texto no numérico, listas como `1,2,3`, cadenas muy largas, caracteres especiales o parámetros repetidos que llegan como arreglo), **cuando** llama al endpoint, **entonces** la respuesta es `400` y ningún valor llega al payload del OIJ. | No cumple | Propuesto |
| FLU-01-CA09 | [Uso indebido] | **Dado** un cliente que envía muchas consultas con combinaciones de parámetros distintas para evitar la caché, **cuando** se procesan, **entonces** la memoria que ocupa la caché se mantiene dentro de un máximo definido. | No cumple | Bloqueado por D-04 (máximo) |
| FLU-01-CA10 | [Uso indebido] | **Dado** un mismo cliente que supera el volumen de solicitudes permitido, **cuando** sigue llamando a los endpoints, **entonces** el sistema rechaza las solicitudes que exceden el límite y no genera más llamadas al OIJ por ellas. | No cumple | Bloqueado por D-04 (límite) |
| FLU-01-CA11 | [Uso indebido] | **Dado** un cliente que llama directamente a `/details` buscando datos de víctimas individuales, **cuando** recibe la respuesta, **entonces** esta contiene solo conteos agregados por delito y subdelito, sin edad, sexo, nacionalidad, fecha, hora ni ningún otro dato de un registro individual. | Cumple | Propuesto |
| FLU-01-CA12 | [Uso indebido] | **Dado** una página web de un origen distinto al frontend del observatorio, **cuando** intenta consumir la API desde el navegador de un visitante, **entonces** el sistema actúa según la política de orígenes que se defina en D-02. | Sin definir (hoy acepta cualquier origen) | Bloqueado por D-02 |

---

## 4. FLU-02 — Generación y publicación de datasets por ETL

### Por qué es crítico

Es el único flujo que toca **datos personales en origen**:

- El ZIP del Padrón Nacional Electoral trae cédula, nombre, apellidos y fecha de caducidad de unos 3,7 millones de personas.
- El dataset del MEIC publica identificación y nombre de cada pyme. Unas 23 identificaciones tienen formato de cédula física (9 dígitos) y unas 527 tienen formato DIMEX (12 dígitos). Es decir, probablemente hay personas físicas expuestas. Esto se infirió por el formato del número y no se verificó contra el registro civil.
- El dataset de SICOP publica cédula, nombre y monto de los proveedores. Hoy los 400 proveedores publicados tienen identificación de 10 dígitos (formato de persona jurídica), pero el ETL no lo garantiza.

Lo que produce el ETL se publica tal cual en `public/`, queda en git y cualquiera puede descargarlo. Una falla puede filtrar datos personales de forma permanente: quedan en el historial de git y en cachés. También puede publicar cifras alteradas que la ciudadanía tomaría como oficiales. Además, el ETL procesa archivos externos (ZIP y XLSX) que podrían venir manipulados.

### Actores, objetivo y resultado esperado

| | |
|---|---|
| **Actor principal** | Integrante del equipo que opera el ETL de una fuente y lo ejecuta localmente con `npm run etl:tse` o `node .../etl/*.mjs`. |
| **Actor secundario** | Visitante anónimo que descarga los JSON publicados (`/data/*.json`, `/meic-pymes/*.json`, `/sicop/*.json`). |
| **Sistemas externos** | ZIP del padrón del TSE (descarga manual); portal CKAN de datos abiertos (MEIC); contenedor público del Observatorio de Compra Pública (SICOP); API de la DTA (`ubicaciones.paginasweb.cr`). |
| **Objetivo** | Transformar las fuentes oficiales en datasets agregados, conciliados con la División Territorial Administrativa y listos para el frontend. |
| **Resultado esperado** | Un JSON en `public/` con metadatos de fuente y fecha, estructura válida y solo los datos personales que el equipo haya autorizado (ver D-01). Si algo falla, el dataset publicado anteriormente queda intacto. |

### Comportamiento observado (commit `c7b3cab`)

- **OBS-02-1 (TSE):** El script recibe la ruta del ZIP por argumento. Si falta el argumento, el archivo, `distelec.txt` o el archivo principal del padrón, termina con `exit 1` antes de escribir nada ([process-tse-electoral-roll.ts:29-82](../../scripts/process-tse-electoral-roll.ts#L29-L82)).
- **OBS-02-2 (TSE):** De cada línea del padrón solo usa `CODELEC`. Un comentario del código dice que los datos personales "NUNCA se guardan". La salida incluye `containsPersonalData: false` ([:173](../../scripts/process-tse-electoral-roll.ts#L173)).
- **OBS-02-3 (TSE):** Antes de escribir la salida, una expresión regular revisa que el JSON no tenga **llaves** llamadas `cedula`, `nombre`, `apellido(s)`, `nombres` o `fechacaduc`. Si encuentra alguna, termina con `exit 1` ([:181-186](../../scripts/process-tse-electoral-roll.ts#L181-L186)). La revisión solo mira los nombres de las llaves, no los valores.
- **OBS-02-4 (TSE):** `distelec.txt` se carga completo en memoria con `.buffer()` ([:49](../../scripts/process-tse-electoral-roll.ts#L49)), y no hay límites de tamaño para el ZIP ni para sus miembros. Si un `CODELEC` no tiene correspondencia, solo se muestra una advertencia en consola ([:128](../../scripts/process-tse-electoral-roll.ts#L128)) y esa advertencia no queda en los metadatos de salida.
- **OBS-02-5 (MEIC):** El ETL descarga el recurso desde la URL que devuelve el propio CKAN (`resources[0].url`) sin verificar el dominio ([fetchMeicPymes.mjs:61](../../src/modules/publicData/etl/fetchMeicPymes.mjs#L61)). Publica `identificacion` y `nombre` de cada empresa ([:169](../../src/modules/publicData/etl/fetchMeicPymes.mjs#L169)) y registra en `meta` las advertencias de conciliación territorial.
- **OBS-02-6 (SICOP):** La URL del contenedor puede cambiarse con la variable `SICOP_CONTAINER_URL` ([fetchSicop.mjs:41](../../src/modules/procurement/etl/fetchSicop.mjs#L41)) y la de la DTA con `DTA_BASE_URL` ([procurement/etl/territory.mjs:23](../../src/modules/procurement/etl/territory.mjs#L23)). El lector ZIP rechaza ZIP64 y los métodos de compresión no soportados ([sicopZip.mjs:93](../../src/modules/procurement/etl/sicopZip.mjs#L93)). Publica `cedula`, `nombre` y `monto` de instituciones y proveedores.
- **OBS-02-7 (MEIC y SICOP):** El argumento `--salida` acepta cualquier ruta, que se resuelve desde la raíz del proyecto sin restringirla a `public/` ([fetchMeicPymes.mjs:279](../../src/modules/publicData/etl/fetchMeicPymes.mjs#L279), [fetchSicop.mjs:441](../../src/modules/procurement/etl/fetchSicop.mjs#L441)). Los errores se capturan y terminan con `exitCode = 1`. El archivo solo se escribe al final del proceso.
- **OBS-02-8:** Existen los scripts `verifyDataset.mjs` para MEIC y SICOP, que revisan la estructura, la consistencia de los totales y la unicidad de las identificaciones. Se ejecutan a mano: no hay nada que obligue a correrlos antes de publicar. El TSE no tiene un verificador equivalente.
- **OBS-02-9:** No se registran hashes ni firmas del archivo de origen ni del dataset generado. La única evidencia de origen es lo que guarda `meta`.
- **OBS-02-10:** `.gitignore` excluye `*.zip`, `data/raw/`, `data/temp/` y `data_tse_temp/`, así que el ZIP crudo del padrón no se versiona si se deja en esas rutas.

### Criterios de aceptación

| ID | Tipo | Criterio | Código hoy | Aprobación |
|---|---|---|---|---|
| FLU-02-CA01 | [Éxito] | **Dado** el ZIP oficial del padrón del TSE con `distelec.txt` y el archivo principal, **cuando** el operador ejecuta `npm run etl:tse -- <zip>`, **entonces** se genera `public/data/tse-electoral-aggregates.json` con el conteo de electores por provincia, cantón y distrito, `recordsProcessed`, `containsPersonalData: false`, y sin ninguna cédula, nombre, apellido ni fecha de caducidad. | Cumple | Propuesto |
| FLU-02-CA02 | [Éxito] | **Dado** que las fuentes MEIC o SICOP están disponibles, **cuando** el operador ejecuta el ETL y luego el `verifyDataset.mjs` correspondiente, **entonces** el dataset queda escrito en su ruta de `public/`, todas las verificaciones dan `OK` y `meta` indica la fuente, la entidad, la URL de origen y la fecha de generación. | Cumple | Propuesto |
| FLU-02-CA03 | [Error] | **Dado** que falta el argumento del ZIP, el archivo no existe o el ZIP no contiene `distelec.txt` o el archivo principal, **cuando** se ejecuta el ETL del TSE, **entonces** se muestra un mensaje claro, el proceso termina con un código distinto de 0 y el dataset publicado anteriormente no se modifica. | Cumple | Propuesto |
| FLU-02-CA04 | [Error] | **Dado** que una fuente remota no responde, devuelve un error HTTP o cambió de formato (por ejemplo, CKAN con `success: false`, un ZIP64 o un miembro faltante), **cuando** se ejecuta el ETL de MEIC o SICOP, **entonces** el proceso termina con un código distinto de 0 sin sobrescribir el dataset publicado. | Cumple | Propuesto |
| FLU-02-CA05 | [Error] | **Dado** registros que no concilian con la DTA (un `CODELEC` sin correspondencia o un distrito con nombre histórico), **cuando** se genera el dataset, **entonces** la cantidad de registros afectados queda registrada en los metadatos del dataset publicado y no solo en la consola. | Parcial: MEIC sí; TSE solo en consola | Propuesto |
| FLU-02-CA06 | [Uso indebido] | **Dado** que el dataset de salida contendría datos personales no autorizados según D-01 (por ejemplo, cédulas de personas físicas o nombres de personas), **cuando** se ejecuta cualquier ETL, **entonces** el proceso aborta con un código distinto de 0 y no escribe el archivo. | Parcial: solo el TSE, y solo revisa llaves; MEIC y SICOP no tienen control | Bloqueado por D-01 |
| FLU-02-CA07 | [Uso indebido] | **Dado** un archivo de entrada manipulado o desproporcionado (una bomba ZIP, un `distelec.txt` gigante, un XLSX malformado o un ZIP con miembros inesperados), **cuando** se procesa, **entonces** el ETL falla de forma controlada al superar un límite definido, sin agotar la memoria de la máquina y sin escribir una salida parcial. | No cumple: no hay límites de tamaño | Bloqueado por D-04 (límites) |
| FLU-02-CA08 | [Uso indebido] | **Dado** que la URL de origen se redirige a un dominio no oficial (por variable de entorno o porque CKAN devuelve una URL de otro dominio), **cuando** se ejecuta el ETL, **entonces** el proceso rechaza la descarga y termina con error. | No cumple | Bloqueado por D-07 |
| FLU-02-CA09 | [Uso indebido] | **Dado** un valor de `--salida` que apunta fuera de `public/` (por ejemplo `../../`, `src/...` o `server/...`), **cuando** se ejecuta el ETL, **entonces** el proceso lo rechaza sin escribir nada. | No cumple | Propuesto |
| FLU-02-CA10 | [Uso indebido] | **Dado** un cambio en un dataset de `public/` que no fue generado por el ETL o que no pasó la verificación, **cuando** se propone en un PR, **entonces** el cambio no se puede fusionar sin la verificación y la aprobación definidas en D-05. | Sin definir | Bloqueado por D-05 |
