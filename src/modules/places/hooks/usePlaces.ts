import { useState, useCallback } from 'react';
import type { PlacesFilterState, PlacePointOfInterest } from '../types/places.types';
import { placesService } from '../services/placesService';
import { useLocation } from '../../../hooks/useLocation';

export const usePlaces = () => {
  const {
    selectedProvinceId,
    selectedCantonId,
    selectedDistrictId,
    provinceName,
    cantonName,
    districtName,
  } = useLocation();

  const [filters, setFilters] = useState<PlacesFilterState>({
    category: 'all',
    searchQuery: '',
  });

  const [places] = useState<PlacePointOfInterest[]>([]);
  const [isLoading] = useState<boolean>(false);
  const [error] = useState<string | null>(null);

  const updateFilters = useCallback((newFilters: Partial<PlacesFilterState>) => {
    setFilters((prev) => ({ ...prev, ...newFilters }));
  }, []);

  const refreshPlaces = useCallback(async () => {
    await placesService.getPointsOfInterest(
      {
        provinceId: selectedProvinceId ?? undefined,
        provinceName: provinceName ?? undefined,
        cantonId: selectedCantonId ?? undefined,
        cantonName: cantonName ?? undefined,
        districtId: selectedDistrictId ?? undefined,
        districtName: districtName ?? undefined,
      },
      filters
    );
  }, [
    selectedProvinceId,
    provinceName,
    selectedCantonId,
    cantonName,
    selectedDistrictId,
    districtName,
    filters,
  ]);

  return {
    filters,
    updateFilters,
    places,
    isLoading,
    error,
    refreshPlaces,
  };
};

export default usePlaces;
