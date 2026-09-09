/**
 * Lector mínimo de la primera hoja de un archivo XLSX (Office Open XML).
 *
 * El Portal Nacional de Datos Abiertos publica este dataset únicamente en
 * XLSX (no en CSV/JSON), así que hace falta leer el formato nosotros mismos.
 * Un .xlsx es un ZIP con XML adentro; en vez de sumar una dependencia npm solo
 * para esto, se lee con `node:zlib` (los ZIP de Office no usan compresión
 * exótica) y un parseo con expresiones regulares de la estructura de celdas,
 * que es simple y estable para este archivo (sin fórmulas, sin celdas
 * combinadas, sin "inline strings").
 *
 * No es un lector de XLSX de propósito general: solo cubre lo que este
 * dataset usa (celdas de texto vía `sharedStrings.xml` y celdas numéricas).
 */
import { inflateRawSync } from 'node:zlib';

/** Extrae el contenido de un miembro del ZIP por nombre exacto. */
function readZipMember(buffer, memberName) {
  const nameBytes = Buffer.from(memberName, 'utf8');
  let offset = 0;

  while (offset < buffer.length - 4) {
    // Firma de encabezado local de un miembro ZIP: "PK\x03\x04".
    if (buffer.readUInt32LE(offset) !== 0x04034b50) {
      offset += 1;
      continue;
    }

    const compressionMethod = buffer.readUInt16LE(offset + 8);
    const compressedSize = buffer.readUInt32LE(offset + 18);
    const nameLength = buffer.readUInt16LE(offset + 26);
    const extraLength = buffer.readUInt16LE(offset + 28);
    const nameStart = offset + 30;
    const dataStart = nameStart + nameLength + extraLength;

    const currentName = buffer.subarray(nameStart, nameStart + nameLength);
    if (currentName.equals(nameBytes)) {
      const raw = buffer.subarray(dataStart, dataStart + compressedSize);
      if (compressionMethod === 0) return raw; // sin comprimir
      if (compressionMethod === 8) return inflateRawSync(raw); // DEFLATE
      throw new Error(`Método de compresión ZIP no soportado (${compressionMethod}) para ${memberName}`);
    }

    offset = dataStart + compressedSize;
  }

  throw new Error(`No se encontró "${memberName}" dentro del XLSX`);
}

/** Decodifica las entidades XML mínimas que aparecen en este archivo. */
function decodeXmlEntities(text) {
  return text
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&');
}

/** Une el/los `<t>` de un `<si>` de `sharedStrings.xml` (puede tener varios "runs" con formato). */
function parseSharedStrings(xml) {
  const blocks = xml.match(/<si>[\s\S]*?<\/si>/g) || [];
  return blocks.map((block) => {
    const texts = [...block.matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map((match) => match[1]);
    return decodeXmlEntities(texts.join(''));
  });
}

const CELL_RE = /<c r="([A-Z]+)\d+"([^>]*)>(?:<v>([\s\S]*?)<\/v>)?<\/c>/g;
const ROW_RE = /<row r="(\d+)"[^>]*>([\s\S]*?)<\/row>/g;

/**
 * Lee la primera hoja de un XLSX y la devuelve como filas de objetos
 * `{ columna: valor }`, usando la fila 1 como encabezado.
 *
 * @param {Buffer} xlsxBuffer
 * @returns {{ headers: Record<string,string>, rows: Record<string,string>[] }}
 */
export function readFirstSheet(xlsxBuffer) {
  const sharedStringsXml = readZipMember(xlsxBuffer, 'xl/sharedStrings.xml').toString('utf8');
  const sheetXml = readZipMember(xlsxBuffer, 'xl/worksheets/sheet1.xml').toString('utf8');
  const sharedStrings = parseSharedStrings(sharedStringsXml);

  const cellValue = (attrs, rawValue) => {
    if (rawValue === undefined) return '';
    if (/t="s"/.test(attrs)) return sharedStrings[parseInt(rawValue, 10)] ?? '';
    return decodeXmlEntities(rawValue);
  };

  let headerByCol = null;
  const rows = [];
  let rowMatch;

  while ((rowMatch = ROW_RE.exec(sheetXml)) !== null) {
    const rowNumber = parseInt(rowMatch[1], 10);
    const rowXml = rowMatch[2];
    const byColLetter = {};
    let hasContent = false;
    let cellMatch;
    CELL_RE.lastIndex = 0;
    while ((cellMatch = CELL_RE.exec(rowXml)) !== null) {
      const value = cellValue(cellMatch[2], cellMatch[3]);
      byColLetter[cellMatch[1]] = value;
      if (value !== '') hasContent = true;
    }

    if (rowNumber === 1) {
      headerByCol = byColLetter;
      continue;
    }
    // El archivo real trae miles de filas de plantilla completamente vacías al
    // final (más allá de la última fila con datos); se descartan aquí en vez
    // de contarlas como registros.
    if (!hasContent) continue;

    const row = {};
    for (const [col, header] of Object.entries(headerByCol ?? {})) {
      row[header] = byColLetter[col] ?? '';
    }
    rows.push(row);
  }

  return { headers: headerByCol ?? {}, rows };
}
