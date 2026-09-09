#!/usr/bin/env node
/**
 * Verificación de integridad del dataset generado por `fetchMeicPymes.mjs`.
 *
 * Uso:
 *   node src/modules/publicData/etl/verifyDataset.mjs
 */
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../../../..');
const fileArg = process.argv.slice(2).find((arg) => arg.startsWith('--archivo='));
const datasetPath = resolve(projectRoot, fileArg ? fileArg.split('=')[1] : 'public/meic-pymes/meic-pymes.json');

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

for (const key of ['fuente', 'entidad', 'portalOficial', 'recursoUrl', 'formato', 'generadoEn']) {
  check(`meta.${key} presente`, typeof dataset.meta?.[key] === 'string' && dataset.meta[key].length > 0);
}

check('provincias: 7 registros', dataset.provincias.length === 7);
check(
  'provincias: total = empresas usadas',
  sum(dataset.provincias, 'total') === dataset.meta.conteos.empresasUsadas,
  `${sum(dataset.provincias, 'total')} vs ${dataset.meta.conteos.empresasUsadas}`
);
check(
  'provincias: micro+pequeña+mediana = total',
  dataset.provincias.every((p) => p.micro + p.pequena + p.mediana === p.total)
);

for (const provincia of dataset.provincias) {
  const cantones = dataset.cantones.filter((c) => c.provinciaId === provincia.provinciaId);
  check(
    `${provincia.provincia}: cantones suman el total provincial`,
    sum(cantones, 'total') === provincia.total,
    `${cantones.length} cantones`
  );
}

check(
  'distritos: total <= empresas usadas (no todas concilian a nivel de distrito)',
  sum(dataset.distritos, 'total') <= dataset.meta.conteos.empresasUsadas
);
check(
  'distritos: total = empresas usadas - sin distrito conciliado',
  sum(dataset.distritos, 'total') === dataset.meta.conteos.empresasUsadas - dataset.meta.conteos.sinDistritoConciliado
);

check(
  'empresas: todas tienen identificación y provinciaId',
  dataset.empresas.every((e) => e.identificacion && e.provinciaId)
);
check(
  'empresas: identificación única',
  new Set(dataset.empresas.map((e) => e.identificacion)).size === dataset.empresas.length
);
check(
  'empresas: ciiuCodigo presente en el catálogo',
  dataset.empresas.every((e) => !e.ciiuCodigo || dataset.ciiuCatalogo[e.ciiuCodigo] !== undefined)
);
check(
  'sectoresNacional: ordenado de mayor a menor',
  dataset.sectoresNacional.every((item, index, all) => index === 0 || all[index - 1].total >= item.total)
);

process.stdout.write(
  `\n${failures === 0 ? 'Dataset íntegro: todas las verificaciones pasaron.' : `${failures} verificaciones fallaron.`}\n`
);
process.exitCode = failures === 0 ? 0 : 1;
