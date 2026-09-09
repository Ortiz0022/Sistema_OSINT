/**
 * Tipos para el módulo de Servicios y Lugares (OpenStreetMap / Overpass API)
 */

export interface PlaceCategory {
  id: string;
  name: string;
}

export interface PlacesFilterState {
  category: string;
  searchQuery: string;
}

export interface PlacePointOfInterest {
  id: string;
  name: string;
  category: string;
  address?: string;
  provinceName: string;
  cantonName?: string;
  districtName?: string;
}

export interface PlacesSummary {
  moduleStatus: 'en_preparacion';
  connectedSource: string;
}
