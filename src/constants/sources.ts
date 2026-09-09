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
    status: 'en_preparacion',
    officialUrl: 'https://sitiooij.poder-judicial.go.cr/',
    description: 'Registros oficiales de incidencias, denuncias y delitos penales.',
  },
  datosAbiertos: {
    id: 'datos-abiertos-cr',
    name: 'Portal Nacional de Datos Abiertos de Costa Rica',
    officialEntity: 'Ministerio de Ciencia, Innovación, Tecnología y Telecomunicaciones (MICITT)',
    status: 'en_preparacion',
    officialUrl: 'https://datosabiertos.go.cr/',
    description: 'Catálogo oficial de datos de instituciones públicas costarricenses.',
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
