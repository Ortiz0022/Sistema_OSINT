/**
 * Cliente HTTP del ETL con reintentos y backoff exponencial.
 *
 * Las fuentes públicas usadas por este módulo (contenedor de datos abiertos de
 * SICOP y API de la División Territorial) son estables pero no ofrecen ningún
 * acuerdo de servicio: en pruebas reales fallan de forma intermitente por
 * timeout de conexión. Sin reintentos, una corrida de 24 meses se cae a mitad
 * de camino y hay que empezar de nuevo.
 */

const DEFAULT_RETRIES = 6;
const DEFAULT_TIMEOUT_MS = 60_000;

const sleep = (ms) => new Promise((done) => setTimeout(done, ms));

/**
 * `fetch` con timeout, reintentos y backoff.
 * @param {string} url
 * @param {RequestInit & { retries?: number, timeoutMs?: number, label?: string }} options
 * @returns {Promise<Response>}
 */
export async function fetchWithRetry(url, options = {}) {
  const { retries = DEFAULT_RETRIES, timeoutMs = DEFAULT_TIMEOUT_MS, label, ...init } = options;
  let lastError = null;

  for (let attempt = 1; attempt <= retries; attempt += 1) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(url, { ...init, signal: controller.signal });
      // 5xx y 429 son transitorios: conviene reintentarlos.
      if (response.status >= 500 || response.status === 429) {
        throw new Error('HTTP ' + response.status);
      }
      return response;
    } catch (error) {
      lastError = error;
      if (attempt < retries) {
        const waitMs = Math.min(8000, 700 * 2 ** (attempt - 1));
        process.stderr.write(
          '   ! intento ' + attempt + '/' + retries + ' fallo para ' + (label || url) +
          ' (' + (error.cause?.code || error.message) + '), reintentando en ' + waitMs + ' ms\n'
        );
        await sleep(waitMs);
      }
    } finally {
      clearTimeout(timer);
    }
  }

  throw new Error(
    'No se pudo obtener ' + (label || url) + ' tras ' + retries + ' intentos: ' +
    (lastError?.cause?.code || lastError?.message || 'error desconocido')
  );
}

/** Igual que `fetchWithRetry` pero devolviendo JSON ya parseado. */
export async function fetchJsonWithRetry(url, options = {}) {
  const response = await fetchWithRetry(url, options);
  if (!response.ok) throw new Error(url + ' respondio HTTP ' + response.status);
  return response.json();
}
