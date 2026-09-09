import type { SecurityIncident, SecurityFilterState } from '../types/security.types';

/**
 * Servicio del Módulo de Seguridad.
 * Preparado para la futura integración con las estadísticas policiales y delictivas del OIJ.
 */
export const securityService = {
  /**
   * Consulta incidencias delictivas por territorio y filtros seleccionados.
   */
  async getIncidents(
    _territory: { provinceId?: string; cantonId?: string; districtId?: string },
    _filters?: Partial<SecurityFilterState>
  ): Promise<SecurityIncident[]> {
    // Retorna vacío de forma segura hasta conectar la fuente del OIJ
    return [];
  },
};
