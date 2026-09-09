/**
 * Entidades y tipos territoriales de Costa Rica
 */

export interface TerritoryItem {
  id: string;
  name: string;
}

export type TerritoryApiResponse = Record<string, string>;

export interface TerritorySelection {
  province: TerritoryItem | null;
  canton: TerritoryItem | null;
  district: TerritoryItem | null;
}

export interface TerritoryContextValue {
  selection: TerritorySelection;
  provinces: TerritoryItem[];
  cantons: TerritoryItem[];
  districts: TerritoryItem[];
  isLoadingProvinces: boolean;
  isLoadingCantons: boolean;
  isLoadingDistricts: boolean;
  error: string | null;
  selectProvince: (provinceId: string | null) => Promise<void>;
  selectCanton: (cantonId: string | null) => Promise<void>;
  selectDistrict: (districtId: string | null) => void;
  clearTerritory: () => void;
  retryProvinces: () => Promise<void>;
}
