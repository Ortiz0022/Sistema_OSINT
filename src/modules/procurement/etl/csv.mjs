/**
 * Parser CSV mínimo para los reportes de SICOP.
 *
 * Particularidades reales de la fuente:
 *  - Separador `;` (no coma).
 *  - Campos entrecomillados con `"` que pueden contener `;` y saltos de línea.
 *  - Codificación UTF-8 con BOM ocasional.
 *  - Muchos textos usan espacio duro (U+00A0) como separador de palabras.
 */

const NBSP = /\u00a0/g;

/** Limpia BOM, espacios duros y espacios redundantes de un valor de celda. */
export function cleanCell(value) {
  if (typeof value !== 'string') return '';
  return value.replace(NBSP, ' ').replace(/\s+/g, ' ').trim();
}

/**
 * Convierte un CSV delimitado por `;` en un arreglo de objetos.
 * @param {string} text Contenido completo del archivo.
 * @returns {Array<Record<string, string>>}
 */
export function parseSemicolonCsv(text) {
  const source = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < source.length; i += 1) {
    const char = source[i];

    if (inQuotes) {
      if (char === '"') {
        if (source[i + 1] === '"') { field += '"'; i += 1; }
        else inQuotes = false;
      } else field += char;
      continue;
    }

    if (char === '"') { inQuotes = true; continue; }
    if (char === ';') { row.push(field); field = ''; continue; }
    if (char === '\r') continue;
    if (char === '\n') { row.push(field); rows.push(row); row = []; field = ''; continue; }
    field += char;
  }
  if (field.length > 0 || row.length > 0) { row.push(field); rows.push(row); }
  if (rows.length === 0) return [];

  const headers = rows[0].map((header) => cleanCell(header));
  const records = [];
  for (let i = 1; i < rows.length; i += 1) {
    if (rows[i].length === 1 && cleanCell(rows[i][0]) === '') continue;
    const record = {};
    for (let c = 0; c < headers.length; c += 1) record[headers[c]] = cleanCell(rows[i][c]);
    records.push(record);
  }
  return records;
}

/** Convierte un monto de SICOP (punto decimal, puede venir vacío) a número. */
export function parseAmount(value) {
  if (!value) return 0;
  const parsed = Number(String(value).replace(/,/g, ''));
  return Number.isFinite(parsed) ? parsed : 0;
}

/** Convierte una fecha `dd/mm/yyyy` o `yyyy-mm-dd ...` de SICOP a `yyyy-mm`. */
export function toYearMonth(value) {
  if (!value) return null;
  const slash = value.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
  if (slash) return `${slash[3]}-${slash[2]}`;
  const iso = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}`;
  return null;
}
