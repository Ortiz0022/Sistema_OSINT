# Observatorio Territorial y de Datos Publicos de Costa Rica

Plataforma web moderna orientada a la consulta, fiscalizacion y analisis geoespacial de informacion publica costarricense basada en metodologias de Inteligencia de Fuentes Abiertas (OSINT).

La aplicacion provee una arquitectura full-stack estructurada y tipada estrictamente con TypeScript. Esta disenada para que un equipo pueda desarrollar de manera simultanea multiples modulos tematicos (Contratacion, Seguridad, Datos Publicos, Electoral y Equipamiento Territorial). Todos comparten un selector territorial global en tiempo real, un sistema de diseno institucional con soporte nativo para temas claros y oscuros, y un backend liviano en Express para resolver integraciones de CORS o proxies de APIs gubernamentales.

---

## Tecnologias y Stack

- **Frontend:** React 19, TypeScript (modo estricto)
- **Backend / Proxy:** Node.js, Express, TSX
- **Empaquetador y Dev Server:** Vite
- **Navegacion:** React Router DOM v7
- **Iconografia:** Lucide React
- **Mapas Geoespaciales:** Leaflet, React-Leaflet
- **Visualizacion de Datos:** Recharts
- **Estilos:** Vanilla CSS moderno con Design Tokens (variables CSS personalizadas, soporte de modo oscuro).

---

## Instalacion y Ejecucion

### Requisitos previos
- Node.js (v18 o superior recomendado; probado en Node v24)
- npm (v9 o superior)

### Pasos de instalacion

1. **Clonar o ingresar al directorio del repositorio:**
   ```bash
   cd Sistema_OSINT
   ```

2. **Instalar dependencias:**
   ```bash
   npm install
   ```

3. **Ejecutar en modo de desarrollo local:**
   ```bash
   npm run dev
   ```
   Este comando levantara de forma concurrente tanto el servidor de React (Vite) en el puerto `5173` como el backend (Express) en el puerto `3001`.

4. **Compilar para produccion y verificar tipos TypeScript:**
   ```bash
   npm run build
   ```

### Scripts y Pipelines ETL Disponibles

El repositorio ya incluye los datasets normalizados en `public/`, por lo que no es obligatorio correr los scripts para utilizar la aplicacion. Sin embargo, para regenerar o actualizar los datos desde sus fuentes oficiales, se dispone de los siguientes comandos:

- **Electoral (TSE):**
  ```bash
  npm run etl:tse -- <ruta-al-archivo-zip-del-padron>
  ```
- **Contratacion Publica (SICOP):**
  ```bash
  node src/modules/procurement/etl/fetchSicop.mjs
  ```
- **Datos Publicos (MEIC - PYMES):**
  ```bash
  node src/modules/publicData/etl/fetchMeicPymes.mjs
  ```

---

## Arquitectura y Estructura de Carpetas

El proyecto esta disenado para desacoplar completamente la logica compartida, los scripts de procesamiento y el backend de los modulos tematicos individuales:

```text
.
├── public/                  # Archivos estaticos y conjuntos de datos procesados
│   ├── data/                # GeoJSON de cantones y agregados electorales (TSE)
│   ├── meic-pymes/          # Dataset procesado de PYMES activas (MEIC)
│   └── sicop/               # Dataset territorializado de compras publicas (SICOP)
├── scripts/                 # Scripts ETL independientes (procesamiento streaming del padron TSE)
├── server/                  # Backend en Express para proxies de integracion (CORS)
│   ├── index.ts             # Punto de entrada del servidor
│   └── services/            # Servicios backend (oijService.ts con cache y reintentos)
└── src/
    ├── components/
    │   ├── common/          # Componentes UI reutilizables (Card, Badge, LoadingState, TerritorialSelector)
    │   └── layout/          # Estructura maestra, navbar y conmutador de temas
    ├── constants/           # Rutas y metadatos de fuentes oficiales (Activas/Planificadas)
    ├── context/             # Contextos globales (Territorio y Tema)
    ├── hooks/               # Hooks compartidos (useLocation, useTheme)
    ├── modules/             # Modulos de trabajo funcionalmente independientes
    │   ├── procurement/     # Modulo: Contratacion Publica (SICOP) - ETL, tipos, servicios y vistas
    │   ├── security/        # Modulo: Seguridad (OIJ) - Mapas interactivos y graficos
    │   ├── publicData/      # Modulo: Datos Publicos Nacionales (MEIC / CKAN)
    │   ├── electoral/       # Modulo: Estadisticas Electorales (TSE)
    │   └── places/          # Modulo: Servicios y Lugares (OpenStreetMap)
    ├── pages/               # Vistas principales vinculadas a las rutas del enrutador
    ├── services/            # Clientes HTTP compartidos (locationService.ts)
    ├── styles/              # Reset, utilidades y variables CSS del sistema de diseno
    ├── types/               # Tipos compartidos
    ├── App.tsx              # Enrutador principal de React
    └── main.tsx             # Punto de entrada de Vite
```

---

## Modulos Funcionales

La aplicacion incluye modulos tematicos independientes estructurados bajo una misma arquitectura y sincronizados con el selector territorial global:

