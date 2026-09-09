import { useTerritoryContext } from '../context/TerritoryContext';
import type { TerritoryItem, TerritorySelection } from '../types/territory.types';

export interface UseLocationReturn {
  // Entidades completas seleccionadas
  selectedProvince: TerritoryItem | null;
  selectedCanton: TerritoryItem | null;
  selectedDistrict: TerritoryItem | null;

  // Nombres directos (o null)
  provinceName: string | null;
  cantonName: string | null;
  districtName: string | null;

  // IDs directos (o null)
  selectedProvinceId: string | null;
  selectedCantonId: string | null;
  selectedDistrictId: string | null;

  // Resumen formateado (ej: "San José > Central > Catedral" o "Nivel Nacional")
  formattedLocation: string;

  // Listados disponibles para selectores
  provinces: TerritoryItem[];
  cantons: TerritoryItem[];
  districts: TerritoryItem[];

  // Estados de carga y error
  isLoadingProvinces: boolean;
  isLoadingCantons: boolean;
  isLoadingDistricts: boolean;
  isLoadingAny: boolean;
  error: string | null;

  // Acciones
  selectProvince: (provinceId: string | null) => Promise<void>;
  selectCanton: (cantonId: string | null) => Promise<void>;
  selectDistrict: (districtId: string | null) => void;
  clearTerritory: () => void;
  retryProvinces: () => Promise<void>;

  // Objeto completo
  selection: TerritorySelection;
}

/**
 * Hook para acceder y manipular la división territorial seleccionada en el Observatorio.
 */
export const useLocation = (): UseLocationReturn => {
  const context = useTerritoryContext();

  const selectedProvince = context.selection.province;
  const selectedCanton = context.selection.canton;
  const selectedDistrict = context.selection.district;

  const provinceName = selectedProvince ? selectedProvince.name : null;
  const cantonName = selectedCanton ? selectedCanton.name : null;
  const districtName = selectedDistrict ? selectedDistrict.name : null;

  const selectedProvinceId = selectedProvince ? selectedProvince.id : null;
  const selectedCantonId = selectedCanton ? selectedCanton.id : null;
  const selectedDistrictId = selectedDistrict ? selectedDistrict.id : null;

  let formattedLocation = 'Nivel Nacional (Todo Costa Rica)';
  if (selectedProvince && selectedCanton && selectedDistrict) {
    formattedLocation = `${selectedProvince.name} > ${selectedCanton.name} > ${selectedDistrict.name}`;
  } else if (selectedProvince && selectedCanton) {
    formattedLocation = `${selectedProvince.name} > ${selectedCanton.name}`;
  } else if (selectedProvince) {
    formattedLocation = `Provincia de ${selectedProvince.name}`;
  }

  const isLoadingAny =
    context.isLoadingProvinces || context.isLoadingCantons || context.isLoadingDistricts;

  return {
    selectedProvince,
    selectedCanton,
    selectedDistrict,
    provinceName,
    cantonName,
    districtName,
    selectedProvinceId,
    selectedCantonId,
    selectedDistrictId,
    formattedLocation,
    provinces: context.provinces,
    cantons: context.cantons,
    districts: context.districts,
    isLoadingProvinces: context.isLoadingProvinces,
    isLoadingCantons: context.isLoadingCantons,
    isLoadingDistricts: context.isLoadingDistricts,
    isLoadingAny,
    error: context.error,
    selectProvince: context.selectProvince,
    selectCanton: context.selectCanton,
    selectDistrict: context.selectDistrict,
    clearTerritory: context.clearTerritory,
    retryProvinces: context.retryProvinces,
    selection: context.selection,
  };
};

export default useLocation;
