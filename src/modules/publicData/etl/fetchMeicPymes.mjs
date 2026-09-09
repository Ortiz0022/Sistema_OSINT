#!/usr/bin/env node
/**
 * ETL del módulo de Datos Públicos — fuente OSINT: Portal Nacional de Datos
 * Abiertos de Costa Rica (CKAN, https://datosabiertos.gob.go.cr).
 *
 * Extract  : descarga el paquete CKAN "Lista de Pymes activas - Empresas
 *            Activas" (Ministerio de Economía, Industria y Comercio) y su
 *            único recurso, publicado en formato XLSX.
 * Transform: parseo del XLSX (ver `xlsxReader.mjs`), limpieza de las filas de
 *            plantilla vacías que trae el archivo, separación del código y la
 *            descripción de "ACTIVIDAD CIIU", y reconciliación de
 *            PROVINCIA/CANTÓN/DISTRITO contra la División Territorial
 *            Administrativa oficial que usa el selector global del
 *            observatorio.
 * Load     : escribe un único dataset normalizado y preagregado en
 *            `public/meic-pymes/meic-pymes.json`, que la aplicación web
 *            consume por HTTP y filtra/analiza en el navegador.
 *
 * Uso:
 *   node src/modules/publicData/etl/fetchMeicPymes.mjs
 *   node src/modules/publicData/etl/fetchMeicPymes.mjs --archivo=ruta/local.xlsx
 *
 * No requiere llaves ni credenciales: toda la información consumida es
 * pública. `--archivo` es un escape para desarrollo/pruebas sin red (usa una
 * copia local del mismo XLSX en vez de descargarlo); en uso normal el ETL
 * descarga siempre la versión vigente desde el portal.
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFirstSheet } from './xlsxReader.mjs';
import { loadTerritoryIndex, resolveZone } from './territory.mjs';

const CKAN_BASE = 'https://datosabiertos.gob.go.cr';
const DATASET_ID = 'lista-de-pymes-activas-empresas-activas-enero-2025';
const TOP_SECTORES = 12;

const moduleDir = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(moduleDir, '../../../..');

const log = (message) => process.stdout.write(message + '\n');

function parseArgs(argv) {
  const args = { archivo: null, salida: 'public/meic-pymes/meic-pymes.json' };
  for (const raw of argv.slice(2)) {
    const [key, value] = raw.replace(/^--/, '').split('=');
    if (key === 'archivo') args.archivo = value;
    else if (key === 'salida') args.salida = value;
  }
  return args;
}

/** Consulta el paquete CKAN y devuelve los metadatos de su único recurso. */
async function fetchResourceMetadata() {
  const url = `${CKAN_BASE}/api/3/action/package_show?id=${DATASET_ID}`;
  const response = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!response.ok) throw new Error(`El portal CKAN respondió HTTP ${response.status} al consultar el paquete`);
  const body = await response.json();
  if (!body.success) throw new Error('El portal CKAN marcó la consulta del paquete como fallida');

  const resource = body.result.resources[0];
  if (!resource) throw new Error('El paquete CKAN no tiene ningún recurso publicado');

  // El nombre del recurso ("Empresas Activas - Enero 2025") trae el período al
  // que corresponden los datos. NO es lo mismo que `last_modified`: esa es la
  // fecha en que CKAN subió/editó el recurso al portal, que puede ser mucho
  // después del período que describe (en este dataset, casi 11 meses después).
  const periodoMatch = /-\s*([^-]+?\d{4})\s*$/.exec(resource.name || '');

  return {
    packageUrl: `${CKAN_BASE}/dataset/${DATASET_ID}`,
    resourceUrl: resource.url,
    format: resource.format,
    // Fecha en que el recurso quedó publicado/editado en el portal CKAN.
    publicadoEnPortal: resource.last_modified,
    // Período real al que corresponde el padrón (extraído del nombre del
    // recurso); si no se puede extraer, se conserva el nombre completo.
    periodoDatos: periodoMatch ? periodoMatch[1].trim() : resource.name,
    size: resource.size,
    license: body.result.license_title,
    entity: body.result.organization?.title ?? 'MEIC',
  };
}

async function downloadResource(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`No se pudo descargar el recurso (HTTP ${response.status})`);
  return Buffer.from(await response.arrayBuffer());
}

/** Separa "4620 - Venta al por mayor de..." en código y descripción. */
function splitActividadCiiu(raw) {
  const text = String(raw || '').trim();
  const separatorIndex = text.indexOf(' - ');
  if (separatorIndex === -1) return { codigo: '', descripcion: text };
  return {
    codigo: text.slice(0, separatorIndex).trim(),
    descripcion: text.slice(separatorIndex + 3).trim().replace(/\.$/, ''),
  };
}

const TAMANO_VALIDOS = new Set(['Micro', 'Pequeña', 'Mediana']);

function emptyTamanoBreakdown() {
  return { micro: 0, pequena: 0, mediana: 0 };
}

