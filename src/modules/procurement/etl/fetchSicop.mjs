#!/usr/bin/env node
/**
 * ETL del módulo de Contratación Pública — fuente OSINT: SICOP.
 *
 * Extract  : descarga automatizada de los ZIP mensuales de datos abiertos de
 *            SICOP publicados por el Observatorio de Compra Pública del
 *            Ministerio de Hacienda (contenedor público, listable y versionado).
 * Transform: parseo de los CSV, deduplicación de líneas adjudicadas y
 *            reconciliación de la geografía de SICOP contra la División
 *            Territorial Administrativa oficial usada por el observatorio.
 * Load     : escribe un único dataset normalizado y preagregado en
 *            `public/sicop/sicop-territorial.json`, que la aplicación web
 *            consume por HTTP y filtra/analiza en el navegador.
 *
 * Uso:
 *   node src/modules/procurement/etl/fetchSicop.mjs
 *   node src/modules/procurement/etl/fetchSicop.mjs --meses=36
 *   node src/modules/procurement/etl/fetchSicop.mjs --desde=202401 --hasta=202412
 *
 * No requiere llaves ni credenciales: toda la información consumida es pública.
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readRemoteZipMembers } from './sicopZip.mjs';
import { parseSemicolonCsv, parseAmount, toYearMonth } from './csv.mjs';
import { loadTerritoryIndex, resolveZone } from './territory.mjs';
import { fetchWithRetry } from './http.mjs';

const CONTAINER =
  'https://dlsaobservatorioprod.blob.core.windows.net/fs-synapse-observatorio-produccion';
const ZIP_PREFIX = CONTAINER + '/Zip';
const PORTAL_DESCARGAS = 'https://www.observatoriocomprapublica.go.cr/descargas-sicop/';
const SICOP_OPEN_DATA = 'https://www.sicop.go.cr/app/module/pcont/public/ce-open-data';

const FILE_ADJUDICACIONES = 'ProcedimientoAdjudicacion.csv';
const FILE_INSTITUCIONES = 'InstitucionesRegistradas.csv';
const FILE_PROVEEDORES = 'Proveedores.csv';

const SIN_UBICACION = 'Sin ubicación registrada';
const TOP_PROVEEDORES = 400;

const moduleDir = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(moduleDir, '../../../..');

function parseArgs(argv) {
  const args = { meses: 24, desde: null, hasta: null, salida: 'public/sicop/sicop-territorial.json' };
  for (const raw of argv.slice(2)) {
    const [key, value] = raw.replace(/^--/, '').split('=');
    if (key === 'meses') args.meses = Math.max(1, Number(value) || 24);
    else if (key === 'desde') args.desde = value;
    else if (key === 'hasta') args.hasta = value;
    else if (key === 'salida') args.salida = value;
  }
  return args;
}

const log = (message) => process.stdout.write(message + '\n');
const formatCrc = (value) => '₡' + Math.round(value).toLocaleString('es-CR');
const round = (value) => Math.round(value * 100) / 100;

/** Lista los períodos `YYYYMM` realmente publicados en el contenedor público. */
async function listAvailablePeriods() {
  const url = CONTAINER + '?restype=container&comp=list&maxresults=5000&prefix=Zip/';
  const response = await fetchWithRetry(url, { label: 'listado del contenedor SICOP' });
  if (!response.ok) throw new Error('No se pudo listar el contenedor (HTTP ' + response.status + ')');
  const xml = await response.text();
  return [...xml.matchAll(/<Name>Zip\/(\d{6})\.zip<\/Name>/g)].map((match) => match[1]).sort();
}

function pickPeriods(available, args) {
  let periods = available;
  if (args.desde) periods = periods.filter((period) => period >= args.desde);
  if (args.hasta) periods = periods.filter((period) => period <= args.hasta);
  if (!args.desde && !args.hasta) periods = periods.slice(-args.meses);
  if (periods.length === 0) throw new Error('El rango solicitado no tiene períodos publicados');
  return periods;
}

/** Acumulador reutilizable: monto, líneas y entidades distintas. */
function bucket() {
  return { monto: 0, lineas: 0, entidades: new Set() };
}

