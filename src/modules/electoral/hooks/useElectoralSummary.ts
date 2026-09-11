import { useMemo } from 'react';
import { useLocation } from '../../../hooks/useLocation';
import { useElectoralData } from './useElectoralData';

/**
 * Indicador principal del módulo Electoral para el territorio activo.
 *
 * `useElectoralData` entrega el padrón completo a nivel de distrito (2 178
 * registros). Este hook solo lo agrega según la provincia, el cantón o el
 * distrito seleccionados en el selector global, sin volver a descargar nada.
 */

/**
 * Normaliza un topónimo para comparar. El TSE publica los nombres en
 * mayúsculas y sin tildes, mientras que la División Territorial los entrega con
 * tildes y en formato título.
 */
const normalize = (value: string): string =>
  value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toUpperCase()
    .trim();

/**
 * El padrón incluye los consulados como si fueran provincias (votantes en el
 * exterior). No forman parte del territorio nacional, así que quedan fuera del
 * total nacional.
 */
const CONSULADO = 'CONSULADO';

export interface ElectoralSummaryResult {
  /** Personas empadronadas en el territorio activo, o `null` si aún no hay dato. */
  registeredVoters: number | null;
  /** Cantidad de distritos electorales incluidos en el total. */
  districtCount: number;
  isLoading: boolean;
  error: string | null;
}

export const useElectoralSummary = (): ElectoralSummaryResult => {
  const { data, loading, error } = useElectoralData();
  const { provinceName, cantonName, districtName } = useLocation();

  const aggregate = useMemo(() => {
    if (!data) return { registeredVoters: null, districtCount: 0 };

    const province = provinceName ? normalize(provinceName) : null;
    const canton = cantonName ? normalize(cantonName) : null;
    const district = districtName ? normalize(districtName) : null;

    let registeredVoters = 0;
    let districtCount = 0;

    for (const territory of data.territories) {
      const rowProvince = normalize(territory.province);
      if (province === null) {
        // Total nacional: se excluyen los consulados.
        if (rowProvince === CONSULADO) continue;
      } else if (rowProvince !== province) {
        continue;
      }
      if (canton !== null && normalize(territory.canton) !== canton) continue;
      if (district !== null && normalize(territory.district) !== district) continue;

      registeredVoters += territory.registeredVoters;
      districtCount += 1;
    }

    return { registeredVoters, districtCount };
  }, [data, provinceName, cantonName, districtName]);

  return {
    registeredVoters: aggregate.registeredVoters,
    districtCount: aggregate.districtCount,
    isLoading: loading,
    error: error ? 'No se pudo cargar el padrón electoral del TSE.' : null,
  };
};

export default useElectoralSummary;
