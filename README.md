# Observatorio Territorial y de Datos Publicos de Costa Rica

Plataforma web moderna orientada a la consulta, fiscalizacion y analisis geoespacial de informacion publica costarricense basada en metodologias de Inteligencia de Fuentes Abiertas (OSINT).

La aplicacion provee una arquitectura full-stack estructurada y tipada estrictamente con TypeScript. Esta disenada para que un equipo pueda desarrollar de manera simultanea multiples modulos tematicos (Contratacion, Seguridad, Datos Publicos, Electoral, etc.). Todos comparten un selector territorial global en tiempo real, un sistema de diseno institucional con soporte nativo para temas claros y oscuros, y un backend liviano en Express para resolver integraciones de CORS o proxies de APIs gubernamentales.

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
   cd ciber_dashboard
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

---

## Arquitectura y Estructura de Carpetas

El proyecto esta disenado para desacoplar completamente la logica compartida, los scripts de procesamiento y el backend de los modulos tematicos individuales:

```text
.
├── public/                  # Archivos estaticos y conjuntos de datos (GeoJSON de mapas, etc.)
├── scripts/                 # Scripts ETL independientes (procesamiento de padron electoral, etc.)
├── server/                  # Backend en Express para proxies de integracion (CORS)
│   ├── index.ts             # Punto de entrada del servidor
│   └── services/            # Servicios backend (ej. oijService.ts para consultar estadisticas policiales)
└── src/
    ├── components/
    │   ├── common/          # Componentes UI reutilizables (Card, Badge, LoadingState, TerritorialSelector)
    │   └── layout/          # Estructura maestra, navbar y conmutador de temas
    ├── constants/           # Rutas y metadatos de fuentes oficiales (Activas/Pendientes)
    ├── context/             # Contextos globales (Territorio y Tema)
    ├── hooks/               # Hooks compartidos (useLocation, useTheme)
    ├── modules/             # Modulos de trabajo funcionalmente independientes
    │   ├── procurement/     # Modulo: Contratacion Publica (SICOP)
    │   ├── security/        # Modulo: Seguridad (OIJ) - Mapas interactivos y graficos
    │   ├── publicData/      # Modulo: Datos Publicos Nacionales
    │   └── places/          # Modulo: Servicios y Lugares (OpenStreetMap)
    ├── pages/               # Vistas principales vinculadas a las rutas
    │   └── ElectoralPage.tsx # Modulo nuevo para visualizacion de estadisticas electorales (TSE)
    ├── services/            # Clientes HTTP compartidos (locationService.ts)
    ├── styles/              # Reset, utilidades y variables CSS del sistema de diseno
    ├── types/               # Tipos compartidos
    ├── App.tsx              # Enrutador principal de React
    └── main.tsx             # Punto de entrada de Vite
```

---

## Modulos Funcionales

La aplicacion incluye multiples modulos separados para asegurar mantenibilidad y modularidad. Algunos se encuentran en fase de prototipado y otros ya cuentan con integracion de produccion.

1. **Seguridad (OIJ):**
   - *Estado:* Integrado (Fuente Oficial).
   - *Proposito:* Analisis espacial, temporal y tipologico de la delincuencia.
   - *Caracteristicas:* Consumo real de los endpoints de estadisticas policiales mediante el servidor proxy Express. Incluye visualizacion mediante Leaflet renderizando poligonos geograficos de Costa Rica que se filtran segun seleccion territorial en sincronia con Recharts.

2. **Electoral (TSE):**
   - *Estado:* En desarrollo.
   - *Proposito:* Visualizacion de distribucion demografica, sexo y centros de votacion basado en cruces asincronos sobre bases de datos abiertas como el padron del TSE. Contiene scripts ETL especiales en Node.js.

3. **Contratacion Publica (SICOP) y Datos Publicos:**
   - *Estado:* Interfaz estructurada, fuente pendiente de conexion.
   - *Proposito:* Seguimiento de procedimientos de compra institucional y datos abiertos.

4. **Servicios y Lugares (OSM):**
   - *Estado:* Estructura inicial (Overpass API).
   - *Proposito:* Mapeo de infraestructura comunitaria gubernamental y de emergencias.

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