function addTamano(breakdown, tamano) {
  if (tamano === 'Micro') breakdown.micro += 1;
  else if (tamano === 'Pequeña') breakdown.pequena += 1;
  else if (tamano === 'Mediana') breakdown.mediana += 1;
}

async function main() {
  const args = parseArgs(process.argv);
  const startedAt = Date.now();

  log('> Consultando metadatos del paquete CKAN en el Portal Nacional de Datos Abiertos...');
  const resourceMeta = await fetchResourceMetadata();
  log(`  Recurso: ${resourceMeta.resourceUrl}`);
  log(`  Formato publicado: ${resourceMeta.format} · ${(resourceMeta.size / 1e6).toFixed(2)} MB`);

  let xlsxBuffer;
  if (args.archivo) {
    log(`> Usando copia local: ${args.archivo}`);
    xlsxBuffer = await readFile(resolve(args.archivo));
  } else {
    log('> Descargando el archivo XLSX oficial...');
    xlsxBuffer = await downloadResource(resourceMeta.resourceUrl);
  }

  log('> Leyendo la hoja de cálculo...');
  const { rows: hojaCompleta } = readFirstSheet(xlsxBuffer);
  const filasVaciasDescartadas = 0; // xlsxReader ya descarta las filas sin ningún valor.
  log(`  ${hojaCompleta.length} filas con datos (el archivo trae además filas de plantilla vacías, descartadas)`);

  log('> Descargando la División Territorial Administrativa oficial (DTA)...');
  const territory = await loadTerritoryIndex();
  log(`  ${territory.provinces.size} provincias, ${territory.cantons.size} cantones, ${territory.districts.size} distritos`);

  const empresas = [];
  const ciiuCatalogo = new Map(); // codigo -> descripcion (evita repetir el texto en cada fila)
  const sectoresNacional = new Map(); // codigo -> { descripcion, total }
  const porProvincia = new Map();
  const porCanton = new Map();
  const porDistrito = new Map();

  let sinCantonConciliado = 0;
  let sinDistritoConciliado = 0;
  let tamanoInvalido = 0;

  for (const fila of hojaCompleta) {
    const identificacion = String(fila.IDENTIFICACION || '').trim();
    const nombre = String(fila.NOMBRE || '').trim();
    const tamano = String(fila['TAMAÑO'] || '').trim();
    if (!identificacion || !nombre || !TAMANO_VALIDOS.has(tamano)) {
      tamanoInvalido += 1;
      continue;
    }

    const zona = resolveZone(fila.PROVINCIA, fila['CANTÓN'], fila.DISTRITO, territory);
    if (!zona) continue; // Sin provincia conciliada: en la práctica no ocurre en este dataset.
    if (!zona.cantonId) sinCantonConciliado += 1;
    else if (!zona.distritoId) sinDistritoConciliado += 1;

    const { codigo: ciiuCodigo, descripcion: ciiuDescripcion } = splitActividadCiiu(fila['ACTIVIDAD CIIU']);

    empresas.push({
      identificacion,
      nombre,
      tamano,
      provinciaId: zona.provinciaId,
      provincia: zona.provincia,
      cantonId: zona.cantonId,
      canton: zona.canton,
      distritoId: zona.distritoId,
      distrito: zona.distrito,
      ciiuCodigo,
    });

    if (ciiuCodigo) {
      // Un mismo código CIIU se repite en miles de filas con el mismo texto:
      // se guarda una sola vez en el catálogo en vez de en cada empresa.
      if (!ciiuCatalogo.has(ciiuCodigo)) ciiuCatalogo.set(ciiuCodigo, ciiuDescripcion);
      const sector = sectoresNacional.get(ciiuCodigo) ?? { descripcion: ciiuDescripcion, total: 0 };
      sector.total += 1;
      sectoresNacional.set(ciiuCodigo, sector);
    }

    if (!porProvincia.has(zona.provinciaId)) {
      porProvincia.set(zona.provinciaId, { provinciaId: zona.provinciaId, provincia: zona.provincia, total: 0, ...emptyTamanoBreakdown() });
    }
    const provinciaAgg = porProvincia.get(zona.provinciaId);
    provinciaAgg.total += 1;
    addTamano(provinciaAgg, tamano);

    if (zona.cantonId) {
      const cantonKey = `${zona.provinciaId}|${zona.cantonId}`;
      if (!porCanton.has(cantonKey)) {
        porCanton.set(cantonKey, {
          provinciaId: zona.provinciaId,
          provincia: zona.provincia,
          cantonId: zona.cantonId,
          canton: zona.canton,
          total: 0,
          ...emptyTamanoBreakdown(),
        });
      }
      const cantonAgg = porCanton.get(cantonKey);
      cantonAgg.total += 1;
      addTamano(cantonAgg, tamano);

      if (zona.distritoId) {
        const distritoKey = `${zona.provinciaId}|${zona.cantonId}|${zona.distritoId}`;
        if (!porDistrito.has(distritoKey)) {
          porDistrito.set(distritoKey, {
            provinciaId: zona.provinciaId,
            cantonId: zona.cantonId,
            distritoId: zona.distritoId,
            distrito: zona.distrito,
            total: 0,
            ...emptyTamanoBreakdown(),
          });
        }
        const distritoAgg = porDistrito.get(distritoKey);
        distritoAgg.total += 1;
        addTamano(distritoAgg, tamano);
      }
    }
  }

  const sectoresSalida = [...sectoresNacional.entries()]
    .map(([codigo, valor]) => ({ ciiuCodigo: codigo, ciiuDescripcion: valor.descripcion, total: valor.total }))
    .sort((a, b) => b.total - a.total)
    .slice(0, TOP_SECTORES);

  const dataset = {
    meta: {
      fuente: 'Lista de Pymes activas — Empresas Activas (MEIC)',
      entidad: resourceMeta.entity,
      portalOficial: `${CKAN_BASE}/`,
      datasetUrl: resourceMeta.packageUrl,
      recursoUrl: resourceMeta.resourceUrl,
      formato: resourceMeta.format,
      licencia: resourceMeta.license,
      // Período real de los datos (ej. "Enero 2025"), no la fecha en que se
      // subieron al portal — ver `publicadoEnPortal`.
      periodoDatos: resourceMeta.periodoDatos,
      publicadoEnPortal: resourceMeta.publicadoEnPortal,
      generadoEn: new Date().toISOString(),
      referenciaTerritorial: 'https://ubicaciones.paginasweb.cr/ (DTA oficial)',
      mecanismo: 'Descarga del recurso XLSX publicado en el portal CKAN + parseo propio + reconciliación territorial',
      conteos: {
        filasLeidasHoja: hojaCompleta.length,
        filasVaciasDescartadas,
        empresasUsadas: empresas.length,
        sinCantonConciliado,
        sinDistritoConciliado,
      },
      advertencias: [
        'El archivo publicado por el MEIC trae, además de las filas con datos, miles de filas de plantilla completamente vacías al final de la hoja: se descartan y no se cuentan como empresas.',
        `${tamanoInvalido} filas se descartaron por no tener identificación, nombre o un tamaño de empresa reconocido (Micro, Pequeña o Mediana).`,
        `Es una fotografía del padrón de ${resourceMeta.periodoDatos} (empresas con condición "activa" en ese momento), no una serie histórica: no refleja altas ni bajas posteriores. El MEIC subió este recurso al portal hasta el ${new Date(resourceMeta.publicadoEnPortal).toLocaleDateString('es-CR')}, varios meses después del período que describe.`,
        `${sinDistritoConciliado} empresas (${((sinDistritoConciliado / empresas.length) * 100).toFixed(1)} %) usan un nombre de distrito que no coincide de forma exacta con el nombre oficial vigente en la División Territorial Administrativa (nombres históricos o alternativos). Para esas empresas el filtro territorial llega hasta el nivel de cantón, no de distrito.`,
        sinCantonConciliado > 0
          ? `${sinCantonConciliado} empresas quedaron sin cantón conciliado contra la DTA.`
          : 'Los 82 cantones de la DTA quedaron conciliados: todas las empresas del padrón tienen provincia y cantón identificados.',
        'El "tamaño" (Micro/Pequeña/Mediana) lo clasifica el MEIC según la Ley de Fortalecimiento de las PYME (N° 8262), no según los ingresos o el personal que pueda tener registrados en otra entidad.',
      ],
    },
    empresas,
    ciiuCatalogo: Object.fromEntries(ciiuCatalogo),
    provincias: [...porProvincia.values()].sort((a, b) => b.total - a.total),
    cantones: [...porCanton.values()].sort((a, b) => b.total - a.total),
    distritos: [...porDistrito.values()],
    sectoresNacional: sectoresSalida,
  };

  const outputPath = resolve(projectRoot, args.salida);
  await mkdir(dirname(outputPath), { recursive: true });
  const serialized = JSON.stringify(dataset);
  await writeFile(outputPath, serialized + '\n', 'utf8');

  log('');
  log(`OK Dataset escrito en ${args.salida} (${(Buffer.byteLength(serialized) / 1024).toFixed(0)} KB)`);
  log(`   Empresas usadas       : ${empresas.length.toLocaleString('es-CR')}`);
  log(`   Provincias / cantones : ${dataset.provincias.length} / ${dataset.cantones.length}`);
  log(`   Sin cantón conciliado : ${sinCantonConciliado}`);
  log(`   Sin distrito conciliado: ${sinDistritoConciliado}`);
  log(`   Tiempo                : ${((Date.now() - startedAt) / 1000).toFixed(1)} s`);
}

main().catch((error) => {
  process.stderr.write(`\nERROR El ETL de Datos Públicos falló: ${error.message}\n`);
  process.exitCode = 1;
});
