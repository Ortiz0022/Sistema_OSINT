/**
 * Lector de archivos ZIP remotos por rangos HTTP (sin dependencias externas).
 *
 * Los ZIP mensuales de SICOP pesan ~48 MB, pero el módulo territorial solo
 * necesita 3 de sus 25 CSV. En lugar de descargar el archivo completo se leen
 * únicamente los bytes necesarios usando peticiones `Range`:
 *
 *   1. EOCD (End Of Central Directory) -> últimos ~64 KB del blob.
 *   2. Directorio central -> offsets y tamaños comprimidos de cada miembro.
 *   3. Cabecera local + datos comprimidos de los miembros solicitados.
 *
 * Resultado medido: ~0.3 MB descargados por mes en lugar de 48.6 MB.
 */
import { inflateRawSync } from 'node:zlib';
import { fetchWithRetry } from './http.mjs';

const EOCD_SIGNATURE = 0x06054b50;
const CENTRAL_SIGNATURE = 0x02014b50;
const MAX_EOCD_TAIL = 66_000; // 22 bytes de EOCD + comentario máximo (64 KB)

export class SicopZipError extends Error {}

async function httpGetRange(url, start, end, stats) {
  const response = await fetchWithRetry(url, {
    headers: { Range: `bytes=${start}-${end}` },
    label: `${url} [${start}-${end}]`,
  });
  if (response.status !== 206 && response.status !== 200) {
    throw new SicopZipError(`Rango ${start}-${end} rechazado (HTTP ${response.status}) en ${url}`);
  }
  const buffer = Buffer.from(await response.arrayBuffer());
  stats.downloadedBytes += buffer.length;
  stats.requests += 1;
  return buffer;
}

async function httpContentLength(url) {
  const response = await fetchWithRetry(url, { method: 'HEAD', label: url });
  if (!response.ok) throw new SicopZipError(`No se pudo consultar ${url} (HTTP ${response.status})`);
  const length = Number(response.headers.get('content-length'));
  if (!Number.isFinite(length) || length <= 0) {
    throw new SicopZipError(`El servidor no reportó tamaño para ${url}`);
  }
  const acceptsRanges = (response.headers.get('accept-ranges') || '').toLowerCase();
  return { length, acceptsRanges };
}

function parseCentralDirectory(buffer, entryCount) {
  const entries = [];
  let offset = 0;
  for (let i = 0; i < entryCount; i += 1) {
    if (offset + 46 > buffer.length || buffer.readUInt32LE(offset) !== CENTRAL_SIGNATURE) {
      throw new SicopZipError('Directorio central del ZIP con formato inesperado');
    }
    const nameLength = buffer.readUInt16LE(offset + 28);
    entries.push({
      compressionMethod: buffer.readUInt16LE(offset + 10),
      compressedSize: buffer.readUInt32LE(offset + 20),
      uncompressedSize: buffer.readUInt32LE(offset + 24),
      localHeaderOffset: buffer.readUInt32LE(offset + 42),
      name: buffer.toString('utf8', offset + 46, offset + 46 + nameLength),
    });
    offset += 46 + nameLength + buffer.readUInt16LE(offset + 30) + buffer.readUInt16LE(offset + 32);
  }
  return entries;
}

/**
 * Descarga y descomprime solo los miembros solicitados de un ZIP remoto.
 * @param {string} url URL pública del ZIP.
 * @param {string[]} memberNames Nombres exactos de los archivos a extraer.
 * @returns {Promise<{ members: Record<string, string>, stats: object }>} Contenido UTF-8 por archivo.
 */
export async function readRemoteZipMembers(url, memberNames) {
  const stats = { downloadedBytes: 0, requests: 0, totalZipBytes: 0 };
  const { length, acceptsRanges } = await httpContentLength(url);
  stats.totalZipBytes = length;
  stats.acceptsRanges = acceptsRanges;

  const tailLength = Math.min(MAX_EOCD_TAIL, length);
  const tail = await httpGetRange(url, length - tailLength, length - 1, stats);

  let eocd = -1;
  for (let i = tail.length - 22; i >= 0; i -= 1) {
    if (tail.readUInt32LE(i) === EOCD_SIGNATURE) { eocd = i; break; }
  }
  if (eocd < 0) throw new SicopZipError(`No se encontró el índice (EOCD) del ZIP en ${url}`);

  const entryCount = tail.readUInt16LE(eocd + 10);
  const directorySize = tail.readUInt32LE(eocd + 12);
  const directoryOffset = tail.readUInt32LE(eocd + 16);
  if (directoryOffset === 0xffffffff) {
    throw new SicopZipError('El ZIP usa formato ZIP64, no soportado por este lector');
  }

  const directory = await httpGetRange(url, directoryOffset, directoryOffset + directorySize - 1, stats);
  const entries = parseCentralDirectory(directory, entryCount);

  const members = {};
  for (const memberName of memberNames) {
    const entry = entries.find((candidate) => candidate.name === memberName);
    if (!entry) throw new SicopZipError(`El ZIP no contiene "${memberName}"`);

    const localHeader = await httpGetRange(url, entry.localHeaderOffset, entry.localHeaderOffset + 29, stats);
    const dataOffset =
      entry.localHeaderOffset + 30 + localHeader.readUInt16LE(26) + localHeader.readUInt16LE(28);
    const compressed = await httpGetRange(url, dataOffset, dataOffset + entry.compressedSize - 1, stats);

    let raw;
    if (entry.compressionMethod === 0) raw = compressed;
    else if (entry.compressionMethod === 8) raw = inflateRawSync(compressed);
    else throw new SicopZipError(`Método de compresión ${entry.compressionMethod} no soportado`);

    members[memberName] = raw.toString('utf8');
  }

  return { members, stats, entries };
}