function addTo(map, key, monto, entidad) {
  let item = map.get(key);
  if (!item) { item = bucket(); map.set(key, item); }
  item.monto += monto;
  item.lineas += 1;
  if (entidad) item.entidades.add(entidad);
}

async function main() {
  const args = parseArgs(process.argv);
  const startedAt = Date.now();

  log('> Consultando periodos publicados por el Observatorio de Compra Publica...');
  const available = await listAvailablePeriods();
  const periods = pickPeriods(available, args);
  log('  ' + available.length + ' periodos disponibles (' + available[0] + ' -> ' + available.at(-1) + ')');
  log('  Se procesaran ' + periods.length + ': ' + periods[0] + ' -> ' + periods.at(-1));

  log('> Descargando Division Territorial Administrativa oficial (DTA)...');
  const territory = await loadTerritoryIndex();
  log('  ' + territory.provinces.size + ' provincias, ' + territory.cantons.size + ' cantones, ' + territory.districts.size + ' distritos');

  const latestPeriod = periods.at(-1);
  // Ventana efectivamente descargada, en formato `yyyy-mm`. Una adjudicación
  // puede quedar en firme antes del mes en que SICOP la publica, así que la
  // serie mensual contiene puntos anteriores a esta ventana que NO son
  // comparables (solo se ve el arrastre, no el mes completo).
  const ventanaDesde = periods[0].slice(0, 4) + '-' + periods[0].slice(4);
  const ventanaHasta = latestPeriod.slice(0, 4) + '-' + latestPeriod.slice(4);
  log('> Descargando catalogos de instituciones y proveedores (' + latestPeriod + ')...');
  const catalogos = await readRemoteZipMembers(ZIP_PREFIX + '/' + latestPeriod + '.zip', [
    FILE_INSTITUCIONES,
    FILE_PROVEEDORES,
  ]);

  const instituciones = new Map();
  for (const row of parseSemicolonCsv(catalogos.members[FILE_INSTITUCIONES])) {
    instituciones.set(row.CEDULA, {
      nombre: row.NOMBRE_INSTITUCION,
      geo: resolveZone(row.ZONA_GEO_INST, territory),
    });
  }
  const proveedores = new Map();
  for (const row of parseSemicolonCsv(catalogos.members[FILE_PROVEEDORES])) {
    proveedores.set(row.CEDULA_PROVEEDOR, {
      nombre: row.NOMBRE_PROVEEDOR,
      tamano: row['TAMAÑO_PROVEEDOR'] || '',
      tipo: row.TIPO_PROVEEDOR || '',
      geo: resolveZone(row.zona_geo_prov, territory),
    });
  }
  log('  ' + instituciones.size + ' instituciones compradoras y ' + proveedores.size + ' proveedores registrados');

  // --- Acumuladores -------------------------------------------------------
  const porProvinciaComprador = new Map();
  const porProvinciaProveedor = new Map();
  const porCantonComprador = new Map();
  const porCantonProveedor = new Map();
  const porDistritoComprador = new Map();
  const serieMensual = new Map();
  const flujos = new Map();
  const tipos = new Map();
  const montoPorInstitucion = new Map();
  const montoPorProveedor = new Map();

  const seen = new Set();
  const conteos = {
    lineasLeidas: 0,
    lineasUsadas: 0,
    duplicadosDescartados: 0,
    sinMonto: 0,
    sinGeoInstitucion: 0,
    sinGeoProveedor: 0,
    cantonNoConciliado: 0,
    lineasFueraDeVentana: 0,
  };
  // Meses cuyo CSV de adjudicaciones viene publicado pero sin filas de datos.
  const periodosSinDatos = [];
  let montoTotal = 0;
  let bytesDescargados = catalogos.stats.downloadedBytes;
  let bytesZipTotales = catalogos.stats.totalZipBytes;

  for (const period of periods) {
    const { members, stats } = await readRemoteZipMembers(ZIP_PREFIX + '/' + period + '.zip', [
      FILE_ADJUDICACIONES,
    ]);
    bytesDescargados += stats.downloadedBytes;
    bytesZipTotales += stats.totalZipBytes;

    const filas = parseSemicolonCsv(members[FILE_ADJUDICACIONES]);
    conteos.lineasLeidas += filas.length;
    if (filas.length === 0) periodosSinDatos.push(period);

    for (const fila of filas) {
      const clave = fila.NRO_SICOP + '|' + fila.NUMERO_PROCEDIMIENTO + '|' + fila.LINEA + '|' + fila.CEDULA_PROVEEDOR;
      if (seen.has(clave)) { conteos.duplicadosDescartados += 1; continue; }
      seen.add(clave);

      const monto = parseAmount(fila.MONTO_ADJU_LINEA_CRC);
      if (monto <= 0) { conteos.sinMonto += 1; continue; }

      const institucion = instituciones.get(fila.CEDULA);
      const proveedor = proveedores.get(fila.CEDULA_PROVEEDOR);
      const geoInst = institucion ? institucion.geo : null;
      const geoProv = proveedor ? proveedor.geo : null;
      if (!geoInst) conteos.sinGeoInstitucion += 1;
      if (!geoProv) conteos.sinGeoProveedor += 1;
      if (geoInst && !geoInst.conciliado) conteos.cantonNoConciliado += 1;

      conteos.lineasUsadas += 1;
      montoTotal += monto;

      const mes = toYearMonth(fila.FECHA_ADJUD_FIRME) || period.slice(0, 4) + '-' + period.slice(4);
      if (mes < ventanaDesde || mes > ventanaHasta) conteos.lineasFueraDeVentana += 1;

      if (geoInst) {
        addTo(porProvinciaComprador, geoInst.provinciaId, monto, fila.CEDULA);
        addTo(
          porCantonComprador,
          geoInst.provinciaId + '|' + (geoInst.cantonId || 'x') + '|' + (geoInst.canton || ''),
          monto,
          fila.CEDULA
        );
        if (geoInst.distritoId) {
          addTo(
            porDistritoComprador,
            geoInst.provinciaId + '|' + geoInst.cantonId + '|' + geoInst.distritoId,
            monto,
            fila.CEDULA
          );
        }
        addTo(serieMensual, mes + '|' + geoInst.provinciaId, monto, null);
        addTo(tipos, geoInst.provinciaId + '|' + (fila.TIPO_PROCEDIMIENTO || 'No indicado'), monto, null);
      }
      if (geoProv) {
        addTo(porProvinciaProveedor, geoProv.provinciaId, monto, fila.CEDULA_PROVEEDOR);
        addTo(
          porCantonProveedor,
          geoProv.provinciaId + '|' + (geoProv.cantonId || 'x') + '|' + (geoProv.canton || ''),
          monto,
          fila.CEDULA_PROVEEDOR
        );
      }
      addTo(
        flujos,
        (geoInst ? geoInst.provinciaId : 'nd') + '|' + (geoProv ? geoProv.provinciaId : 'nd'),
        monto,
        null
      );

      addTo(montoPorInstitucion, fila.CEDULA, monto, null);
      addTo(montoPorProveedor, fila.CEDULA_PROVEEDOR, monto, null);
    }

    log('  ' + period + ': ' + String(filas.length).padStart(6) + ' lineas | acumulado ' + formatCrc(montoTotal));
  }

  // --- Construcción del dataset de salida ---------------------------------
  const nombreProvincia = (id) => territory.provinceNameById.get(id) || SIN_UBICACION;

  const provincias = [...territory.provinceNameById.entries()].map(([id, nombre]) => {
    const comprador = porProvinciaComprador.get(id) || bucket();
    const proveedor = porProvinciaProveedor.get(id) || bucket();
    return {
      provinciaId: id,
      provincia: nombre,
      compradorMonto: round(comprador.monto),
      compradorLineas: comprador.lineas,
      compradorEntidades: comprador.entidades.size,
      proveedorMonto: round(proveedor.monto),
      proveedorLineas: proveedor.lineas,
      proveedorEntidades: proveedor.entidades.size,
    };
  });

  const cantonKeys = new Set([...porCantonComprador.keys(), ...porCantonProveedor.keys()]);
  const cantones = [...cantonKeys]
    .map((key) => {
      const [provinciaId, cantonId, canton] = key.split('|');
      const comprador = porCantonComprador.get(key) || bucket();
      const proveedor = porCantonProveedor.get(key) || bucket();
      return {
        provinciaId,
        provincia: nombreProvincia(provinciaId),
        cantonId: cantonId === 'x' ? null : cantonId,
        canton: canton || SIN_UBICACION,
        compradorMonto: round(comprador.monto),
        compradorLineas: comprador.lineas,
        compradorEntidades: comprador.entidades.size,
        proveedorMonto: round(proveedor.monto),
        proveedorLineas: proveedor.lineas,
        proveedorEntidades: proveedor.entidades.size,
      };
    })
    .sort((a, b) => b.compradorMonto + b.proveedorMonto - (a.compradorMonto + a.proveedorMonto));

  const distritos = [...porDistritoComprador.entries()].map(([key, value]) => {
    const [provinciaId, cantonId, distritoId] = key.split('|');
    return {
      provinciaId,
      cantonId,
      distritoId,
      monto: round(value.monto),
      lineas: value.lineas,
      entidades: value.entidades.size,
    };
  });

  const serie = [...serieMensual.entries()]
    .map(([key, value]) => {
      const [mes, provinciaId] = key.split('|');
      return {
        mes,
        provinciaId,
        monto: round(value.monto),
        lineas: value.lineas,
        // `false` = mes incompleto: solo contiene adjudicaciones en firme
        // anteriores a la ventana descargada que SICOP publicó más tarde.
        ventanaCompleta: mes >= ventanaDesde && mes <= ventanaHasta,
      };
    })
    .sort((a, b) => (a.mes === b.mes ? a.provinciaId.localeCompare(b.provinciaId) : a.mes.localeCompare(b.mes)));

  const flujosSalida = [...flujos.entries()]
    .map(([key, value]) => {
      const [origenId, destinoId] = key.split('|');
      return {
        origenId: origenId === 'nd' ? null : origenId,
        origen: origenId === 'nd' ? SIN_UBICACION : nombreProvincia(origenId),
        destinoId: destinoId === 'nd' ? null : destinoId,
        destino: destinoId === 'nd' ? SIN_UBICACION : nombreProvincia(destinoId),
        monto: round(value.monto),
        lineas: value.lineas,
      };
    })
    .sort((a, b) => b.monto - a.monto);

  const tiposSalida = [...tipos.entries()]
    .map(([key, value]) => {
      const index = key.indexOf('|');
      return {
        provinciaId: key.slice(0, index),
        tipo: key.slice(index + 1),
        monto: round(value.monto),
        lineas: value.lineas,
      };
    })
    .sort((a, b) => b.monto - a.monto);

  const institucionesSalida = [...montoPorInstitucion.entries()]
    .map(([cedula, value]) => {
      const info = instituciones.get(cedula);
      const geo = info ? info.geo : null;
      return {
        cedula,
        nombre: info ? info.nombre : 'Institución no catalogada',
        provinciaId: geo ? geo.provinciaId : null,
        provincia: geo ? geo.provincia : SIN_UBICACION,
        cantonId: geo ? geo.cantonId : null,
        canton: geo ? geo.canton : SIN_UBICACION,
        distritoId: geo ? geo.distritoId : null,
        distrito: geo ? geo.distrito : null,
        monto: round(value.monto),
        lineas: value.lineas,
      };
    })
    .sort((a, b) => b.monto - a.monto);

  const proveedoresSalida = [...montoPorProveedor.entries()]
    .map(([cedula, value]) => {
      const info = proveedores.get(cedula);
      const geo = info ? info.geo : null;
      return {
        cedula,
        nombre: info ? info.nombre : 'Proveedor no catalogado',
        tamano: info ? info.tamano : '',
        provinciaId: geo ? geo.provinciaId : null,
        provincia: geo ? geo.provincia : SIN_UBICACION,
        cantonId: geo ? geo.cantonId : null,
        canton: geo ? geo.canton : SIN_UBICACION,
        monto: round(value.monto),
        lineas: value.lineas,
      };
    })
    .sort((a, b) => b.monto - a.monto)
    .slice(0, TOP_PROVEEDORES);

  const dataset = {
    meta: {
      fuente: 'SICOP — Datos abiertos de contratación pública',
      sistemaOrigen: 'SICOP · Sistema Integrado de Compras Públicas',
      entidad: 'Ministerio de Hacienda · Observatorio de Compra Pública',
      portalOficial: PORTAL_DESCARGAS,
      moduloDatosAbiertos: SICOP_OPEN_DATA,
      actualizacion:
        'El Observatorio republica los datos de SICOP a diario: el archivo del mes en curso se actualiza todos los días a las 8:00 a. m.',
      urlDatos: ZIP_PREFIX + '/{YYYYMM}.zip',
      mecanismo: 'Descarga automatizada de los ZIP mensuales por rangos HTTP + parseo de CSV',
      formato: 'ZIP → CSV (UTF-8, separador ";") → JSON normalizado',
      archivos: [FILE_ADJUDICACIONES, FILE_INSTITUCIONES, FILE_PROVEEDORES],
      referenciaTerritorial: 'https://ubicaciones.paginasweb.cr/ (DTA oficial)',
      generadoEn: new Date().toISOString(),
      periodos: periods,
      periodoInicial: periods[0],
      periodoFinal: periods.at(-1),
      ventana: { desde: ventanaDesde, hasta: ventanaHasta },
      periodosSinDatos,
      montoTotalCrc: round(montoTotal),
      conteos: {
        ...conteos,
        institucionesCatalogadas: instituciones.size,
        proveedoresCatalogados: proveedores.size,
        proveedoresPublicados: proveedoresSalida.length,
      },
      descarga: {
        bytesDescargados,
        bytesZipTotales,
        ahorroPorcentaje: round(100 - (bytesDescargados / bytesZipTotales) * 100),
      },
      advertencias: [
        'SICOP publica esta copia de sus datos con hasta un día de atraso respecto a su sistema principal.',
        'El lugar que se muestra es la dirección registrada de la institución y de la empresa, no el lugar donde se entrega o se usa lo comprado.',
        'Los montos son dinero comprometido en compras ya aprobadas, no dinero que el Estado ya haya pagado.',
        'Monteverde y Puerto Jiménez son cantones nuevos que todavía no aparecen en la lista territorial oficial que usamos: se muestran con su nombre, pero no se pueden filtrar por cantón.',
        'El gráfico mensual se ordena por la fecha en que cada compra quedó en firme. Los meses anteriores al período analizado quedan incompletos, así que no se grafican.',
      ],
    },
    provincias,
    cantones,
    distritos,
    serieMensual: serie,
    flujos: flujosSalida,
    tiposProcedimiento: tiposSalida,
    instituciones: institucionesSalida,
    proveedores: proveedoresSalida,
  };

  const outputPath = resolve(projectRoot, args.salida);
  await mkdir(dirname(outputPath), { recursive: true });
  const serialized = JSON.stringify(dataset);
  await writeFile(outputPath, serialized + '\n', 'utf8');

  log('');
  log('OK Dataset escrito en ' + args.salida + ' (' + (Buffer.byteLength(serialized) / 1024).toFixed(0) + ' KB)');
  log('   Lineas adjudicadas usadas : ' + conteos.lineasUsadas.toLocaleString('es-CR'));
  log('   Monto total adjudicado    : ' + formatCrc(montoTotal));
  log('   Descargado                : ' + (bytesDescargados / 1e6).toFixed(2) + ' MB de ' + (bytesZipTotales / 1e6).toFixed(0) + ' MB publicados');
  log('   Tiempo                    : ' + ((Date.now() - startedAt) / 1000).toFixed(1) + ' s');
}

main().catch((error) => {
  process.stderr.write('\nERROR El ETL de SICOP fallo: ' + error.message + '\n');
  process.exitCode = 1;
});
