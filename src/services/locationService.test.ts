import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { locationService } from './locationService';

// Ítem 4.2: pruebas de FLU-03 para el servicio territorial, que consulta la
// API de la DTA (ubicaciones.paginasweb.cr) desde el navegador.
// La red se simula con un `fetch` falso. Criterios: docs/requisitos/flujos-criticos.md.

type FetchMock = ReturnType<typeof vi.fn>;

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

let fetchMock: FetchMock;

beforeEach(() => {
  locationService.clearCache();
  fetchMock = vi.fn(async () => json({ 7: 'Limón', 1: 'San José', 2: 'Alajuela' }));
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('FLU-03 — servicio territorial (DTA)', () => {
  describe('éxito', () => {
    it('FLU-03-CA01: devuelve las provincias en el orden oficial (por ID numérico)', async () => {
      const provincias = await locationService.getProvinces();

      expect(provincias).toEqual([
        { id: '1', name: 'San José' },
        { id: '2', name: 'Alajuela' },
        { id: '7', name: 'Limón' },
      ]);
      expect(fetchMock).toHaveBeenCalledWith('https://ubicaciones.paginasweb.cr/provincias.json', expect.anything());
    });

    it('FLU-03-CA01: consulta los distritos con la provincia y el cantón elegidos', async () => {
      fetchMock.mockResolvedValueOnce(json({ 1: 'Carmen', 2: 'Merced' }));

      const distritos = await locationService.getDistricts('1', '1');

      expect(distritos.map((d) => d.name)).toEqual(['Carmen', 'Merced']);
      expect(fetchMock.mock.calls[0][0]).toBe('https://ubicaciones.paginasweb.cr/provincia/1/canton/1/distritos.json');
    });

    it('FLU-03-CA01: una segunda consulta igual usa la caché y no vuelve a la red', async () => {
      await locationService.getProvinces();
      await locationService.getProvinces();

      expect(fetchMock).toHaveBeenCalledTimes(1);
    });
  });

  describe('errores', () => {
    it('FLU-03-CA03: si la DTA responde con error HTTP, falla con un mensaje claro', async () => {
      fetchMock.mockResolvedValueOnce(new Response('caída', { status: 503, statusText: 'Service Unavailable' }));

      await expect(locationService.getProvinces()).rejects.toThrow('Error en servidor territorial (503');
    });

    it('FLU-03-CA03: si la DTA no responde en 8 segundos, la consulta se cancela con un mensaje claro', async () => {
      vi.useFakeTimers();
      fetchMock.mockImplementationOnce(
        (_url: string, init: RequestInit) =>
          new Promise((_resolve, reject) => {
            init.signal?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')));
          })
      );

      const consulta = expect(locationService.getProvinces()).rejects.toThrow('excedió el tiempo límite');
      await vi.advanceTimersByTimeAsync(8000);

      await consulta;
    });

    it('FLU-03-CA03: un fallo no queda en caché; el reintento vuelve a consultar', async () => {
      fetchMock.mockResolvedValueOnce(new Response('caída', { status: 500 }));

      await expect(locationService.getProvinces()).rejects.toThrow();
      const provincias = await locationService.getProvinces();

      expect(provincias).toHaveLength(3);
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });
  });

  describe('uso indebido', () => {
    it.each([
      ['un arreglo', ['San José', 'Alajuela']],
      ['null', null],
      ['un texto', 'San José'],
    ])('FLU-03-CA07: rechaza una respuesta con estructura inválida (%s)', async (_caso, respuesta) => {
      fetchMock.mockResolvedValueOnce(json(respuesta));

      await expect(locationService.getProvinces()).rejects.toThrow('Formato de respuesta territorial inválido.');
    });

    it('FLU-03-CA07: descarta valores que no son texto o están vacíos', async () => {
      fetchMock.mockResolvedValueOnce(json({ 1: 'San José', 2: 42, 3: { html: '<b>x</b>' }, 4: '   ', 5: null }));

      const provincias = await locationService.getProvinces();

      expect(provincias).toEqual([{ id: '1', name: 'San José' }]);
    });

    // Cobertura parcial de CA07: aquí solo se prueba que el servicio no altera ni
    // interpreta el nombre. Que la pantalla lo muestre como texto depende del
    // escape de React y no se prueba (no hay DOM en las pruebas).
    it('FLU-03-CA07 (parcial): el servicio entrega un nombre con HTML como texto, sin modificarlo', async () => {
      const malicioso = '<img src=x onerror=alert(1)>';
      fetchMock.mockResolvedValueOnce(json({ 1: malicioso }));

      const [provincia] = await locationService.getProvinces();

      expect(provincia.name).toBe(malicioso);
      expect(typeof provincia.name).toBe('string');
    });

    // Control adicional sin criterio propio en el 1.1: protege la petición
    // SALIENTE hacia la DTA (OBS-03-2). FLU-03-CA07 habla de las respuestas.
    it('OBS-03-2 (control adicional): los IDs se codifican en la URL, así que no permiten recorrer rutas de la API', async () => {
      fetchMock.mockResolvedValueOnce(json({ 1: 'Central' }));

      await locationService.getCantons('1/../../otra-ruta?x=1');

      const url = String(fetchMock.mock.calls[0][0]);
      expect(url).toBe('https://ubicaciones.paginasweb.cr/provincia/1%2F..%2F..%2Fotra-ruta%3Fx%3D1/cantones.json');
    });
  });
});
