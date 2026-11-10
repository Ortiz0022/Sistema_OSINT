import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from 'vitest';

// Ítem 4.2: pruebas unitarias de FLU-01 (consulta de estadísticas de seguridad
// a través del proxy OIJ). Los criterios están en docs/requisitos/flujos-criticos.md.
// El nombre `.criterios.test.ts` lo distingue de oijService.test.ts, que es la
// prueba del ítem 4.8 (Integrante 4).
//
// La red se simula con un `fetch` falso: las pruebas no salen a internet.
// Cada prueba recarga el módulo para empezar con la caché vacía.
//
// Convención: una prueba marcada con `it.fails` describe el comportamiento
// EXIGIDO por un criterio que el código todavía no cumple. Se enlaza al Issue
// del hallazgo (HP-xx). Cuando se corrija el código, la prueba empezará a
// "fallar" y habrá que quitarle el `.fails`. La expectativa NO se cambia para
// que coincida con el código.

type FetchFn = (url: string, init?: RequestInit) => Promise<Response>;
type FetchMock = Mock<FetchFn>;

const CATEGORIAS = [
  { TC_Delito: 'ASALTO', TN_Cantidad: '10' },
  { TC_Delito: 'HURTO', TN_Cantidad: '25' },
  { TC_Delito: 'ASALTO', TN_Cantidad: '5' },
];

const TEMPORALES = [
  { TN_Mes: '1', TN_Cantidad: '7' },
  { TN_Mes: '12', TN_Cantidad: '3' },
  { TN_Mes: '13', TN_Cantidad: '99' }, // mes fuera de rango: se ignora
];

const CSV_OIJ = [
  'Delito,SubDelito,Fecha,Hora,Victima,SubVictima,Edad,Sexo,Nacionalidad,Provincia,Canton,Distrito',
  'ASALTO,ARMA BLANCA,2025-01-02,00:00,PERSONA,PEATON,Mayor de edad,MUJER,Nicaragua,SAN JOSE,CENTRAL,CARMEN',
  'ASALTO,ARMA BLANCA,2025-02-02,00:00,PERSONA,PEATON,Menor de edad,HOMBRE,Costa Rica,SAN JOSE,CENTRAL,CARMEN',
  'ASALTO,ARMA DE FUEGO,2025-03-02,00:00,PERSONA,PEATON,Mayor de edad,HOMBRE,Costa Rica,SAN JOSE,CENTRAL,HOSPITAL',
  'HURTO,CARTERISMO,2025-03-05,00:00,PERSONA,PEATON,Mayor de edad,MUJER,Panama,SAN JOSE,CENTRAL,HOSPITAL',
].join('\n');

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

/** Simula al OIJ respondiendo según el endpoint llamado. */
function oijSano(): FetchMock {
  return vi.fn<FetchFn>(async (url: string) => {
    if (url.endsWith('/obtenerCategorias')) return json(CATEGORIAS);
    if (url.endsWith('/obtenerTemporales')) return json(TEMPORALES);
    if (url.endsWith('/obtenerDatosDescargas')) return new Response(CSV_OIJ, { status: 200 });
    return new Response('no encontrado', { status: 404 });
  });
}

async function cargarServicio() {
  vi.resetModules();
  return import('./oijService.js');
}

/** Devuelve el pJson enviado al OIJ en la primera llamada a obtenerCategorias. */
function payloadEnviado(fetchMock: FetchMock): Record<string, unknown> {
  const llamada = fetchMock.mock.calls.find(([url]) => String(url).endsWith('/obtenerCategorias'));
  if (!llamada) throw new Error('No se llamó a obtenerCategorias');
  const body = (llamada[1] as RequestInit).body as URLSearchParams;
  return JSON.parse(body.get('pJson') ?? '{}');
}

let fetchMock: FetchMock;

