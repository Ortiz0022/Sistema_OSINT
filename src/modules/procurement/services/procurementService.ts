import type { ProcurementContract, ProcurementFilterState } from '../types/procurement.types';

/**
 * Servicio del Módulo de Contratación Pública.
 * Preparado para la futura integración con el API o endpoints de SICOP.
 */
export const procurementService = {
  /**
   * Consulta contrataciones por filtro territorial y criterios específicos.
   * Por ahora retorna vacío hasta conectar la API de SICOP.
   */
  async getContracts(
    _territory: { provinceId?: string; cantonId?: string; districtId?: string },
    _filters?: Partial<ProcurementFilterState>
  ): Promise<ProcurementContract[]> {
    // Simula una consulta vacía hasta la integración real
    return [];
  },
};
