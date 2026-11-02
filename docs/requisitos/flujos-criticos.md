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