beforeEach(() => {
  fetchMock = oijSano();
  vi.stubGlobal('fetch', fetchMock);
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('FLU-01 — servicio de estadísticas OIJ', () => {
  describe('éxito', () => {
    it('FLU-01-CA01: calcula totales, delito más frecuente y serie mensual a partir del OIJ', async () => {
      const { getSecurityStats } = await cargarServicio();

      const stats = await getSecurityStats({ year: '2024', provinceId: '1', cantonId: '1' });

      expect(stats.summary).toEqual({ totalIncidents: 40, mostFrequentCrime: 'HURTO', uniqueCrimeTypes: 2 });
      expect(stats.chartCrimeTypes).toEqual([
        { name: 'HURTO', value: 25 },
        { name: 'ASALTO', value: 15 },
      ]);
      expect(stats.chartMonthly).toHaveLength(12);
      expect(stats.chartMonthly[0]).toEqual({ name: 'Ene', total: 7 });
      expect(stats.chartMonthly[11]).toEqual({ name: 'Dic', total: 3 });
      expect(stats.availableCrimeTypes).toContain('HOMICIDIO');
    });

    it('FLU-01-CA01: arma el código territorial del OIJ con provincia, cantón y distrito', async () => {
      const { getSecurityStats } = await cargarServicio();

      await getSecurityStats({ year: '2024', provinceId: '1', cantonId: '1', districtId: '8' });

      const payload = payloadEnviado(fetchMock);
      expect(payload).toMatchObject({
        TC_Provincias: '1',
        TC_Cantones: '101',
        TC_Distritos: '10108',
        TN_FechaInicio: 20240101,
        TN_FechaFinal: 20241231,
      });
    });

    it('FLU-01-CA02: una consulta repetida se responde desde la caché sin volver a llamar al OIJ', async () => {
      const { getSecurityStats } = await cargarServicio();
      const params = { year: '2024', provinceId: '2' };

      const primera = await getSecurityStats(params);
      const llamadas = fetchMock.mock.calls.length;
      const segunda = await getSecurityStats({ ...params });

      expect(llamadas).toBe(2); // categorías + temporales
      expect(fetchMock).toHaveBeenCalledTimes(2);
      expect(segunda).toEqual(primera);
    });

    it('FLU-01-CA02 (límite): una consulta con parámetros distintos no reutiliza la caché', async () => {
      const { getSecurityStats } = await cargarServicio();

      await getSecurityStats({ year: '2024', provinceId: '2' });
      await getSecurityStats({ year: '2024', provinceId: '3' });

      expect(fetchMock).toHaveBeenCalledTimes(4);
    });

    it('FLU-01-CA03: agrega el detalle por delito y subdelito, ordenado de mayor a menor', async () => {
      const { getSecurityDetails } = await cargarServicio();

      const detalle = await getSecurityDetails({ year: '2025' });

      expect(detalle.tableData).toEqual([
        { delito: 'ASALTO', subdelito: 'ARMA BLANCA', count: 2 },
        { delito: 'ASALTO', subdelito: 'ARMA DE FUEGO', count: 1 },
        { delito: 'HURTO', subdelito: 'CARTERISMO', count: 1 },
      ]);
    });

    it('FLU-01-CA03: al filtrar por tipo de delito solo cuenta ese delito', async () => {
      const { getSecurityDetails } = await cargarServicio();

      const detalle = await getSecurityDetails({ year: '2025', crimeType: 'HURTO' });

      expect(detalle.tableData).toEqual([{ delito: 'HURTO', subdelito: 'CARTERISMO', count: 1 }]);
    });
  });

  describe('errores', () => {
    it('FLU-01-CA06: si el OIJ responde 5xx reintenta 3 veces por endpoint y luego falla', async () => {
      fetchMock = vi.fn<FetchFn>(async () => new Response('Servicio no disponible', { status: 503 }));
      vi.stubGlobal('fetch', fetchMock);
      const { getSecurityStats } = await cargarServicio();

      await expect(getSecurityStats({ year: '2024' })).rejects.toThrow();
      expect(fetchMock).toHaveBeenCalledTimes(6); // 2 endpoints × 3 intentos
    });

    it('FLU-01-CA06: un fallo del OIJ no queda guardado en la caché', async () => {
      fetchMock = vi.fn<FetchFn>(async () => new Response('Servicio no disponible', { status: 503 }));
      vi.stubGlobal('fetch', fetchMock);
      const { getSecurityDetails } = await cargarServicio();

      await expect(getSecurityDetails({ year: '2024' })).rejects.toThrow('Error OIJ CSV: 503');
      const llamadasTrasFallo = fetchMock.mock.calls.length;

      vi.stubGlobal('fetch', oijSano());
      const detalle = await getSecurityDetails({ year: '2024' });

      expect(llamadasTrasFallo).toBe(3);
      expect(detalle.tableData.length).toBeGreaterThan(0);
    });

    it('FLU-01-CA06: un error de red se reintenta y, si se recupera, la consulta funciona', async () => {
      let intentos = 0;
      const sano = oijSano();
      fetchMock = vi.fn<FetchFn>(async (url: string, init?: RequestInit) => {
        intentos += 1;
        if (intentos === 1) throw Object.assign(new Error('fetch failed'), { code: 'ECONNRESET' });
        return sano(url, init);
      });
      vi.stubGlobal('fetch', fetchMock);
      const { getSecurityDetails } = await cargarServicio();

      const detalle = await getSecurityDetails({ year: '2025' });

      expect(detalle.tableData).toHaveLength(3);
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    // FLU-01-CA07 (HP-03, Issue #5) no se prueba aquí: lo cubren la prueba y la
    // corrección del ítem 4.8 (Integrante 4, PR #29) en
    // server/services/oijService.test.ts. Se acordó así para no duplicar trabajo.
  });

  describe('uso indebido', () => {
    it('FLU-01-CA11: el detalle no expone edad, sexo, nacionalidad, fecha ni ningún dato de una víctima', async () => {
      const { getSecurityDetails } = await cargarServicio();

      const detalle = await getSecurityDetails({ year: '2025' });
      const texto = JSON.stringify(detalle);

      for (const fila of detalle.tableData) {
        expect(Object.keys(fila).sort()).toEqual(['count', 'delito', 'subdelito']);
      }
      for (const dato of ['MUJER', 'HOMBRE', 'Nicaragua', 'Panama', 'Mayor de edad', 'Menor de edad', '2025-01-02', 'PEATON']) {
        expect(texto).not.toContain(dato);
      }
    });

    it.fails('FLU-01-CA05 [HP-01, Issue #3]: rechaza un año que no tiene 4 dígitos sin consultar al OIJ', async () => {
      const { getSecurityStats } = await cargarServicio();

      await expect(getSecurityStats({ year: 'abcd' })).rejects.toThrow();
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it.fails('FLU-01-CA08 [HP-04, Issue #6]: rechaza IDs territoriales no numéricos sin enviarlos al OIJ', async () => {
      const { getSecurityStats } = await cargarServicio();

      await expect(getSecurityStats({ year: '2024', provinceId: '1,2,3', cantonId: 'x' })).rejects.toThrow();
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it.fails('FLU-01-CA08 [HP-04, Issue #6]: rechaza un tipo de delito fuera de la lista en vez de consultar todos', async () => {
      const { getSecurityStats } = await cargarServicio();

      await expect(getSecurityStats({ year: '2024', crimeType: '<script>alert(1)</script>' })).rejects.toThrow();
      expect(fetchMock).not.toHaveBeenCalled();
    });
  });
});
