import type { TerritoryItem, TerritoryApiResponse } from '../types/territory.types';

const BASE_URL = 'https://ubicaciones.paginasweb.cr';

/**
 * Caché en memoria para evitar consultas redundantes y mejorar el rendimiento.
 */
const cache = {
  provinces: null as TerritoryItem[] | null,
  cantonsByProvince: new Map<string, TerritoryItem[]>(),
  districtsByCanton: new Map<string, TerritoryItem[]>(),
};

/**
 * Valida y transforma la respuesta del API en una lista ordenada de TerritoryItem.
 */
function parseTerritoryResponse(data: unknown): TerritoryItem[] {
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    throw new Error('Formato de respuesta territorial inválido.');
  }

  const record = data as TerritoryApiResponse;
  const items: TerritoryItem[] = [];

  for (const [key, value] of Object.entries(record)) {
    if (typeof value === 'string' && value.trim().length > 0) {
      items.push({
        id: String(key).trim(),
        name: value.trim(),
      });
    }
  }

  // Ordenar numéricamente por ID para mantener el orden oficial (1 a 7 en provincias, etc.)
  return items.sort((a, b) => Number(a.id) - Number(b.id));
}

/**
 * Ejecuta una petición fetch con timeout y control de errores.
 */
async function fetchWithTimeout(url: string, timeoutMs = 8000): Promise<unknown> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Error en servidor territorial (${response.status}: ${response.statusText})`);
    }

    const json = await response.json();
    return json;
  } catch (error: unknown) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new Error('La consulta territorial excedió el tiempo límite de espera.');
    }
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Ocurrió un error inesperado al consultar la API territorial.');
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Servicio territorial para Costa Rica
 */
export const locationService = {
  /**
   * Obtiene la lista oficial de provincias de Costa Rica.
   */
  async getProvinces(): Promise<TerritoryItem[]> {
    if (cache.provinces) {
      return cache.provinces;
    }

    const url = `${BASE_URL}/provincias.json`;
    const data = await fetchWithTimeout(url);
    const parsed = parseTerritoryResponse(data);
    cache.provinces = parsed;
    return parsed;
  },

  /**
   * Obtiene los cantones correspondientes a una provincia dada.
   */
  async getCantons(provinceId: string): Promise<TerritoryItem[]> {
    const sanitizedId = encodeURIComponent(provinceId.trim());
    if (cache.cantonsByProvince.has(sanitizedId)) {
      return cache.cantonsByProvince.get(sanitizedId)!;
    }

    const url = `${BASE_URL}/provincia/${sanitizedId}/cantones.json`;
    const data = await fetchWithTimeout(url);
    const parsed = parseTerritoryResponse(data);
    cache.cantonsByProvince.set(sanitizedId, parsed);
    return parsed;
  },

  /**
   * Obtiene los distritos correspondientes a una provincia y cantón dados.
   */
  async getDistricts(provinceId: string, cantonId: string): Promise<TerritoryItem[]> {
    const sanitizedProvinceId = encodeURIComponent(provinceId.trim());
    const sanitizedCantonId = encodeURIComponent(cantonId.trim());
    const cacheKey = `${sanitizedProvinceId}:${sanitizedCantonId}`;

    if (cache.districtsByCanton.has(cacheKey)) {
      return cache.districtsByCanton.get(cacheKey)!;
    }

    const url = `${BASE_URL}/provincia/${sanitizedProvinceId}/canton/${sanitizedCantonId}/distritos.json`;
    const data = await fetchWithTimeout(url);
    const parsed = parseTerritoryResponse(data);
    cache.districtsByCanton.set(cacheKey, parsed);
    return parsed;
  },

  /**
   * Limpia la caché en caso de requerir recarga forzada.
   */
  clearCache(): void {
    cache.provinces = null;
    cache.cantonsByProvince.clear();
    cache.districtsByCanton.clear();
  },
};
