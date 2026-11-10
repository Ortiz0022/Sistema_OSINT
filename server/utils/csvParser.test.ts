import { describe, it, expect } from 'vitest';
import { parseCSV } from './csvParser.js';

// Regla de negocio: el CSV que devuelve el OIJ trae datos personales de las
// víctimas (edad, sexo, nacionalidad). El backend solo puede conservar el delito,
// la fecha y el territorio, y debe descartar filas incompletas.
// Trazabilidad: FLU-01 (consulta de estadísticas de seguridad), ítem 1.1.

const HEADER =
  'Delito,SubDelito,Fecha,Hora,Victima,SubVictima,Edad,Sexo,Nacionalidad,Provincia,Canton,Distrito';

function fila(overrides: Partial<Record<string, string>> = {}): string {
  const base = {
    delito: 'ASALTO',
    subdelito: 'ARMA DE FUEGO',
    fecha: '2026-03-15',
    hora: '06:00:00 - 08:59:59',
    victima: 'PERSONA',
    subvictima: 'PEATON',
    edad: 'Mayor de edad',
    sexo: 'HOMBRE',
    nacionalidad: 'Costa Rica',
    provincia: 'SAN JOSE',
    canton: 'CENTRAL',
    distrito: 'CARMEN',
    ...overrides,
  };
  return Object.values(base).join(',');
}

const CAMPOS_PERMITIDOS = ['Canton', 'Delito', 'Distrito', 'Fecha', 'Provincia', 'SubDelito'];

describe('parseCSV — CSV del OIJ', () => {
  describe('éxito', () => {
    it('convierte cada fila válida en un registro con delito, fecha y territorio', async () => {
      const csv = [HEADER, fila(), fila({ delito: 'HURTO', distrito: 'HOSPITAL' })].join('\n');

      const registros = await parseCSV(csv);

      expect(registros).toHaveLength(2);
      expect(registros[0]).toEqual({
        Delito: 'ASALTO',
        SubDelito: 'ARMA DE FUEGO',
        Fecha: '2026-03-15',
        Provincia: 'SAN JOSE',
        Canton: 'CENTRAL',
        Distrito: 'CARMEN',
      });
      expect(registros[1].Delito).toBe('HURTO');
    });

    it('no conserva edad, sexo, nacionalidad ni datos de la víctima', async () => {
      const csv = [HEADER, fila()].join('\n');

      const [registro] = await parseCSV(csv);

      expect(Object.keys(registro).sort()).toEqual(CAMPOS_PERMITIDOS);
      const valores = Object.values(registro);
      expect(valores).not.toContain('HOMBRE');
      expect(valores).not.toContain('Mayor de edad');
      expect(valores).not.toContain('Costa Rica');
      expect(valores).not.toContain('PEATON');
    });

    it('decodifica entidades HTML numéricas en los nombres', async () => {
      const csv = [HEADER, fila({ provincia: 'LIM&#211;N' })].join('\n');

      const [registro] = await parseCSV(csv);

      expect(registro.Provincia).toBe('LIMÓN');
    });
  });

  describe('errores', () => {
    it('descarta filas malformadas con menos de 12 columnas', async () => {
      const incompleta = 'ROBO,VIVIENDA,2026-01-01,SAN JOSE';
      const csv = [HEADER, fila(), incompleta].join('\n');

      const registros = await parseCSV(csv);

      expect(registros).toHaveLength(1);
      expect(registros[0].Delito).toBe('ASALTO');
    });

    it('rechaza un CSV con comillas sin cerrar en lugar de devolver datos a medias', async () => {
      const csv = [HEADER, '"ASALTO,ARMA DE FUEGO,2026-03-15'].join('\n');

      await expect(parseCSV(csv)).rejects.toThrow();
    });
  });

  describe('valores límite', () => {
    it('devuelve una lista vacía si el CSV está vacío', async () => {
      await expect(parseCSV('')).resolves.toEqual([]);
    });

    it('devuelve una lista vacía si solo viene el encabezado', async () => {
      await expect(parseCSV(HEADER)).resolves.toEqual([]);
    });

    it('acepta una fila con exactamente 12 columnas', async () => {
      const csv = [HEADER, fila()].join('\n');

      await expect(parseCSV(csv)).resolves.toHaveLength(1);
    });

    it('descarta una fila con 11 columnas (una menos del mínimo)', async () => {
      const once = fila().split(',').slice(0, 11).join(',');
      const csv = [HEADER, once].join('\n');

      await expect(parseCSV(csv)).resolves.toEqual([]);
    });

    it('ignora líneas en blanco entre registros', async () => {
      const csv = [HEADER, fila(), '', '', fila()].join('\n');

      await expect(parseCSV(csv)).resolves.toHaveLength(2);
    });
  });
});
