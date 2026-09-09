# Módulo — Datos Públicos (fuente OSINT: Portal Nacional de Datos Abiertos)

> **Integrante responsable:** _Krystel Fabiana Salazar Chavarría_

Este módulo muestra el padrón de empresas Pyme y emprendimientos con
condición activa que publica el Ministerio de Economía, Industria y Comercio
(MEIC), cruzado con el territorio del país.

---

## 1. ¿Qué problema resuelve?

El MEIC publica mensualmente el listado de empresas Pyme activas según la Ley
de Fortalecimiento de las PYME (N.º 8262), con la provincia, el cantón y el
distrito donde cada una está inscrita. Es un dato real y útil para ver dónde
está concentrada la actividad económica del país, pero se publica como un
único archivo Excel de más de 25 mil filas: no hay forma de filtrarlo por
territorio ni de compararlo entre cantones sin procesarlo primero.

Este módulo hace ese procesamiento y deja el resultado **filtrable con el
mismo selector de provincia, cantón y distrito que usa todo el observatorio**.

---

## 2. La fuente

| | |
|---|---|
| **Fuente** | Lista de Pymes activas — Empresas Activas |
| **Quién la publica** | Ministerio de Economía, Industria y Comercio (MEIC) |
| **Dónde se publica** | Portal Nacional de Datos Abiertos de Costa Rica (CKAN) |
| **Portal oficial** | https://datosabiertos.gob.go.cr/ |
| **Ficha del dataset** | https://datosabiertos.gob.go.cr/dataset/lista-de-pymes-activas-empresas-activas-enero-2025 |
| **Formato publicado** | XLSX (un único recurso, ~1.9 MB) |
| **Licencia** | Creative Commons Attribution (CC-BY) |
| **¿Pide usuario o clave?** | No. Es público, sin credenciales |

### Sobre el dominio del portal

El enunciado de la tarea cita `datosabiertos.go.cr` (sin "gob"). Ese dominio
**no respondió en ningún intento durante el desarrollo** (Cloudflare devolvía
`522 Connection timed out`, es decir, el propio servidor de origen no
contestaba). El dominio vigente del mismo portal —confirmado con la API CKAN
respondiendo con normalidad— es **`datosabiertos.gob.go.cr`**. `src/constants/sources.ts`
quedó actualizado con la dirección correcta.

Es un catálogo nuevo (creado en diciembre de 2025) y todavía pequeño: 13
datasets en total, de tres instituciones (Hacienda, MTSS y MEIC). De esos, el
padrón de Pymes del MEIC fue el único con columnas de provincia, cantón y
distrito y un tamaño manejable, por eso se eligió.

### Verificación de que el dato es real

Antes de escribir cualquier tipo o componente, se verificó el archivo real
byte a byte:

- El tamaño del recurso que reporta la API de CKAN (`1 929 965` bytes) coincide
  exacto con el archivo descargado.
- Las columnas reales son: `ID CONSECUTIVO`, `NOMBRE`, `IDENTIFICACION`,
  `TAMAÑO`, `PROVINCIA`, `CANTÓN`, `DISTRITO`, `REGIÓN`, `ACTIVIDAD CIIU`.
- El archivo declara 30 864 filas, pero **5 202 son filas de plantilla
  completamente vacías** al final de la hoja (un artefacto del Excel, no datos
  faltantes). Las filas con datos reales son **25 661**.

---

## 3. Cómo se consume la fuente

**El navegador no puede leer el XLSX de forma directa y útil.** Aunque se
pudiera descargar, parsear un Excel de ~2 MB con miles de filas en el
navegador en cada visita sería lento e innecesario, y habría que sumar una
librería de parseo de XLSX solo para el cliente. Por eso el consumo sigue el
mismo patrón que el módulo de Contratación Pública: un programa aparte
descarga y transforma los datos, y la web solo lee un JSON ya listo.

```
CKAN (XLSX)  →  programa de descarga en Node
             →  public/meic-pymes/meic-pymes.json
             →  la web filtra, calcula y grafica en el navegador
```

### Paso 1 — Descarga

El programa consulta primero la API de CKAN (`package_show`) para obtener la
URL vigente del recurso y sus metadatos (formato, licencia, fecha de
publicación), y luego descarga el XLSX desde esa URL.

### Paso 2 — Lectura del XLSX sin librerías externas

Un XLSX es un ZIP con XML adentro. En vez de sumar una dependencia npm solo
para esto, [`etl/xlsxReader.mjs`](./etl/xlsxReader.mjs) lo lee con
`node:zlib` (los XLSX no usan compresión exótica) y un parseo de la estructura
de celdas de Office Open XML. No es un lector de XLSX genérico: cubre
únicamente lo que este archivo usa (celdas de texto vía `sharedStrings.xml` y
celdas numéricas, sin fórmulas ni celdas combinadas).

### Paso 3 — Limpieza y reconciliación territorial

1. Se descartan las filas de plantilla vacías y las que no traen
   identificación, nombre o un tamaño reconocido.
2. Se separa `ACTIVIDAD CIIU` ("4620 - Venta al por mayor...") en código y
   descripción.
3. **Se traduce PROVINCIA/CANTÓN/DISTRITO a los mismos identificadores que usa
   el selector territorial global** (`https://ubicaciones.paginasweb.cr/`),
   con [`etl/territory.mjs`](./etl/territory.mjs).

### Paso 4 — Guardar el resultado

`public/meic-pymes/meic-pymes.json` (~5.8 MB), con empresas, agregados por
provincia/cantón/distrito, catálogo de sectores CIIU y un bloque de
**procedencia** con advertencias explícitas.

---

