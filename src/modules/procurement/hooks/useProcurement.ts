import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation } from '../../../hooks/useLocation';
import { procurementService, ProcurementSourceError } from '../services/procurementService';
import { analyzeProcurement } from '../services/procurementAnalytics';
import type {
  ProcurementAnalysis,
  ProcurementFilterState,
  SicopDataset,
} from '../types/procurement.types';

const INITIAL_FILTERS: ProcurementFilterState = {
  searchQuery: '',
  lens: 'comprador',
  sortBy: 'monto',
};

export interface UseProcurementReturn {
  dataset: SicopDataset | null;
  analysis: ProcurementAnalysis | null;
  filters: ProcurementFilterState;
  updateFilters: (next: Partial<ProcurementFilterState>) => void;
  isLoading: boolean;
  error: string | null;
  errorHint: string | null;
  reload: () => void;
}

/**
 * Orquesta el módulo de Contratación Pública: descarga el dataset de SICOP una
 * sola vez, reacciona al selector territorial global y recalcula el análisis
 * cuando cambia el territorio o los filtros locales.
 */
export const useProcurement = (): UseProcurementReturn => {
  const {
    selectedProvinceId,
    selectedCantonId,
    selectedDistrictId,
    provinceName,
    cantonName,
    districtName,
  } = useLocation();

  const [dataset, setDataset] = useState<SicopDataset | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [errorHint, setErrorHint] = useState<string | null>(null);
  const [filters, setFilters] = useState<ProcurementFilterState>(INITIAL_FILTERS);
  const [reloadToken, setReloadToken] = useState<number>(0);

  useEffect(() => {
    // Bandera local de esta ejecución del efecto (no un ref compartido): con
    // `StrictMode` el efecto corre dos veces y un ref haría que la segunda
    // ejecución tomara por válido el resultado de la primera, ya descartada.
    let active = true;

    // El estado de carga se inicializa en `true` y se reinicia desde `reload()`,
    // no aquí: así el efecto solo sincroniza con la red y no dispara renders
    // en cascada.
    procurementService
      .getDataset({ force: reloadToken > 0 })
      .then((result) => {
        if (!active) return;
        setDataset(result);
      })
      .catch((caught: unknown) => {
        if (!active) return;
        if (caught instanceof ProcurementSourceError) {
          setError(caught.message);
          setErrorHint(
            caught.reason === 'no_publicado'
              ? 'Para generarlo, corré en la terminal: node src/modules/procurement/etl/fetchSicop.mjs'
              : null
          );
        } else {
          setError('Ocurrió un error inesperado al leer los datos de SICOP.');
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

  const updateFilters = useCallback((next: Partial<ProcurementFilterState>) => {
    setFilters((previous) => ({ ...previous, ...next }));
  }, []);

  const reload = useCallback(() => {
    procurementService.clearCache();
    setIsLoading(true);
    setError(null);
    setErrorHint(null);
    setReloadToken((token) => token + 1);
  }, []);

  const analysis = useMemo<ProcurementAnalysis | null>(() => {
    if (!dataset) return null;
    return analyzeProcurement(
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

export default useProcurement;
