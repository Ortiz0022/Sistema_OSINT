import React, { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import type { TerritoryItem, TerritorySelection, TerritoryContextValue } from '../types/territory.types';
import { locationService } from '../services/locationService';

const TerritoryContext = createContext<TerritoryContextValue | undefined>(undefined);

interface TerritoryProviderProps {
  children: ReactNode;
}

export const TerritoryProvider: React.FC<TerritoryProviderProps> = ({ children }) => {
  const [selection, setSelection] = useState<TerritorySelection>({
    province: null,
    canton: null,
    district: null,
  });

  const [provinces, setProvinces] = useState<TerritoryItem[]>([]);
  const [cantons, setCantons] = useState<TerritoryItem[]>([]);
  const [districts, setDistricts] = useState<TerritoryItem[]>([]);

  const [isLoadingProvinces, setIsLoadingProvinces] = useState<boolean>(false);
  const [isLoadingCantons, setIsLoadingCantons] = useState<boolean>(false);
  const [isLoadingDistricts, setIsLoadingDistricts] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Carga inicial de provincias
  const loadProvinces = useCallback(async () => {
    setIsLoadingProvinces(true);
    setError(null);
    try {
      const data = await locationService.getProvinces();
      setProvinces(data);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error al cargar las provincias de Costa Rica.';
      setError(message);
    } finally {
      setIsLoadingProvinces(false);
    }
  }, []);

  useEffect(() => {
    void loadProvinces();
  }, [loadProvinces]);

  // Selección de provincia (limpia cantón y distrito)
  const selectProvince = useCallback(async (provinceId: string | null) => {
    if (!provinceId) {
      setSelection({ province: null, canton: null, district: null });
      setCantons([]);
      setDistricts([]);
      return;
    }

    const matchedProvince = provinces.find((p) => p.id === provinceId) ?? {
      id: provinceId,
      name: `Provincia ${provinceId}`,
    };

    setSelection({
      province: matchedProvince,
      canton: null,
      district: null,
    });
    setCantons([]);
    setDistricts([]);
    setIsLoadingCantons(true);
    setError(null);

    try {
      const data = await locationService.getCantons(provinceId);
      setCantons(data);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error al cargar los cantones.';
      setError(message);
    } finally {
      setIsLoadingCantons(false);
    }
  }, [provinces]);

  // Selección de cantón (limpia distrito)
  const selectCanton = useCallback(async (cantonId: string | null) => {
    if (!selection.province || !cantonId) {
      setSelection((prev) => ({ ...prev, canton: null, district: null }));
      setDistricts([]);
      return;
    }

    const matchedCanton = cantons.find((c) => c.id === cantonId) ?? {
      id: cantonId,
      name: `Cantón ${cantonId}`,
    };

    setSelection((prev) => ({
      ...prev,
      canton: matchedCanton,
      district: null,
    }));
    setDistricts([]);
    setIsLoadingDistricts(true);
    setError(null);

    try {
      const data = await locationService.getDistricts(selection.province.id, cantonId);
      setDistricts(data);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error al cargar los distritos.';
      setError(message);
    } finally {
      setIsLoadingDistricts(false);
    }
  }, [selection.province, cantons]);

  // Selección de distrito
  const selectDistrict = useCallback((districtId: string | null) => {
    if (!districtId) {
      setSelection((prev) => ({ ...prev, district: null }));
      return;
    }

    const matchedDistrict = districts.find((d) => d.id === districtId) ?? {
      id: districtId,
      name: `Distrito ${districtId}`,
    };

    setSelection((prev) => ({
      ...prev,
      district: matchedDistrict,
    }));
  }, [districts]);

  // Limpiar selección territorial por completo
  const clearTerritory = useCallback(() => {
    setSelection({ province: null, canton: null, district: null });
    setCantons([]);
    setDistricts([]);
    setError(null);
  }, []);

  // Reintento manual ante fallas de red
  const retryProvinces = useCallback(async () => {
    locationService.clearCache();
    await loadProvinces();
  }, [loadProvinces]);

  const value: TerritoryContextValue = {
    selection,
    provinces,
    cantons,
    districts,
    isLoadingProvinces,
    isLoadingCantons,
    isLoadingDistricts,
    error,
    selectProvince,
    selectCanton,
    selectDistrict,
    clearTerritory,
    retryProvinces,
  };

  return <TerritoryContext.Provider value={value}>{children}</TerritoryContext.Provider>;
};

export const useTerritoryContext = (): TerritoryContextValue => {
  const context = useContext(TerritoryContext);
  if (!context) {
    throw new Error('useTerritoryContext debe utilizarse dentro de un TerritoryProvider.');
  }
  return context;
};