1. **Seguridad (OIJ):**
   - *Estado:* Integrado (Fuente Oficial).
   - *Fuente:* Organismo de Investigacion Judicial (OIJ) · Estadisticas Policiales.
   - *Proposito:* Analisis espacial, temporal y tipologico de incidencias delictivas a nivel nacional.
   - *Caracteristicas:* Consumo en tiempo real mediante servidor proxy Express que resuelve politicas de CORS, incorpora cache en memoria (TTL 30 min) y gestion de reintentos. Visualizacion cartografica interactiva con Leaflet renderizando poligonos cantonales (`costa_rica_cantones.geojson`) combinada con graficos temporales y tipologicos en Recharts.

2. **Contratacion Publica (SICOP):**
   - *Estado:* Integrado (Fuente Oficial).
   - *Fuente:* SICOP · Ministerio de Hacienda (Observatorio de Compra Publica).
   - *Proposito:* Fiscalizacion, seguimiento y cruce territorial del egreso del Estado costarricense en compras y contrataciones adjudicadas.
   - *Caracteristicas:* Pipeline ETL en Node.js que procesa los archivos mensuales de datos abiertos, descargando por rango de bytes unicamente los CSVs requeridos (`ProcedimientoAdjudicacion.csv`, `InstitucionesRegistradas.csv` y `Proveedores.csv`). Normaliza las direcciones contra la Division Territorial Administrativa y genera `sicop-territorial.json`. La interfaz permite alternar entre la perspectiva de la entidad compradora o del proveedor, visualizar rankings comparativos entre territorios, tendencias mensuales, flujos de fondos interprovinciales, desglose por tipo de concurso, busqueda de entidades y panel de procedencia de datos.

3. **Datos Publicos (MEIC):**
   - *Estado:* Integrado (Fuente Oficial).
   - *Fuente:* Portal Nacional de Datos Abiertos (`datosabiertos.gob.go.cr`, plataforma CKAN).
   - *Proposito:* Consulta y distribucion territorial del padron de empresas PYME y emprendimientos con condicion activa.
   - *Caracteristicas:* Pipeline ETL que procesa el padron oficial publicado por el Ministerio de Economia, Industria y Comercio (MEIC), cruzando las ubicaciones con la DTA oficial y generando `meic-pymes.json`. Permite analizar la concentracion empresarial por provincia, canton y distrito, categorizada por tamaño de empresa y sector de actividad economica (CIIU).

4. **Electoral (TSE):**
   - *Estado:* Integrado (Fuente Oficial).
   - *Fuente:* Tribunal Supremo de Elecciones (TSE) · Padron Electoral Nacional.
   - *Proposito:* Visualizacion y analisis de la distribucion demografica de electores, proporcion por sexo y cobertura de centros de votacion.
   - *Caracteristicas:* Script ETL por streaming en TypeScript (`process-tse-electoral-roll.ts`) que procesa los archivos abiertos del padron (`PADRON_COMPLETO.txt` y `distelec.txt`) para generar datos agregados (`tse-electoral-aggregates.json`). Presenta indicadores de electores empadronados, distribucion por sexo, desagregacion de nacionales vs. naturalizados, comparativa cantonal/distrital y tabla de juntas receptoras de votos.

5. **Servicios y Lugares (OSM):**
   - *Estado:* Estructura base y tipos definidos (Planificado).
   - *Fuente:* OpenStreetMap / Overpass API.
   - *Proposito:* Mapeo y consulta de infraestructura comunitaria, educativa, centros de salud y servicios de emergencia.
   - *Caracteristicas:* Capa de servicios (`placesService.ts`) y modelos tipados (`places.types.ts`) preparados para realizar consultas geoespaciales delimitadas por la seleccion territorial nominal.

---

## Fuentes de Informacion OSINT

| Modulo | Entidad Oficial | Formato / Protocolo | Acceso y Metodo |
|---|---|---|---|
| **Territorio** | API Publica Ubicaciones CR (IGN / DTA) | REST JSON | Tiempo real (Cliente HTTP) |
| **Seguridad** | Organismo de Investigacion Judicial (OIJ) | REST / JSON | Proxy Express en tiempo real con cache |
| **Contratacion** | SICOP / Ministerio de Hacienda | CSV / ZIP mensual | Pipeline ETL selectivo (HTTP Range) |
| **Datos Publicos** | Portal Nacional Datos Abiertos (MEIC / CKAN) | XLSX / CKAN API | Pipeline ETL normalizado a JSON |
| **Electoral** | Tribunal Supremo de Elecciones (TSE) | TXT delimitado / ZIP | Script ETL por streaming |
| **Servicios** | OpenStreetMap Foundation | Overpass API | Consultas nominales por territorio |

---

## Selector Territorial Global

El selector territorial transversal permite filtrar toda la plataforma basado en la Division Territorial Administrativa de Costa Rica. 

- Consume directamente la API en tiempo real de `ubicaciones.paginasweb.cr`.
- Se normalizan nombres para permitir su sincronizacion con mapeos GeoJSON locales y bases de datos heterogeneas.
- El estado (Provincia -> Canton -> Distrito) se mantiene persistente mediante React Context al navegar entre los diferentes modulos y paneles.

---

## Sistema de Diseno

- **Soporte de Tema:** Modo Claro y Oscuro adaptativos a la preferencia del SO y guardados en localStorage.
- **Paleta de Costa Rica:** Variables CSS basadas en el azul oceanico oscuro y esmeralda de bosque nuboso, asegurando sobriedad y profesionalismo.
- **Interfaz Fluida:** Contenedores reactivos, microanimaciones (hover states) unificados en Cards y botones con diseno contemporaneo, libres de librerias de componentes de UI preempaquetadas invasivas.
