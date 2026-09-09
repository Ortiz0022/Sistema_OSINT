# Observatorio Territorial y de Datos Públicos de Costa Rica

Plataforma web moderna orientada a la consulta, fiscalización y análisis geoespacial de información pública costarricense basada en metodologías de **Inteligencia de Fuentes Abiertas (OSINT)**.

La aplicación provee una base de frontend modular, tipada estrictamente con TypeScript y preparada para que un equipo de cuatro personas desarrolle simultáneamente módulos temáticos independientes compartiendo un selector territorial global en tiempo real y un sistema de diseño institucional con modo claro y oscuro.

---

## 🛠️ Tecnologías y Stack

- **Librería UI:** React 19
- **Lenguaje:** TypeScript (modo estricto, sin `any`)
- **Empaquetador y Dev Server:** Vite
- **Navegación:** React Router DOM v7
- **Iconografía:** Lucide React
- **Estilos:** Vanilla CSS moderno con Design Tokens (Variables CSS personalizadas, paleta sobria inspirada en Costa Rica, elevaciones y microinteracciones).

---

## 🚀 Instalación y Ejecución

### Requisitos previos
- Node.js (v18 o superior recomendado; testeado en Node v24)
- npm (v9 o superior)

### Pasos de instalación

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
   La aplicación se levantará normalmente en `http://localhost:5173`.

4. **Compilar para producción y verificar tipos TypeScript:**
   ```bash
   npm run build
   ```

---

## 📂 Arquitectura y Estructura de Carpetas

El proyecto está diseñado para desacoplar completamente la lógica compartida de los módulos de trabajo individuales:

```text
src/
├── components/
│   ├── common/              # Componentes UI reutilizables
│   │   ├── Badge.tsx        # Indicadores de estado y etiquetas
│   │   ├── Card.tsx         # Tarjeta interactiva con variantes
│   │   ├── EmptyState.tsx   # Estado vacío institucional
│   │   ├── ErrorState.tsx   # Manejo visual de error con reintento
│   │   ├── LoadingState.tsx # Skeletons y spinners de carga
│   │   ├── PageHeader.tsx   # Encabezado unificado con breadcrumbs territoriales
│   │   ├── SectionContainer.tsx # Contenedor responsive con padding estándar
│   │   ├── SourceInfo.tsx   # Ficha técnica de la fuente oficial
│   │   └── TerritorialSelector.tsx # Selector en cascada con integración a API real
│   └── layout/
│       ├── Layout.tsx       # Estructura maestra con navegación y footer
│       ├── Navbar.tsx       # Barra de navegación principal y mobile drawer
│       └── ThemeToggle.tsx  # Conmutador de modo claro y oscuro
├── constants/
│   ├── routes.ts            # Rutas y metadatos de los módulos
│   └── sources.ts           # Metadatos de fuentes oficiales (SICOP, OIJ, etc.)
├── context/
│   ├── TerritoryContext.tsx # Contexto global para selección territorial
│   └── ThemeContext.tsx     # Contexto global de tema (light / dark)
├── hooks/
│   ├── useLocation.ts       # Hook principal para consumo territorial
│   ├── useTerritory.ts      # Alias semántico de useLocation
│   └── useTheme.ts          # Hook para alternar o consultar tema
├── modules/                 # 4 Módulos de trabajo independiente para el equipo
│   ├── procurement/         # Módulo 1: Contratación Pública (SICOP)
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── services/
│   │   └── types/
│   ├── security/            # Módulo 2: Seguridad (OIJ / Estadísticas Policiales)
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── services/
│   │   └── types/
│   ├── publicData/          # Módulo 3: Datos Públicos (Portal Nacional de Datos Abiertos)
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── services/
│   │   └── types/
│   └── places/              # Módulo 4: Servicios y Lugares (OpenStreetMap / Overpass)
│       ├── components/
│       ├── hooks/
│       ├── services/
│       └── types/
├── pages/                   # Vistas principales vinculadas al router
│   ├── HomePage.tsx         # Dashboard de inicio e indicadores transversales
│   ├── ProcurementPage.tsx  # Vista del módulo de contratación
│   ├── SecurityPage.tsx     # Vista del módulo de seguridad
│   ├── PublicDataPage.tsx   # Vista del módulo de datos públicos
│   └── PlacesPage.tsx       # Vista del módulo de servicios y lugares
├── services/
│   └── locationService.ts   # Cliente HTTP para la API territorial de Costa Rica
├── styles/
│   ├── index.css            # Reset, estilos base y utilidades
│   └── variables.css        # Paleta y tokens de diseño para modo claro/oscuro
├── types/
│   ├── territory.types.ts   # Tipos para la API de división territorial
│   └── theme.types.ts       # Tipos de tema
├── App.tsx                  # Enrutador y árbol de Providers
└── main.tsx                 # Punto de entrada de la aplicación
```

---

## 🗺️ Explicación de los 4 Módulos

Cada módulo cuenta con su propio subdirectorio completamente aislado (`components/`, `hooks/`, `services/`, `types/`) para evitar conflictos de Git al trabajar en simultáneo:

1. **Contratación Pública (`src/modules/procurement/`):**
   - *Fuente futura:* Sistema Integrado de Compras Públicas (**SICOP**).
   - *Propósito:* Seguimiento de procedimientos licitatorios, concursos públicos, montos adjudicados e instituciones compradoras en el territorio delimitado.

