/**
 * Tipos para el módulo de Contratación Pública (SICOP)
 * Estructura preparada para integración con compras estatales.
 */

export interface ProcurementFilterState {
  searchQuery: string;
  procurementType: string;
  year: string;
}

export interface ProcurementContract {
  id: string;
  expediente: string;
  institution: string;
  description: string;
  amountCrc: number;
  date: string;
  status: 'adjudicado' | 'en_tramite' | 'desierto';
}

export interface ProcurementSummary {
  moduleStatus: 'en_preparacion';
  connectedSource: string;
}
