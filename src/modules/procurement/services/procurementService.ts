import { SICOP_SOURCE } from '../constants/sicopSource';
import type { SicopDataset } from '../types/procurement.types';

/**
 * Cliente del dataset normalizado de SICOP.
 *
 * El módulo de datos abiertos de SICOP y el contenedor del Observatorio de
 * Compra Pública no habilitan CORS (`Access-Control-Allow-Origin` restringido a
 * sus propios dominios), por lo que el navegador no puede consultarlos de forma
 * directa. La descarga la realiza el ETL del módulo
 * (`src/modules/procurement/etl/fetchSicop.mjs`) y la aplicación consume aquí
 * el resultado normalizado por HTTP, con timeout, reintento y caché.
 */

const REQUEST_TIMEOUT_MS = 15_000;
const MAX_ATTEMPTS = 2;

export type ProcurementErrorReason = 'red' | 'no_publicado' | 'formato';

export class ProcurementSourceError extends Error {
  /** Origen del fallo, para que la UI muestre una acción distinta en cada caso. */
  readonly reason: ProcurementErrorReason;

  constructor(message: string, reason: ProcurementErrorReason) {
    super(message);
    this.name = 'ProcurementSourceError';
    this.reason = reason;
  }
}

let cachedDataset: SicopDataset | null = null;
let inFlight: Promise<SicopDataset> | null = null;

/** Resuelve la ruta del dataset respetando la base pública de Vite. */
function datasetUrl(): string {
  const base = import.meta.env.BASE_URL || '/';
  return `${base.endsWith('/') ? base : `${base}/`}${SICOP_SOURCE.datasetUrl}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

/**
 * Valida que la respuesta tenga la forma esperada antes de exponerla a la UI.
 * Un dataset truncado o de otra versión debe fallar de forma explícita y no
 * romper los componentes a mitad del render.
 */
function assertDataset(payload: unknown): SicopDataset {
  if (!isRecord(payload) || !isRecord(payload.meta)) {
    throw new ProcurementSourceError(
      'El archivo de datos de SICOP no tiene el contenido esperado.',
      'formato'
    );
  }

  const requiredCollections = [
    'provincias',
    'cantones',
    'distritos',
    'serieMensual',
    'flujos',
    'tiposProcedimiento',
    'instituciones',
    'proveedores',
  ] as const;

  for (const key of requiredCollections) {
    if (!Array.isArray(payload[key])) {
      throw new ProcurementSourceError(
        `Al archivo de datos de SICOP le falta la sección "${key}".`,
        'formato'
      );
    }
  }

  if (!Array.isArray((payload.meta as Record<string, unknown>).periodos)) {
    throw new ProcurementSourceError(
      'El archivo de datos de SICOP no dice qué meses incluye.',
      'formato'
    );
  }

  return payload as unknown as SicopDataset;
}

/**
 * Descarga el dataset con timeout propio y un reintento.
 *
 * A propósito no acepta un `AbortSignal` externo: la promesa se comparte entre
 * todos los consumidores (ver `getDataset`), así que si un componente que se
 * desmonta pudiera cancelarla, rompería la carga de los demás. En React con
 * `StrictMode` eso ocurre siempre, porque el efecto se monta, se limpia y se
 * vuelve a montar. Quien ya no necesite el resultado simplemente lo ignora.
 */
async function requestDataset(): Promise<SicopDataset> {
  const url = datasetUrl();
  let lastError: unknown = null;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const response = await fetch(url, { signal: controller.signal, headers: { Accept: 'application/json' } });

      if (response.status === 404) {
        throw new ProcurementSourceError(
          'Todavía no se ha generado el archivo con los datos de SICOP.',
          'no_publicado'
        );
      }
      if (!response.ok) {
        throw new ProcurementSourceError(
          `El servidor respondió con un error (código ${response.status}).`,
          'red'
        );
      }

      return assertDataset(await response.json());
    } catch (error) {
      lastError = error;
      // Los errores de contenido no mejoran reintentando.
      if (error instanceof ProcurementSourceError && error.reason !== 'red') throw error;
    } finally {
      window.clearTimeout(timeout);
    }
  }

  if (lastError instanceof ProcurementSourceError) throw lastError;
  throw new ProcurementSourceError(
    'No se pudo cargar el archivo con los datos de SICOP. Revisá tu conexión e intentá de nuevo.',
    'red'
  );
}

export const procurementService = {
  /**
   * Devuelve el dataset de SICOP. La primera llamada lo descarga; las
   * siguientes reutilizan la copia en memoria para no repetir la petición al
   * navegar entre módulos.
   */
  async getDataset(options: { force?: boolean } = {}): Promise<SicopDataset> {
    if (options.force) {
      cachedDataset = null;
      inFlight = null;
    }
    if (cachedDataset) return cachedDataset;
    if (inFlight) return inFlight;

    inFlight = requestDataset()
      .then((dataset) => {
        cachedDataset = dataset;
        return dataset;
      })
      .finally(() => {
        inFlight = null;
      });

    return inFlight;
  },

  /** Limpia la caché en memoria (usado por el botón de reintento). */
  clearCache(): void {
    cachedDataset = null;
    inFlight = null;
  },
};

export default procurementService;
