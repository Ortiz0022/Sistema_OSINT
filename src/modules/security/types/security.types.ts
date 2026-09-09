/**
 * Tipos para el módulo de Seguridad (OIJ / Estadísticas Policiales)
 */

export interface SecurityFilterState {
  crimeType: string;
  timeRange: string;
  victimGender: string;
}

export interface SecurityIncident {
  id: string;
  crimeType: string;
  canton: string;
  district: string;
  date: string;
  hourRange: string;
}

export interface SecuritySummary {
  moduleStatus: 'en_preparacion';
  connectedSource: string;
}
