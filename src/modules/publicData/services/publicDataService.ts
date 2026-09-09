import type { PublicDataRecord } from '../types/publicData.types';

/**
 * Servicio de Datos Públicos.
 * Diseñado para alojar la lógica de ingestión de un dataset específico del Portal Nacional de Datos Abiertos.
 */
export const publicDataService = {
  /**
   * Obtiene registros del dataset público seleccionado según territorio.
   */
  async fetchDatasetRecords(
    _territory: { provinceId?: string; cantonId?: string; districtId?: string },
    _datasetId?: string
  ): Promise<PublicDataRecord[]> {
    // Retorna vacío de forma segura hasta vincular el dataset concreto
    return [];
  },
};
