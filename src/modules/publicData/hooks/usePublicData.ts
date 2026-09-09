import { useState, useCallback } from 'react';
import type { PublicDataFilterState, PublicDataRecord, PublicDatasetConfig } from '../types/publicData.types';
import { publicDataService } from '../services/publicDataService';
import { useLocation } from '../../../hooks/useLocation';

export const usePublicData = () => {
  const { selectedProvinceId, selectedCantonId, selectedDistrictId } = useLocation();

  const [activeDataset] = useState<PublicDatasetConfig>({
    datasetId: 'dataset-institucional-cr',
    title: 'Dataset Oficial en Definición',
    publisher: 'Portal Nacional de Datos Abiertos (MICITT)',
    format: 'JSON',
    isLoaded: false,
  });

  const [filters, setFilters] = useState<PublicDataFilterState>({
    category: 'institucional',
    searchQuery: '',
  });

  const [records] = useState<PublicDataRecord[]>([]);
  const [isLoading] = useState<boolean>(false);
  const [error] = useState<string | null>(null);

  const updateFilters = useCallback((newFilters: Partial<PublicDataFilterState>) => {
    setFilters((prev) => ({ ...prev, ...newFilters }));
  }, []);

  const loadDataset = useCallback(async () => {
    await publicDataService.fetchDatasetRecords(
      {
        provinceId: selectedProvinceId ?? undefined,
        cantonId: selectedCantonId ?? undefined,
        districtId: selectedDistrictId ?? undefined,
      },
      activeDataset.datasetId
    );
  }, [selectedProvinceId, selectedCantonId, selectedDistrictId, activeDataset.datasetId]);

  return {
    activeDataset,
    filters,
    updateFilters,
    records,
    isLoading,
    error,
    loadDataset,
  };
};

export default usePublicData;
