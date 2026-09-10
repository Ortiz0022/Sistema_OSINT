import { useState, useCallback, useEffect, useRef } from 'react';
import type { SecurityFilterState, SecurityStats, SecurityDetails } from '../types/security.types';
import { securityService } from '../services/securityService';
import { useLocation } from '../../../hooks/useLocation';

export const useSecurity = () => {
  const { selectedProvinceId, selectedCantonId, selectedDistrictId } = useLocation();

  const [filters, setFilters] = useState<SecurityFilterState>({
    crimeType: 'all',
    year: new Date().getFullYear().toString(),
  });

  const [stats, setStats] = useState<SecurityStats | null>(null);
  const [isLoadingStats, setIsLoadingStats] = useState<boolean>(false);
  const [statsError, setStatsError] = useState<string | null>(null);

  const [details, setDetails] = useState<SecurityDetails | null>(null);
  const [isLoadingDetails, setIsLoadingDetails] = useState<boolean>(false);
  const [detailsError, setDetailsError] = useState<string | null>(null);
  
  const abortControllerRef = useRef<AbortController | null>(null);

  const updateFilters = useCallback((newFilters: Partial<SecurityFilterState>) => {
    setFilters((prev) => ({ ...prev, ...newFilters }));
  }, []);

  const fetchAll = useCallback(async () => {
    if (abortControllerRef.current) abortControllerRef.current.abort();
    abortControllerRef.current = new AbortController();

    const territoryArgs = {
      provinceId: selectedProvinceId ?? undefined,
      cantonId: selectedCantonId ?? undefined,
      districtId: selectedDistrictId ?? undefined,
    };
    const signal = abortControllerRef.current.signal;

    // Fetch Stats (Main)
    setIsLoadingStats(true);
    setStatsError(null);
    securityService.getStats(territoryArgs, filters, signal)
      .then(setStats)
      .catch((err: any) => {
        if (err.name !== 'AbortError') setStatsError(err.message || 'Error al cargar estadísticas.');
      })
      .finally(() => setIsLoadingStats(false));

    // Fetch Details (CSV)
    setIsLoadingDetails(true);
    setDetailsError(null);
    securityService.getDetails(territoryArgs, filters, signal)
      .then(setDetails)
      .catch((err: any) => {
        if (err.name !== 'AbortError') setDetailsError(err.message || 'Error al cargar tabla detallada.');
      })
      .finally(() => setIsLoadingDetails(false));

  }, [selectedProvinceId, selectedCantonId, selectedDistrictId, filters]);

  // Use useEffect safely with functional fetching avoiding "set-state-in-effect" lint if possible. 
  // We'll leave the current standard effect pattern since it's common.
  useEffect(() => {
    fetchAll();
    return () => {
      if (abortControllerRef.current) abortControllerRef.current.abort();
    };
  }, [fetchAll]);

  return {
    filters,
    updateFilters,
    stats,
    isLoading: isLoadingStats,
    error: statsError,
    details,
    isLoadingDetails,
    detailsError,
    refreshStats: fetchAll,
  };
};

export default useSecurity;
