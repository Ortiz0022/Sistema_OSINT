/**
 * Metadatos de la fuente OSINT del módulo de Datos Públicos.
 *
 * Se declaran dentro del módulo (y no en `src/constants/sources.ts`) para que
 * la integración sea autocontenida, siguiendo el mismo criterio que
 * `src/modules/procurement/constants/sicopSource.ts`.
 */

export const MEIC_PYMES_SOURCE = {
  id: 'meic-pymes-datos-abiertos',
  name: 'Lista de Pymes activas — Empresas Activas (datos abiertos)',
  officialEntity: 'Ministerio de Economía, Industria y Comercio (MEIC)',
  /** Portal Nacional de Datos Abiertos de Costa Rica, sobre CKAN. */
  officialUrl: 'https://datosabiertos.gob.go.cr/',
  /** Ficha del dataset dentro del portal. */
  datasetPageUrl: 'https://datosabiertos.gob.go.cr/dataset/lista-de-pymes-activas-empresas-activas-enero-2025',
  /** Ruta del dataset normalizado que produce el ETL del módulo. */
  datasetUrl: 'meic-pymes/meic-pymes.json',
  license: 'Creative Commons Attribution (CC-BY)',
} as const;

/** Etiquetas del filtro de tamaño de empresa, en el mismo orden en que se muestran. */
export const SIZE_FILTER_LABELS: Record<'todas' | 'Micro' | 'Pequeña' | 'Mediana', string> = {
  todas: 'Todas',
  Micro: 'Micro',
  Pequeña: 'Pequeña',
  Mediana: 'Mediana',
};

/** Glosario que se muestra en la interfaz: solo lo indispensable para leer la página. */
export const GLOSSARY = [
  {
    term: 'PYME',
    definition: 'Pequeña y Mediana Empresa. El MEIC también clasifica ahí a la "Micro" empresa, según la Ley N.º 8262.',
  },
  {
    term: 'Condición activa',
    definition: 'Que la empresa sigue vigente en el registro del MEIC, no que esté operando en este momento.',
  },
  {
    term: 'Actividad CIIU',
    definition: 'El código con el que la empresa le dice al MEIC a qué se dedica (ej. "6201 - Programación informática").',
  },
] as const;
