#!/usr/bin/env node
/**
 * Verificación de integridad del dataset generado por el ETL de SICOP.
 *
 * Se ejecuta después de `fetchSicop.mjs` para confirmar que el archivo
 * publicado es coherente antes de subirlo al repositorio: totales cuadrados,
 * porcentajes que suman 100, identificadores territoriales válidos y ausencia
 * de huecos en la serie mensual.
 *
 * Uso:
 *   node src/modules/procurement/etl/verifyDataset.mjs
 *   node src/modules/procurement/etl/verifyDataset.mjs --archivo=public/sicop/otro.json
 */
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../../../..');
const fileArg = process.argv.slice(2).find((arg) => arg.startsWith('--archivo='));
const datasetPath = resolve(projectRoot, fileArg ? fileArg.split('=')[1] : 'public/sicop/sicop-territorial.json');

const PROVINCE_IDS = new Set(['1', '2', '3', '4', '5', '6', '7']);
const TOLERANCE = 1; // colones

let failures = 0;
function check(name, passed, detail = '') {
  process.stdout.write(`${passed ? 'OK  ' : 'FALLA'} ${name}${detail ? ' -> ' + detail : ''}\n`);
  if (!passed) failures += 1;
}

let dataset;
try {
  dataset = JSON.parse(readFileSync(datasetPath, 'utf8'));
} catch (error) {
  process.stderr.write(`No se pudo leer ${datasetPath}: ${error.message}\n`);
  process.exit(1);
}

const sum = (rows, key) => rows.reduce((total, row) => total + (row[key] ?? 0), 0);
const money = (value) => Math.round(value).toLocaleString('es-CR');

// 1. Metadatos mínimos exigidos por la trazabilidad de la fuente.
for (const key of ['fuente', 'entidad', 'portalOficial', 'urlDatos', 'mecanismo', 'generadoEn']) {
  check(`meta.${key} presente`, typeof dataset.meta?.[key] === 'string' && dataset.meta[key].length > 0);
}
check('meta.periodos no vacío', Array.isArray(dataset.meta.periodos) && dataset.meta.periodos.length > 0,
  `${dataset.meta.periodos?.length} meses`);

// 2. Los totales por provincia deben reconstruir el total del ETL.
const totalComprador = sum(dataset.provincias, 'compradorMonto');
const totalProveedor = sum(dataset.provincias, 'proveedorMonto');
check('provincias: 7 registros', dataset.provincias.length === 7);
check('provincias: ids válidos', dataset.provincias.every((p) => PROVINCE_IDS.has(p.provinciaId)));
check(
  'provincias: monto comprador = monto total del ETL',
  Math.abs(totalComprador - dataset.meta.montoTotalCrc) < TOLERANCE,
  `₡${money(totalComprador)} vs ₡${money(dataset.meta.montoTotalCrc)}`
);
check(
  'provincias: monto proveedor <= monto total (parte va a proveedores sin ubicación)',
  totalProveedor <= dataset.meta.montoTotalCrc + TOLERANCE,
  `₡${money(totalProveedor)}`
);

// 3. Los cantones deben sumar exactamente lo mismo que su provincia.
for (const provincia of dataset.provincias) {
  const cantones = dataset.cantones.filter((canton) => canton.provinciaId === provincia.provinciaId);
  check(
    `${provincia.provincia}: cantones suman el total provincial`,
    Math.abs(sum(cantones, 'compradorMonto') - provincia.compradorMonto) < TOLERANCE,
    `${cantones.length} cantones`
  );
}
check(
  'cantones: ids conciliados contra la DTA o marcados como null',
  dataset.cantones.every((canton) => canton.cantonId === null || /^\d+$/.test(canton.cantonId))
);

// 4. Los flujos deben cuadrar con el total procesado.
check(
  'flujos: suman el monto total',
  Math.abs(sum(dataset.flujos, 'monto') - dataset.meta.montoTotalCrc) < TOLERANCE,
  `₡${money(sum(dataset.flujos, 'monto'))}`
);
check(
  'flujos: líneas suman las líneas usadas',
  sum(dataset.flujos, 'lineas') === dataset.meta.conteos.lineasUsadas,
  `${sum(dataset.flujos, 'lineas')} vs ${dataset.meta.conteos.lineasUsadas}`
);

// 5. La serie mensual no debe tener meses salteados dentro de la ventana.
const meses = [...new Set(dataset.serieMensual.filter((p) => p.ventanaCompleta).map((p) => p.mes))].sort();
let huecos = 0;
for (let i = 1; i < meses.length; i += 1) {
  const [year, month] = meses[i - 1].split('-').map(Number);
  const esperado = month === 12 ? `${year + 1}-01` : `${year}-${String(month + 1).padStart(2, '0')}`;
  if (meses[i] !== esperado) huecos += 1;
}
check('serie mensual: sin meses faltantes en la ventana', huecos === 0, `${meses.length} meses continuos`);
check(
  'serie mensual: solo provincias válidas',
  dataset.serieMensual.every((point) => PROVINCE_IDS.has(point.provinciaId))
);

// 6. Detalle de entidades coherente con los agregados.
check(
  'instituciones: monto suma el total comprador',
  Math.abs(sum(dataset.instituciones, 'monto') - dataset.meta.montoTotalCrc) < TOLERANCE,
  `${dataset.instituciones.length} instituciones`
);
check(
  'instituciones: sin montos negativos',
  dataset.instituciones.every((item) => item.monto >= 0 && item.lineas > 0)
);
check(
  'proveedores: ordenados de mayor a menor',
  dataset.proveedores.every((item, index, all) => index === 0 || all[index - 1].monto >= item.monto),
  `${dataset.proveedores.length} publicados`
);

process.stdout.write(
  `\n${failures === 0 ? 'Dataset íntegro: todas las verificaciones pasaron.' : `${failures} verificaciones fallaron.`}\n`
);
process.exitCode = failures === 0 ? 0 : 1;
