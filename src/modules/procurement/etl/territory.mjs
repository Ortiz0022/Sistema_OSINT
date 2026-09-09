/**
 * Reconciliación de la geografía de SICOP contra la División Territorial
 * Administrativa (DTA) oficial que ya usa el selector global del observatorio
 * (https://ubicaciones.paginasweb.cr/).
 *
 * SICOP entrega la ubicación como un único texto libre: "San Antonio, Nicoya,
 * Guanacaste" (distrito, cantón, provincia). Para que el módulo pueda filtrarse
 * con el mismo `provinceId` / `cantonId` / `districtId` del resto de la
 * plataforma hay que resolver ese texto a los identificadores de la DTA.
 *
 * Diferencias reales encontradas entre ambas fuentes:
 *  - La DTA nombra "Central" al primer cantón de 6 provincias; SICOP usa el
 *    nombre de la ciudad cabecera ("San José", "Cartago", "Limón"...).
 *  - SICOP conserva nombres históricos: Aguirre (hoy Quepos), Valverde Vega
 *    (hoy Sarchí), Alfaro Ruiz (hoy Zarcero).
 *  - Cantones creados después de la DTA publicada por la API (Monteverde,
 *    Puerto Jiménez) no tienen equivalencia y se marcan como no conciliados.
 */

import { fetchJsonWithRetry } from './http.mjs';

const DTA_BASE_URL = 'https://ubicaciones.paginasweb.cr';

/** Normaliza un topónimo: minúsculas, sin tildes, sin puntuación ni dobles espacios. */
export function normalizePlace(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9ñ ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Cantones cabecera que la DTA publica como "Central". */
const HEADER_CANTON_ALIASES = {
  'san jose': 'central',
  alajuela: 'central',
  cartago: 'central',
  heredia: 'central',
  puntarenas: 'central',
  limon: 'central',
};

/** Cantones renombrados oficialmente después de los registros de SICOP. */
const RENAMED_CANTONS = {
  aguirre: 'quepos',
  'valverde vega': 'sarchi',
  'alfaro ruiz': 'zarcero',
  'leon cortes': 'leon cortes castro',
  'vazquez de coronado': 'vazquez de coronado',
};

/**
 * Descarga el árbol completo provincia -> cantón -> distrito de la DTA
 * y construye los índices de búsqueda por nombre normalizado.
 */
export async function loadTerritoryIndex({ withDistricts = true } = {}) {
  const provinces = await fetchJsonWithRetry(`${DTA_BASE_URL}/provincias.json`);
  const index = {
    provinces: new Map(), // nombre normalizado -> { id, name }
    cantons: new Map(),   // "provId|cantonNormalizado" -> { id, name }
    districts: new Map(), // "provId|cantonId|distritoNormalizado" -> { id, name }
    provinceNameById: new Map(),
  };

  for (const [provinceId, provinceName] of Object.entries(provinces)) {
    index.provinces.set(normalizePlace(provinceName), { id: provinceId, name: provinceName });
    index.provinceNameById.set(provinceId, provinceName);

    const cantons = await fetchJsonWithRetry(`${DTA_BASE_URL}/provincia/${provinceId}/cantones.json`);
    for (const [cantonId, cantonName] of Object.entries(cantons)) {
      index.cantons.set(`${provinceId}|${normalizePlace(cantonName)}`, { id: cantonId, name: cantonName });

      if (!withDistricts) continue;
      const districts = await fetchJsonWithRetry(
        `${DTA_BASE_URL}/provincia/${provinceId}/canton/${cantonId}/distritos.json`
      );
      for (const [districtId, districtName] of Object.entries(districts)) {
        index.districts.set(
          `${provinceId}|${cantonId}|${normalizePlace(districtName)}`,
          { id: districtId, name: districtName }
        );
      }
    }
  }
  return index;
}

/**
 * Resuelve el campo de zona geográfica de SICOP ("distrito, cantón, provincia")
 * contra la DTA.
 * @returns {{provinciaId,provincia,cantonId,canton,distritoId,distrito,conciliado}|null}
 */
export function resolveZone(rawZone, index) {
  const parts = String(rawZone || '')
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);
  if (parts.length < 2) return null;

  const provinceMatch = index.provinces.get(normalizePlace(parts[parts.length - 1]));
  if (!provinceMatch) return null;

  const rawCanton = parts.length >= 2 ? parts[parts.length - 2] : '';
  const rawDistrict = parts.length >= 3 ? parts[parts.length - 3] : '';

  let cantonKey = normalizePlace(rawCanton);
  cantonKey = RENAMED_CANTONS[cantonKey] || cantonKey;
  let canton = index.cantons.get(`${provinceMatch.id}|${cantonKey}`);
  if (!canton && HEADER_CANTON_ALIASES[cantonKey]) {
    canton = index.cantons.get(`${provinceMatch.id}|${HEADER_CANTON_ALIASES[cantonKey]}`);
  }

  let district = null;
  if (canton && rawDistrict) {
    district = index.districts.get(
      `${provinceMatch.id}|${canton.id}|${normalizePlace(rawDistrict)}`
    ) || null;
  }

  return {
    provinciaId: provinceMatch.id,
    provincia: provinceMatch.name,
    cantonId: canton ? canton.id : null,
    // Si no hay equivalencia en la DTA se conserva el nombre tal cual lo publica
    // SICOP en vez de forzar una asignación incorrecta.
    canton: canton ? canton.name : (rawCanton || null),
    distritoId: district ? district.id : null,
    distrito: district ? district.name : (rawDistrict || null),
    conciliado: Boolean(canton),
  };
}
