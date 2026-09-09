import { useState, useEffect } from 'react';
import type { ElectoralDataResponse } from '../types';

export const useElectoralData = () => {
  const [data, setData] = useState<ElectoralDataResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let mounted = true;

    const fetchData = async () => {
      try {
        const response = await fetch('/data/tse-electoral-aggregates.json');
        if (!response.ok) {
          throw new Error('Error al cargar los datos electorales');
        }
        const result = (await response.json()) as ElectoralDataResponse;
        if (mounted) {
          setData(result);
          setLoading(false);
        }
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err : new Error('Unknown error'));
          setLoading(false);
        }
      }
    };

    void fetchData();

    return () => {
      mounted = false;
    };
  }, []);

  return { data, loading, error };
};