## 4. La reconciliación territorial, en números

El padrón trae los nombres oficiales de provincia/cantón/distrito, pero no
son idénticos, carácter por carácter, a los de la DTA:

- La DTA llama `Central` al cantón cabecera de 6 provincias; el MEIC usa el
  nombre de la ciudad (`San José`, `Cartago`, `Limón`…).
- El MEIC conserva nombres de cantón anteriores a un cambio oficial:
  `Aguirre` (hoy Quepos), `Valverde Vega` (hoy Sarchí), `Alfaro Ruiz` (hoy
  Zarcero), y una variante de escritura (`Vásquez` en vez de `Vázquez` de
  Coronado).

Con esa tabla de equivalencias (la misma técnica que ya usa el módulo de
Contratación Pública para el mismo problema):

| Nivel | Empresas conciliadas |
|---|---|
| Provincia | 25 661 / 25 661 (100 %) |
| Cantón | 25 661 / 25 661 (100 %) — los 82 cantones de la DTA quedan representados |
| Distrito | 23 849 / 25 661 (92,9 %) |

El 7,1 % restante usa un nombre de distrito histórico o alternativo que no
coincide con el vigente (por ejemplo, `Aguirre` en vez de un distrito real de
Quepos, o `San Isidro del General` en vez del nombre oficial actual). Para
esas empresas el filtro territorial llega hasta el nivel de cantón, **nunca se
les asigna un distrito a la fuerza**: se preserva el nombre tal cual lo
publica el MEIC. Es la misma decisión de diseño que ya toma el módulo de
Contratación Pública ante el mismo tipo de discrepancia.

---

## 5. Qué se ve en la pantalla

- **Caja "¿Qué estoy viendo?"** con la explicación en lenguaje cotidiano.
- **Filtro por tamaño de empresa** (Todas / Micro / Pequeña / Mediana),
  buscador de texto y orden, todo reactivo al selector territorial global.
- **4 tarjetas de indicadores**: empresas activas, % que son Micro, sectores
  económicos distintos y el cantón (o distrito) con más empresas.
- **Ranking territorial en barras**: provincias a nivel nacional, o cantones
  de la provincia cuando hay un cantón elegido.
- **Desglose por Actividad CIIU**: los sectores con más empresas del
  territorio activo.
- **Tabla paginada** (15 filas por página) con nombre, tamaño, ubicación y
  actividad económica.
- **Panel de procedencia** con la fuente, el formato, la licencia y la fecha
  de consulta.
- **Glosario** de los términos que usa el padrón (PYME, CIIU, condición
  activa, etc.).

Todo reacciona al selector territorial global (`useLocation`).

---

## 6. Cómo ejecutarlo

El repositorio ya trae el archivo de datos generado, así que la aplicación
funciona con `npm run dev` sin pasos extra. Para volver a generarlo:

```bash
node src/modules/publicData/etl/fetchMeicPymes.mjs

# Revisar que el archivo generado esté correcto
node src/modules/publicData/etl/verifyDataset.mjs
```

Necesita Node 18 o superior. No requiere ninguna variable de entorno ni
credencial: toda la información consumida es pública.

---

## 7. Archivos del módulo

```text
src/modules/publicData/
├── etl/
│   ├── fetchMeicPymes.mjs     # Programa principal (descarga + transforma + guarda)
│   ├── xlsxReader.mjs         # Lee la hoja de un XLSX sin librerías externas
│   ├── territory.mjs          # Traduce provincia/cantón/distrito al mapa oficial
│   └── verifyDataset.mjs      # Revisa que el archivo generado esté correcto
├── constants/meicSource.ts    # Datos de la fuente y glosario
├── types/publicData.types.ts
├── services/
│   ├── publicDataService.ts   # Carga el archivo: timeout, caché en memoria
│   └── publicDataAnalytics.ts # Filtros, agregados y cálculos (funciones puras)
├── hooks/usePublicData.ts
└── components/
    ├── PublicDataView.tsx     # La pantalla
    ├── PublicDataRanking.tsx  # Barras comparando territorios
    ├── PublicDataTable.tsx    # Tabla paginada de empresas
    └── PublicDataView.css
```

Lo que produce el programa: `public/meic-pymes/meic-pymes.json`.

---

## 8. Qué pasa cuando algo falla

| Si pasa esto... | La aplicación hace esto |
|---|---|
| El archivo de datos no se ha generado | Avisa y dice exactamente qué comando correr |
| Se cae la conexión al cargar | Muestra el error y ofrece un botón "Intentar de nuevo" |
| El archivo está dañado o es de otra versión | Lo detecta antes de dibujar nada |
| El cantón elegido no tiene Pymes activas | Muestra los datos de toda la provincia y lo avisa |
| El distrito elegido no concilia contra la DTA | Muestra los datos del cantón y lo avisa |

Durante el desarrollo, la descarga del recurso XLSX falló una vez por tiempo
de espera (`HTTP 522`) y funcionó al reintentar segundos después: es un portal
nuevo, sin garantías de disponibilidad publicadas.

---

## 9. Uso responsable

- Solo se usan datos públicos, sin evadir ningún control de acceso.
- El módulo trabaja con **empresas**, no con datos de personas físicas más
  allá de lo que el propio MEIC ya publica como abierto (emprendimientos a
  título personal, identificados con su cédula, tal como los publica la
  fuente oficial).
- Es una **fotografía** del padrón a la fecha de publicación: no refleja
  altas ni bajas posteriores, y la pantalla lo dice de forma explícita.
- El tamaño (Micro/Pequeña/Mediana) es la clasificación administrativa del
  MEIC, no una medición independiente de ingresos o personal.
