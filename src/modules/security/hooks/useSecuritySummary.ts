import { useEffect, useState } from 'react';
import { useLocation } from '../../../hooks/useLocation';
import { securityService } from '../services/securityService';

/**
 * Indicador principal del módulo de Seguridad para el territorio activo.
 *
 * `useSecurity` está pensado para la página completa del módulo y dispara dos
 * peticiones: las estadísticas y la tabla de detalle (que descarga un CSV). Para
 * una tarjeta de resumen solo hace falta la primera, así que este hook reutiliza
 * `securityService.getStats` y deja fuera el detalle.
 */

const DEFAULT_YEAR = String(new Date().getFullYear());

export interface SecuritySummaryResult {
  /** Total de incidencias registradas en el territorio, o `null` si aún no hay dato. */
  totalIncidents: number | null;
  /** Delito más frecuente del territorio. */
  mostFrequentCrime: string | null;
  year: string;
  isLoading: boolean;
  error: string | null;
}

/** Resultado recibido, junto con el territorio al que corresponde. */
interface SummaryState {
  key: string;
  totalIncidents: number | null;
  mostFrequentCrime: string | null;
  error: string | null;
}

export const useSecuritySummary = (year: string = DEFAULT_YEAR): SecuritySummaryResult => {
  const { selectedProvinceId, selectedCantonId, selectedDistrictId } = useLocation();
  const territoryKey = `${selectedProvinceId ?? ''}|${selectedCantonId ?? ''}|${selectedDistrictId ?? ''}|${year}`;

  const [state, setState] = useState<SummaryState | null>(null);

  // `isLoading` se deriva durante el render comparando el territorio pedido con
  // el del último resultado. Así, al cambiar de territorio la tarjeta vuelve a
  // "cargando" de inmediato, sin necesidad de un setState dentro del efecto.
  const isLoading = state?.key !== territoryKey;

  useEffect(() => {
    // Bandera local de esta ejecución: con `StrictMode` el efecto corre dos
    // veces y no debe tomarse por válido el resultado de la corrida descartada.
    let active = true;
    const controller = new AbortController();

    securityService
      .getStats(
        {
          provinceId: selectedProvinceId ?? undefined,
          cantonId: selectedCantonId ?? undefined,
          districtId: selectedDistrictId ?? undefined,
        },
        { year },
        controller.signal
      )
      .then((stats) => {
        if (!active) return;
        setState({
          key: territoryKey,
          totalIncidents: stats.summary.totalIncidents,
          mostFrequentCrime: stats.summary.mostFrequentCrime,
          error: null,
        });
      })
      .catch((caught: unknown) => {
        if (!active || controller.signal.aborted) return;
        if (caught instanceof Error && caught.name === 'AbortError') return;
        setState({
          key: territoryKey,
          totalIncidents: null,
          mostFrequentCrime: null,
          error: 'No se pudo consultar las estadísticas del OIJ.',
        });
      });

    return () => {
      active = false;
      controller.abort();
    };
  }, [territoryKey, selectedProvinceId, selectedCantonId, selectedDistrictId, year]);

  return {
    totalIncidents: state?.totalIncidents ?? null,
    mostFrequentCrime: state?.mostFrequentCrime ?? null,
    year,
    isLoading,
    error: state?.error ?? null,
  };
};

export default useSecuritySummary;
