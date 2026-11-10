import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import { publicDataService, PublicDataSourceError } from './publicDataService';

// Ítem 4.2: pruebas de FLU-03-CA04 para la descarga del dataset de Datos
// Públicos (public/meic-pymes/meic-pymes.json). La red se simula con un
// `fetch` falso y `window` usa los temporizadores de Node.
// Criterios: docs/requisitos/flujos-criticos.md.

type FetchFn = (url: string, init?: RequestInit) => Promise<Response>;

const DATASET_VALIDO = {
  meta: { conteos: { empresasUsadas: 0 } },
  empresas: [],
  provincias: [],
  cantones: [],
  distritos: [],
  sectoresNacional: [],
  ciiuCatalogo: {},
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

let fetchMock: Mock<FetchFn>;

beforeEach(() => {
  publicDataService.clearCache();
  vi.stubGlobal('window', { setTimeout: globalThis.setTimeout, clearTimeout: globalThis.clearTimeout });
  fetchMock = vi.fn<FetchFn>(async () => json(DATASET_VALIDO));
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

async function motivoDelError(): Promise<string> {
  try {
    await publicDataService.getDataset();
  } catch (error) {
    if (error instanceof PublicDataSourceError) return error.reason;
    throw error;
  }
  throw new Error('Se esperaba un error');
}

describe('FLU-03 — descarga del dataset de Datos Públicos', () => {
  it('FLU-03-CA01: descarga el dataset publicado y luego lo reutiliza sin volver a la red', async () => {
    const primero = await publicDataService.getDataset();
    const segundo = await publicDataService.getDataset();

    expect(primero).toEqual(DATASET_VALIDO);
    expect(segundo).toBe(primero);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(String(fetchMock.mock.calls[0][0])).toMatch(/meic-pymes\.json$/);
  });

  it('FLU-03-CA04: si el dataset no existe (404) el error indica "no publicado"', async () => {
    fetchMock.mockResolvedValueOnce(new Response('', { status: 404 }));

    expect(await motivoDelError()).toBe('no_publicado');
  });

  it('FLU-03-CA04: si el servidor responde con otro error HTTP el motivo es "red"', async () => {
    fetchMock.mockResolvedValueOnce(new Response('', { status: 500 }));

    expect(await motivoDelError()).toBe('red');
  });

  it('FLU-03-CA04: si la red falla el motivo es "red"', async () => {
    fetchMock.mockRejectedValueOnce(new TypeError('Failed to fetch'));

    expect(await motivoDelError()).toBe('red');
  });

  it.each(['empresas', 'provincias', 'cantones', 'distritos', 'sectoresNacional', 'ciiuCatalogo'])(
    'FLU-03-CA04: si al dataset le falta "%s" el motivo es "formato"',
    async (seccion) => {
      const incompleto: Record<string, unknown> = { ...DATASET_VALIDO };
      delete incompleto[seccion];
      fetchMock.mockResolvedValueOnce(json(incompleto));

      expect(await motivoDelError()).toBe('formato');
    }
  );

  it('FLU-03-CA04: un dataset inválido no queda en caché; el reintento vuelve a descargar', async () => {
    fetchMock.mockResolvedValueOnce(json({ meta: {} }));

    expect(await motivoDelError()).toBe('formato');
    await expect(publicDataService.getDataset()).resolves.toEqual(DATASET_VALIDO);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
