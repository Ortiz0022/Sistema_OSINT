import { useState, useCallback } from 'react';
import type { SecurityFilterState, SecurityIncident } from '../types/security.types';
import { securityService } from '../services/securityService';
import { useLocation } from '../../../hooks/useLocation';

export const useSecurity = () => {
  const { selectedProvinceId, selectedCantonId, selectedDistrictId } = useLocation();

  const [filters, setFilters] = useState<SecurityFilterState>({
    crimeType: 'all',
    timeRange: 'last_quarter',
    victimGender: 'all',
  });

  const [incidents] = useState<SecurityIncident[]>([]);
  const [isLoading] = useState<boolean>(false);
  const [error] = useState<string | null>(null);

  const updateFilters = useCallback((newFilters: Partial<SecurityFilterState>) => {
    setFilters((prev) => ({ ...prev, ...newFilters }));
  }, []);

  const refreshIncidents = useCallback(async () => {
    await securityService.getIncidents(
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
    incidents,
    isLoading,
    error,
    refreshIncidents,
  };
};

export default useSecurity;
