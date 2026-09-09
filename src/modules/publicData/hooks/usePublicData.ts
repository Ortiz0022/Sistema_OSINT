import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation } from '../../../hooks/useLocation';
import { publicDataService, PublicDataSourceError } from '../services/publicDataService';
import { analyzePublicData } from '../services/publicDataAnalytics';
import type { PublicDataAnalysis, PublicDataFilterState, PublicDataset } from '../types/publicData.types';

const INITIAL_FILTERS: PublicDataFilterState = {
  searchQuery: '',
  sizeFilter: 'todas',
  sortBy: 'nombre',
};

export interface UsePublicDataReturn {
  dataset: PublicDataset | null;
  analysis: PublicDataAnalysis | null;
  filters: PublicDataFilterState;
  updateFilters: (next: Partial<PublicDataFilterState>) => void;
  isLoading: boolean;
  error: string | null;
  errorHint: string | null;
  reload: () => void;
}

/**
 * Orquesta el módulo de Datos Públicos: descarga el dataset de Pymes del MEIC
 * una sola vez, reacciona al selector territorial global y recalcula el
 * análisis cuando cambia el territorio o los filtros locales.
 */
export const usePublicData = (): UsePublicDataReturn => {
  const {
    selectedProvinceId,
    selectedCantonId,
    selectedDistrictId,
    provinceName,
    cantonName,
    districtName,
  } = useLocation();

  const [dataset, setDataset] = useState<PublicDataset | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [errorHint, setErrorHint] = useState<string | null>(null);
  const [filters, setFilters] = useState<PublicDataFilterState>(INITIAL_FILTERS);
  const [reloadToken, setReloadToken] = useState<number>(0);

  useEffect(() => {
    // Bandera local de esta ejecución del efecto: con `StrictMode` el efecto
    // corre dos veces y un ref compartido haría que la segunda ejecución
    // tomara por válido el resultado ya descartado de la primera.
    let active = true;

    publicDataService
      .getDataset({ force: reloadToken > 0 })
      .then((result) => {
        if (!active) return;
        setDataset(result);
      })
      .catch((caught: unknown) => {
        if (!active) return;
        if (caught instanceof PublicDataSourceError) {
          setError(caught.message);
          setErrorHint(
            caught.reason === 'no_publicado'
              ? 'Para generarlo, corré en la terminal: node src/modules/publicData/etl/fetchMeicPymes.mjs'
              : null
          );
        } else {
          setError('Ocurrió un error inesperado al leer los datos de Pymes del MEIC.');
          setErrorHint(null);
        }
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [reloadToken]);

  const updateFilters = useCallback((next: Partial<PublicDataFilterState>) => {
    setFilters((previous) => ({ ...previous, ...next }));
  }, []);

  const reload = useCallback(() => {
    publicDataService.clearCache();
    setIsLoading(true);
    setError(null);
    setErrorHint(null);
    setReloadToken((token) => token + 1);
  }, []);

  const analysis = useMemo<PublicDataAnalysis | null>(() => {
    if (!dataset) return null;
    return analyzePublicData(
      dataset,
      {
        provinciaId: selectedProvinceId,
        cantonId: selectedCantonId,
        distritoId: selectedDistrictId,
        provinciaNombre: provinceName,
        cantonNombre: cantonName,
        distritoNombre: districtName,
      },
      filters
    );
  }, [
    dataset,
    selectedProvinceId,
    selectedCantonId,
    selectedDistrictId,
    provinceName,
    cantonName,
    districtName,
    filters,
  ]);

  return { dataset, analysis, filters, updateFilters, isLoading, error, errorHint, reload };
};

export default usePublicData;
