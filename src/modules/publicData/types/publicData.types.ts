/**
 * Tipos para el módulo de Datos Públicos (Portal Nacional de Datos Abiertos)
 * Estructura simplificada y preparada para conectar un dataset específico de datos abiertos.
 */

export interface PublicDatasetConfig {
  datasetId: string;
  title: string;
  publisher: string;
  format: 'CSV' | 'JSON' | 'GEOJSON';
  isLoaded: boolean;
}

export interface PublicDataFilterState {
  category: string;
  searchQuery: string;
}

export interface PublicDataRecord {
  id: string;
  [key: string]: unknown;
}
