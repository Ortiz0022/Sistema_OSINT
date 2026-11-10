import { describe, expect, it } from 'vitest';
import { analyzePublicData } from './publicDataAnalytics';
import type { PublicDataFilterState, PublicDataset } from '../types/publicData.types';

// Ítem 4.2: pruebas de FLU-03 para el buscador de Datos Públicos (MEIC).
// Usa un dataset ficticio mínimo; no lee public/meic-pymes.
// Criterios: docs/requisitos/flujos-criticos.md.
//
// FLU-03-CA09 (qué datos personales puede mostrar el buscador) está bloqueado
// por la duda D-01 y no se prueba hasta que se decida.

function empresa(identificacion: string, nombre: string, provinciaId: string, cantonId: string) {
  return {
    identificacion,
    nombre,
    tamano: 'Micro',
    provinciaId,
    provincia: provinciaId === '1' ? 'San José' : 'Alajuela',
    cantonId,
    canton: 'Central',
    distritoId: null,
    distrito: '',
    ciiuCodigo: '1071',
  };
}

const EMPRESAS = [
  empresa('3101000001', 'PANADERÍA LA ESQUINA SOCIEDAD ANÓNIMA', '1', '1'),
  empresa('3101000002', 'FERRETERÍA EL CLAVO S.A.', '1', '1'),
  empresa('3102000003', 'A.*(B) COMERCIAL LIMITADA', '1', '1'),
  empresa('3101000004', 'PANADERIA ALAJUELENSE S.A.', '2', '1'),
];

const DATASET = {
  meta: { conteos: { empresasUsadas: EMPRESAS.length } },
  empresas: EMPRESAS,
  ciiuCatalogo: { '1071': 'Elaboración de productos de panadería' },
  provincias: [
    { provinciaId: '1', provincia: 'San José', total: 3 },
    { provinciaId: '2', provincia: 'Alajuela', total: 1 },
  ],
  cantones: [
    { provinciaId: '1', cantonId: '1', canton: 'Central', total: 3 },
    { provinciaId: '2', cantonId: '1', canton: 'Central', total: 1 },
  ],
  distritos: [],
} as unknown as PublicDataset;

type Seleccion = Parameters<typeof analyzePublicData>[1];

const NACIONAL: Seleccion = { provinciaId: null, cantonId: null, distritoId: null, provinciaNombre: null, cantonNombre: null, distritoNombre: null };
const SAN_JOSE: Seleccion = { ...NACIONAL, provinciaId: '1', provinciaNombre: 'San José' };

function buscar(searchQuery: string, seleccion = NACIONAL) {
  const filtros: PublicDataFilterState = { searchQuery, sizeFilter: 'todas', sortBy: 'nombre' };
  return analyzePublicData(DATASET, seleccion, filtros).table;
}

describe('FLU-03 — buscador de Datos Públicos', () => {
  describe('éxito', () => {
    it('FLU-03-CA02: encuentra por parte del nombre, sin importar tildes ni mayúsculas', () => {
      const resultado = buscar('panaderia');

      expect(resultado.map((r) => r.identificacion)).toEqual(['3101000004', '3101000001']);
    });

    it('FLU-03-CA02: encuentra por parte de la identificación', () => {
      expect(buscar('3102').map((r) => r.nombre)).toEqual(['A.*(B) COMERCIAL LIMITADA']);
    });

    it('FLU-03-CA02: solo devuelve coincidencias del territorio elegido', () => {
      const resultado = buscar('panadería', SAN_JOSE);

      expect(resultado.map((r) => r.identificacion)).toEqual(['3101000001']);
    });

    it('FLU-03-CA02 (límite): una búsqueda vacía o solo con espacios lista todo el territorio', () => {
      expect(buscar('')).toHaveLength(4);
      expect(buscar('   ')).toHaveLength(4);
    });
  });

  describe('errores', () => {
    it('FLU-03-CA05: una búsqueda sin coincidencias devuelve una lista vacía', () => {
      expect(buscar('no existe ninguna empresa así')).toEqual([]);
    });
  });

  describe('uso indebido', () => {
    it.each(['<img src=x onerror=alert(1)>', '<script>alert(1)</script>', '"; DROP TABLE empresas; --'])(
      'FLU-03-CA06: el texto malicioso %s se trata como texto literal y no genera error',
      (consulta) => {
        expect(() => buscar(consulta)).not.toThrow();
        expect(buscar(consulta)).toEqual([]);
      }
    );

    it('FLU-03-CA06: caracteres especiales de expresiones regulares se buscan de forma literal', () => {
      expect(() => buscar('.*(')).not.toThrow();
      expect(buscar('.*(').map((r) => r.identificacion)).toEqual(['3102000003']);
      expect(buscar('(((')).toEqual([]);
    });

    it('FLU-03-CA06 (límite): una búsqueda muy larga no rompe el filtro', () => {
      expect(buscar('a'.repeat(100_000))).toEqual([]);
    });
  });
});
