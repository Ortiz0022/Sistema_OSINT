import { useState, useCallback } from 'react';
import type { ProcurementFilterState, ProcurementContract } from '../types/procurement.types';
import { procurementService } from '../services/procurementService';
import { useLocation } from '../../../hooks/useLocation';

export const useProcurement = () => {
  const { selectedProvinceId, selectedCantonId, selectedDistrictId } = useLocation();

  const [filters, setFilters] = useState<ProcurementFilterState>({
    searchQuery: '',
    procurementType: 'all',
    year: '2026',
  });

  const [contracts] = useState<ProcurementContract[]>([]);
  const [isLoading] = useState<boolean>(false);
  const [error] = useState<string | null>(null);

  const updateFilters = useCallback((newFilters: Partial<ProcurementFilterState>) => {
    setFilters((prev) => ({ ...prev, ...newFilters }));
  }, []);

  const refreshContracts = useCallback(async () => {
    await procurementService.getContracts(
      {
        provinceId: selectedProvinceId ?? undefined,
        cantonId: selectedCantonId ?? undefined,
        districtId: selectedDistrictId ?? undefined,
      },
      filters
    );
  }, [selectedProvinceId, selectedCantonId, selectedDistrictId, filters]);

  return {
    filters,
    updateFilters,
    contracts,
    isLoading,
    error,
    refreshContracts,
  };
};

export default useProcurement;