2. **Seguridad (`src/modules/security/`):**
   - *Fuente futura:* Organismo de Investigación Judicial (**OIJ**) / Estadísticas Policiales.
   - *Propósito:* Análisis espacial y temporal de denuncias, tipologías delictivas y patrones de seguridad ciudadana por cantón y distrito.

3. **Datos Públicos (`src/modules/publicData/`):**
   - *Fuente futura:* Portal Nacional de Datos Abiertos (**datosabiertos.go.cr**).
   - *Propósito:* Ingestión y estructuración de un conjunto de datos abierto específico de relevancia cívica e institucional.

4. **Servicios y Lugares (`src/modules/places/`):**
   - *Fuente futura:* **OpenStreetMap** / Overpass API.
   - *Propósito:* Mapeo y visualización nominal de infraestructura básica comunitaria (salud, educación, centros de emergencia y edificios gubernamentales).

---

## 📍 Selector Territorial Global (Integración Real)

El selector territorial permite filtrar toda la plataforma por la División Territorial Administrativa oficial de Costa Rica consumiendo la API pública sin autenticación:
- **Base URL:** `https://ubicaciones.paginasweb.cr/`
- **Endpoints:**
  - `GET /provincias.json`
  - `GET /provincia/{id}/cantones.json`
  - `GET /provincia/{provinciaId}/canton/{cantonId}/distritos.json`

### Flujo y Cascada de Selección
1. Al arrancar la aplicación, se cargan las 7 provincias de forma asíncrona.
2. Al seleccionar una provincia, se obtienen automáticamente sus cantones.
3. Si se cambia de provincia, cantón y distrito se reinician de inmediato.
4. Al seleccionar un cantón, se obtienen sus distritos.
5. Si se cambia de cantón, el distrito se reinicia de inmediato.
6. El estado se persiste en el `TerritoryContext` y **se mantiene intacto al navegar entre los diferentes módulos y el inicio**.
7. Se almacenan tanto los **IDs** como los **Nombres** de provincia, cantón y distrito.
8. La capa de servicio (`src/services/locationService.ts`) cuenta con validación de respuestas, control de timeout (`AbortController`), caché en memoria y reintento ante fallos de conexión.

### Cómo consumir la ubicación en cualquier componente
Solo importa el hook `useLocation`:
```tsx
import { useLocation } from '../../hooks/useLocation';

export const MiComponente = () => {
  const {
    selectedProvince,      // { id: "1", name: "San José" } o null
    selectedCanton,        // { id: "1", name: "Central" } o null
    selectedDistrict,      // { id: "1", name: "Carmen" } o null
    selectedProvinceId,    // "1" o null
    selectedCantonId,      // "1" o null
    selectedDistrictId,    // "1" o null
    formattedLocation,     // "San José > Central > Carmen"
    isLoadingAny           // boolean
  } = useLocation();

  return (
    <div>
      <p>Territorio activo: {formattedLocation}</p>
      {selectedProvinceId && <p>ID de Provincia: {selectedProvinceId}</p>}
    </div>
  );
};
```

---

## 🔌 Cómo Agregar Nuevos Servicios o APIs en Cada Módulo

Cada uno de los 4 integrantes del equipo debe trabajar dentro de su módulo correspondiente siguiendo esta guía:

1. **Definir los tipos en `src/modules/<modulo>/types/<modulo>.types.ts`:**
   Declara las interfaces TypeScript para las respuestas de la API externa (ej. datos de licitaciones de SICOP o delitos del OIJ).
2. **Implementar el servicio en `src/modules/<modulo>/services/<modulo>Service.ts`:**
   Crea las funciones de consulta HTTP (`fetch` o cliente API) recibiendo los parámetros territoriales (`provinceId`, `cantonId`, etc.) y filtros correspondientes.
3. **Consumir en el hook del módulo `src/modules/<modulo>/hooks/use<Modulo>.ts`:**
   Utiliza `useLocation()` para detectar los cambios de provincia/cantón/distrito y dispara las consultas de tu servicio, administrando `loading`, `error` y los datos en estados locales.
4. **Renderizar en `src/modules/<modulo>/components/<Modulo>View.tsx`:**
   Sustituye los componentes `<EmptyState />` y los bloques de placeholder por tus tablas, mapas interactivos o gráficos reales, usando los componentes comunes `<Card>`, `<Badge>`, `<LoadingState>` y actualizando `<SourceInfo>`.

---

## 🎨 Sistema de Diseño y Accesibilidad

- **Modo Claro / Modo Oscuro:** Almacenado en `localStorage` y reactivo a la preferencia del sistema operativo (`prefers-color-scheme`).
- **Paleta Institucional:**
  - Azul oceánico profundo costarricense (`--cr-blue-900`, `--cr-blue-600`, `--cr-blue-500`)
  - Esmeralda bosque nuboso (`--cr-forest-600`, `--cr-forest-500`)
  - Acento rojo/coral discreto para alertas y badges (`--cr-coral-600`)
  - Pizarra neutro con alto contraste (`--bg-surface`, `--text-primary`, etc.)
- **Diseño Responsive:** Optimizado para pantallas de escritorio, portátiles, tablets y dispositivos móviles con menú hamburguesa desplegable.
