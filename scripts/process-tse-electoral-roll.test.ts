import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { crc32 } from 'node:zlib';

// Ítem 4.2: pruebas de FLU-02 para el ETL del padrón del TSE.
// Se ejecuta el script real (`npm run etl:tse`) sobre un ZIP FALSO armado en la
// prueba: no se usan datos reales del padrón. Cada prueba trabaja en una
// carpeta temporal, así que nunca toca public/data del repositorio.
// Criterios: docs/requisitos/flujos-criticos.md. Convención de `it.fails`: ver
// server/services/oijService.criterios.test.ts.

const RAIZ = resolve(import.meta.dirname, '..');
const SCRIPT = join(RAIZ, 'scripts', 'process-tse-electoral-roll.ts');
const TSX = join(RAIZ, 'node_modules', 'tsx', 'dist', 'cli.mjs');
const SALIDA_RELATIVA = join('public', 'data', 'tse-electoral-aggregates.json');
const TIEMPO = 30_000;

/** Arma un ZIP sin compresión (método "stored") con los archivos indicados. */
function crearZip(archivos: Record<string, string>): Buffer {
  const locales: Buffer[] = [];
  const centrales: Buffer[] = [];
  let offset = 0;

  for (const [nombre, contenido] of Object.entries(archivos)) {
    const nombreBuf = Buffer.from(nombre, 'utf8');
    const datos = Buffer.from(contenido, 'utf8');
    const crc = crc32(datos);

    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(datos.length, 18);
    local.writeUInt32LE(datos.length, 22);
    local.writeUInt16LE(nombreBuf.length, 26);
    locales.push(local, nombreBuf, datos);

    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt32LE(crc, 16);
    central.writeUInt32LE(datos.length, 20);
    central.writeUInt32LE(datos.length, 24);
    central.writeUInt16LE(nombreBuf.length, 28);
    central.writeUInt32LE(offset, 42);
    centrales.push(central, nombreBuf);

    offset += local.length + nombreBuf.length + datos.length;
  }

  const directorio = Buffer.concat(centrales);
  const fin = Buffer.alloc(22);
  fin.writeUInt32LE(0x06054b50, 0);
  fin.writeUInt16LE(Object.keys(archivos).length, 8);
  fin.writeUInt16LE(Object.keys(archivos).length, 10);
  fin.writeUInt32LE(directorio.length, 12);
  fin.writeUInt32LE(offset, 16);

  return Buffer.concat([...locales, directorio, fin]);
}

// Datos ficticios. Formato del TSE:
// distelec.txt -> CODELEC,PROVINCIA,CANTON,DISTRITO
// padrón       -> CEDULA,CODELEC,RELLENO,FECHACADUC,JUNTA,NOMBRE,1.APELLIDO,2.APELLIDO
const DISTELEC = ['101001,SAN JOSE,CENTRAL,CARMEN', '101002,SAN JOSE,CENTRAL,CARMEN', '101003,SAN JOSE,CENTRAL,HOSPITAL'].join('\n');

const PERSONAS = [
  ['109990001', '101001', 'ANA', 'PRUEBA', 'UNO'],
  ['109990002', '101001', 'LUIS', 'FICTICIO', 'DOS'],
  ['109990003', '101002', 'MARTA', 'INVENTADA', 'TRES'],
  ['109990004', '101003', 'PEDRO', 'SIMULADO', 'CUATRO'],
];

function lineaPadron([cedula, codelec, nombre, ap1, ap2]: string[]): string {
  return `${cedula},${codelec},0,20311231,01234,${nombre},${ap1},${ap2}`;
}

const PADRON = PERSONAS.map(lineaPadron).join('\n');

let carpeta: string;

beforeEach(() => {
  carpeta = mkdtempSync(join(tmpdir(), 'tse-etl-'));
});

afterEach(() => {
  rmSync(carpeta, { recursive: true, force: true });
});

function guardarZip(archivos: Record<string, string>, nombre = 'padron_prueba.zip'): string {
  const ruta = join(carpeta, nombre);
  writeFileSync(ruta, crearZip(archivos));
  return ruta;
}

function ejecutarEtl(...args: string[]) {
  const r = spawnSync(process.execPath, [TSX, SCRIPT, ...args], { cwd: carpeta, encoding: 'utf8' });
  return { status: r.status, salida: `${r.stdout}\n${r.stderr}` };
}

function rutaSalida(): string {
  return join(carpeta, SALIDA_RELATIVA);
}

function leerSalida() {
  return JSON.parse(readFileSync(rutaSalida(), 'utf8'));
}

