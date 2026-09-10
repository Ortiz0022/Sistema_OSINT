/**
 * Tipos para el módulo de Seguridad (OIJ / Estadísticas Policiales)
 */

export interface SecurityFilterState {
  crimeType: string;
  year: string;
}

export interface CrimeTypeChart {
  name: string;
  value: number;
}

export interface MonthlyChart {
  name: string;
  total: number;
}

export interface TableRow {
  delito: string;
  subdelito: string;
  count: number;
}

export interface SecurityStats {
  summary: {
    totalIncidents: number;
    mostFrequentCrime: string;
    uniqueCrimeTypes: number;
  };
  chartCrimeTypes: CrimeTypeChart[];
  chartMonthly: MonthlyChart[];
  availableCrimeTypes: string[];
}

export interface SecurityDetails {
  tableData: TableRow[];
  _notes?: string;
}

export interface SecuritySummary {
  moduleStatus: 'en_preparacion' | 'activo';
  connectedSource: string;
}
