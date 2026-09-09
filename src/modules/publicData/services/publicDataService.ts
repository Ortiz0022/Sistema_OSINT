import { MEIC_PYMES_SOURCE } from '../constants/meicSource';
import type { PublicDataset } from '../types/publicData.types';

/**
 * Cliente del dataset normalizado del padrón de Pymes del MEIC.
 *
 * El portal CKAN del Portal Nacional de Datos Abiertos no habilita CORS para
 * la descarga directa del recurso XLSX desde el navegador, y parsear un XLSX
 * de ~2 MB en el cliente en cada visita sería lento e innecesario. Por eso la
 * descarga y el parseo los hace el ETL del módulo
 * (`src/modules/publicData/etl/fetchMeicPymes.mjs`, corrido de antemano) y la
 * aplicación consume aquí el resultado normalizado por HTTP, con timeout y
 * caché en memoria — el mismo patrón que usa `procurementService`.
 */

const REQUEST_TIMEOUT_MS = 15_000;

export type PublicDataErrorReason = 'red' | 'no_publicado' | 'formato';

export class PublicDataSourceError extends Error {
  readonly reason: PublicDataErrorReason;

  constructor(message: string, reason: PublicDataErrorReason) {
    super(message);
    this.name = 'PublicDataSourceError';
    this.reason = reason;
  }
}

let cachedDataset: PublicDataset | null = null;
let inFlight: Promise<PublicDataset> | null = null;

/** Resuelve la ruta del dataset respetando la base pública de Vite. */
function datasetUrl(): string {
  const base = import.meta.env.BASE_URL || '/';
  return `${base.endsWith('/') ? base : `${base}/`}${MEIC_PYMES_SOURCE.datasetUrl}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

/**
 * Valida que la respuesta tenga la forma esperada antes de exponerla a la UI,
 * para que un archivo truncado o de otra versión falle de forma explícita.
 */
function assertDataset(payload: unknown): PublicDataset {
  if (!isRecord(payload) || !isRecord(payload.meta)) {
    throw new PublicDataSourceError(
      'El archivo de datos de Pymes del MEIC no tiene el contenido esperado.',
      'formato'
    );
  }

  const requiredCollections = ['empresas', 'provincias', 'cantones', 'distritos', 'sectoresNacional'] as const;
  for (const key of requiredCollections) {
    if (!Array.isArray(payload[key])) {
      throw new PublicDataSourceError(
        `Al archivo de datos de Pymes le falta la sección "${key}".`,
        'formato'
      );
    }
  }
  if (!isRecord(payload.ciiuCatalogo)) {
    throw new PublicDataSourceError('Al archivo de datos de Pymes le falta el catálogo de actividades CIIU.', 'formato');
  }

  return payload as unknown as PublicDataset;
}

async function requestDataset(): Promise<PublicDataset> {
  const url = datasetUrl();
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(url, { signal: controller.signal, headers: { Accept: 'application/json' } });

    if (response.status === 404) {
      throw new PublicDataSourceError(
        'Todavía no se ha generado el archivo con los datos de Pymes del MEIC.',
        'no_publicado'
      );
    }
    if (!response.ok) {
      throw new PublicDataSourceError(`El servidor respondió con un error (código ${response.status}).`, 'red');
    }

    return assertDataset(await response.json());
  } catch (error) {
    if (error instanceof PublicDataSourceError) throw error;
    throw new PublicDataSourceError(
      'No se pudo cargar el archivo con los datos de Pymes del MEIC. Revisá tu conexión e intentá de nuevo.',
      'red'
    );
  } finally {
    window.clearTimeout(timeout);
  }
}

export const publicDataService = {
  /**
   * Devuelve el dataset de Pymes del MEIC. La primera llamada lo descarga; las
   * siguientes reutilizan la copia en memoria para no repetir la petición al
   * navegar entre módulos.
   */
  async getDataset(options: { force?: boolean } = {}): Promise<PublicDataset> {
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

export default publicDataService;
