import type { PlacePointOfInterest, PlacesFilterState } from '../types/places.types';

/**
 * Servicio de Servicios y Lugares.
 * Preparado para la futura integración con OpenStreetMap / Overpass API
 * utilizando los nombres e IDs territoriales oficiales seleccionados.
 */
export const placesService = {
  /**
   * Consulta puntos de interés comunitarios por delimitación territorial nominal.
   */
  async getPointsOfInterest(
    _territory: {
      provinceId?: string;
      provinceName?: string;
      cantonId?: string;
      cantonName?: string;
      districtId?: string;
      districtName?: string;
    },
    _filters?: Partial<PlacesFilterState>
  ): Promise<PlacePointOfInterest[]> {
    // Retorna vacío de forma segura hasta conectar la API de Overpass/OSM
    return [];
  },
};
