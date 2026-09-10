export interface SourceMetadata {
  id: string;
  name: string;
  officialEntity: string;
  status: 'en_preparacion' | 'activo' | 'planificado';
  officialUrl?: string;
  description: string;
}

export const DATA_SOURCES: Record<string, SourceMetadata> = {
  ubicaciones: {
    id: 'ubicaciones-cr',
    name: 'División Territorial Administrativa',
    officialEntity: 'API Pública de Ubicaciones CR (IGN / DTA)',
    status: 'activo',
    officialUrl: 'https://ubicaciones.paginasweb.cr/',
    description: 'Provincias, cantones y distritos de la República de Costa Rica.',
  },
  sicop: {
    id: 'sicop',
    name: 'Sistema Integrado de Compras Públicas (SICOP)',
    officialEntity: 'Ministerio de Hacienda / RACSA',
    status: 'en_preparacion',
    officialUrl: 'https://www.sicop.go.cr/',
    description: 'Plataforma oficial de compras y contrataciones del Estado costarricense.',
  },
  oij: {
    id: 'oij-estadisticas',
    name: 'Estadísticas Policiales y Delictivas',
    officialEntity: 'Organismo de Investigación Judicial (OIJ)',
    status: 'activo',
    officialUrl: 'https://sitiooij.poder-judicial.go.cr/',
    description: 'Registros oficiales de incidencias, denuncias y delitos penales.',
  },
  datosAbiertos: {
    id: 'datos-abiertos-cr',
    name: 'Portal Nacional de Datos Abiertos de Costa Rica',
    officialEntity: 'Gobierno de Costa Rica (CKAN)',
    status: 'activo',
    // El dominio "datosabiertos.go.cr" (sin "gob") citado en enunciados
    // anteriores está fuera de servicio; el portal vigente es este.
    officialUrl: 'https://datosabiertos.gob.go.cr/',
    description:
      'Catálogo oficial de datos abiertos de instituciones públicas costarricenses, sobre CKAN. El módulo de Datos Públicos consume en vivo el padrón de Pymes activas que publica el MEIC.',
  },
  osm: {
    id: 'osm-overpass',
    name: 'OpenStreetMap / Overpass Cartografía',
    officialEntity: 'OpenStreetMap Foundation & Comunidad Costa Rica',
    status: 'en_preparacion',
    officialUrl: 'https://www.openstreetmap.org/',
    description: 'Datos geoespaciales colaborativos de infraestructura y servicios comunitarios.',
  },
};