describe('FLU-02 — ETL del padrón del TSE', () => {
  describe('éxito', () => {
    it('FLU-02-CA01: agrega electores por provincia, cantón y distrito', { timeout: TIEMPO }, () => {
      const zip = guardarZip({ 'distelec.txt': DISTELEC, 'PADRON_COMPLETO.txt': PADRON });

      const r = ejecutarEtl(zip);
      const salida = leerSalida();

      expect(r.status).toBe(0);
      expect(salida.metadata).toMatchObject({
        recordsProcessed: 4,
        containsPersonalData: false,
        aggregationLevel: 'territorial',
        sourceFile: 'padron_prueba.zip',
      });
      const porDistrito = Object.fromEntries(
        salida.territories.map((t: { district: string; registeredVoters: number; cantonPercentage: number }) => [
          t.district,
          [t.registeredVoters, t.cantonPercentage],
        ])
      );
      // Dos CODELEC distintos del mismo distrito geográfico se suman.
      expect(porDistrito).toEqual({ CARMEN: [3, 75], HOSPITAL: [1, 25] });
    });

    it('FLU-02-CA01: la salida no contiene ninguna cédula, nombre, apellido ni fecha de caducidad', { timeout: TIEMPO }, () => {
      const zip = guardarZip({ 'distelec.txt': DISTELEC, 'PADRON_COMPLETO.txt': PADRON });

      ejecutarEtl(zip);
      const texto = readFileSync(rutaSalida(), 'utf8');

      for (const [cedula, , nombre, ap1, ap2] of PERSONAS) {
        for (const dato of [cedula, nombre, ap1, ap2]) expect(texto).not.toContain(dato);
      }
      expect(texto).not.toContain('20311231');
      expect(texto).not.toMatch(/"(cedula|nombre|apellido|nombres|apellidos|fechacaduc)"\s*:/i);
    });

    it('FLU-02-CA01 (límite): acepta finales de línea de Windows y líneas en blanco', { timeout: TIEMPO }, () => {
      const zip = guardarZip({
        'distelec.txt': `${DISTELEC.replaceAll('\n', '\r\n')}\r\n\r\n`,
        'PADRON_COMPLETO.txt': `\r\n${PADRON.replaceAll('\n', '\r\n')}\r\n\r\n`,
        'LEAME.txt': 'Archivo informativo que no debe procesarse',
      });

      const r = ejecutarEtl(zip);

      expect(r.status).toBe(0);
      expect(leerSalida().metadata.recordsProcessed).toBe(4);
    });
  });

  describe('errores', () => {
    it('FLU-02-CA03: sin la ruta del ZIP termina con error y no escribe nada', { timeout: TIEMPO }, () => {
      const r = ejecutarEtl();

      expect(r.status).not.toBe(0);
      expect(r.salida).toMatch(/Debe proporcionar la ruta/);
      expect(existsSync(rutaSalida())).toBe(false);
    });

    it('FLU-02-CA03: con una ruta que no existe termina con error', { timeout: TIEMPO }, () => {
      const r = ejecutarEtl(join(carpeta, 'no-existe.zip'));

      expect(r.status).not.toBe(0);
      expect(r.salida).toMatch(/No se encontró el archivo/);
      expect(existsSync(rutaSalida())).toBe(false);
    });

    it('FLU-02-CA03: un ZIP sin distelec.txt termina con error y conserva el dataset anterior', { timeout: TIEMPO }, () => {
      mkdirSync(join(carpeta, 'public', 'data'), { recursive: true });
      writeFileSync(rutaSalida(), '{"anterior":true}');
      const zip = guardarZip({ 'PADRON_COMPLETO.txt': PADRON });

      const r = ejecutarEtl(zip);

      expect(r.status).not.toBe(0);
      expect(r.salida).toMatch(/distelec\.txt/);
      expect(readFileSync(rutaSalida(), 'utf8')).toBe('{"anterior":true}');
    });

    it('FLU-02-CA03: un ZIP sin el archivo principal del padrón termina con error', { timeout: TIEMPO }, () => {
      const zip = guardarZip({ 'distelec.txt': DISTELEC, 'LEAME.txt': 'solo informativo' });

      const r = ejecutarEtl(zip);

      expect(r.status).not.toBe(0);
      expect(r.salida).toMatch(/archivo principal del padrón/);
      expect(existsSync(rutaSalida())).toBe(false);
    });

    it.fails(
      'FLU-02-CA05 [HP-07, Issue #9]: los electores con CODELEC sin correspondencia quedan contados en los metadatos',
      { timeout: TIEMPO },
      () => {
        // 7 personas con un CODELEC que no existe en distelec.txt.
        const huerfanas = Array.from({ length: 7 }, (_, i) => lineaPadron([`20999000${i}`, '999999', 'X', 'Y', 'Z']));
        const zip = guardarZip({ 'distelec.txt': DISTELEC, 'PADRON_COMPLETO.txt': [PADRON, ...huerfanas].join('\n') });

        const r = ejecutarEtl(zip);
        const metadata = leerSalida().metadata;

        expect(r.status).toBe(0);
        // No se fija el nombre del campo (lo decide quien corrija HP-07); solo
        // se exige que la cantidad afectada (7) quede registrada en metadata.
        expect(JSON.stringify(metadata)).toMatch(/[^\d]7[^\d]/);
      }
    );
  });
});
