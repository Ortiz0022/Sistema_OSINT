import type { SecurityStats, SecurityDetails, SecurityFilterState } from '../types/security.types';

export const securityService = {
  async getStats(
    territory: { provinceId?: string; cantonId?: string; districtId?: string },
    filters: Partial<SecurityFilterState>,
    signal?: AbortSignal
  ): Promise<SecurityStats> {
    const params = new URLSearchParams();
    
    if (filters.year) params.append('year', filters.year);
    if (filters.crimeType) params.append('crimeType', filters.crimeType);
    
    if (territory.provinceId) params.append('provinceId', territory.provinceId);
    if (territory.cantonId) params.append('cantonId', territory.cantonId);
    if (territory.districtId) params.append('districtId', territory.districtId);

    const response = await fetch(`/api/security/stats?${params.toString()}`, { signal });
    
    if (!response.ok) {
      throw new Error(`Error fetching security stats: ${response.statusText}`);
    }
    
    return await response.json();
  },

  async getDetails(
    territory: { provinceId?: string; cantonId?: string; districtId?: string },
    filters: Partial<SecurityFilterState>,
    signal?: AbortSignal
  ): Promise<SecurityDetails> {
    const params = new URLSearchParams();
    
    if (filters.year) params.append('year', filters.year);
    if (filters.crimeType) params.append('crimeType', filters.crimeType);
    
    if (territory.provinceId) params.append('provinceId', territory.provinceId);
    if (territory.cantonId) params.append('cantonId', territory.cantonId);
    if (territory.districtId) params.append('districtId', territory.districtId);

    const response = await fetch(`/api/security/details?${params.toString()}`, { signal });
    
    if (!response.ok) {
      throw new Error(`Error fetching security details: ${response.statusText}`);
    }
    
    return await response.json();
  }
};
