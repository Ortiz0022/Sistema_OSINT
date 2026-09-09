/**
 * Tipos del módulo de Datos Públicos (fuente OSINT: Portal Nacional de Datos
 * Abiertos de Costa Rica — datosabiertos.gob.go.cr).
 *
 * El dataset lo produce `src/modules/publicData/etl/fetchMeicPymes.mjs` a
 * partir del XLSX que publica mensualmente el MEIC ("Lista de Pymes activas")
 * y queda publicado como `public/meic-pymes/meic-pymes.json`. Estos tipos
 * describen ese contrato.
 */

/* ------------------------------------------------------------------ */
/* Dataset normalizado                                                 */
/* ------------------------------------------------------------------ */

export type EmpresaTamano = 'Micro' | 'Pequeña' | 'Mediana';

/** Una fila del padrón: una empresa/emprendimiento con condición activa. */
export interface MeicEmpresa {
  /** Cédula jurídica o física (identificación), usada como identificador único. */
  identificacion: string;
  nombre: string;
  tamano: EmpresaTamano;
  provinciaId: string;
  provincia: string;
  /** `null` cuando el nombre de cantón del padrón no tiene equivalencia exacta en la DTA. */
  cantonId: string | null;
  canton: string;
  /** `null` cuando el distrito no concilia contra la DTA (ver `meta.advertencias`). */
  distritoId: string | null;
  distrito: string;
  /** Código CIIU; la descripción se busca en `PublicDataset.ciiuCatalogo` (no se repite por fila). */
  ciiuCodigo: string;
}

export interface PublicDataCounters {
  filasLeidasHoja: number;
  filasVaciasDescartadas: number;
  empresasUsadas: number;
  sinCantonConciliado: number;
  sinDistritoConciliado: number;
}

export interface PublicDataMeta {
  fuente: string;
  entidad: string;
  portalOficial: string;
  datasetUrl: string;
  recursoUrl: string;
  formato: string;
  licencia: string;
  /** Período real de los datos, ej. "Enero 2025" (extraído del nombre del recurso en CKAN). */
  periodoDatos: string;
  /**
   * Fecha en que el MEIC subió/editó el recurso en el portal CKAN. No es lo
   * mismo que `periodoDatos`: en este dataset el recurso se subió casi 11
   * meses después del período que describe.
   */
  publicadoEnPortal: string;
  /** Fecha ISO en que el ETL descargó y normalizó la fuente. */
  generadoEn: string;
  referenciaTerritorial: string;
  mecanismo: string;
  conteos: PublicDataCounters;
  advertencias: string[];
}

/** Agregado de conteo por tamaño de empresa, reutilizado en varios niveles. */
export interface TamanoBreakdown {
  micro: number;
  pequena: number;
  mediana: number;
}

export interface PublicDataProvinciaAgg extends TamanoBreakdown {
  provinciaId: string;
  provincia: string;
  total: number;
}

export interface PublicDataCantonAgg extends TamanoBreakdown {
  provinciaId: string;
  provincia: string;
  cantonId: string;
  canton: string;
  total: number;
}

export interface PublicDataDistritoAgg extends TamanoBreakdown {
  provinciaId: string;
  cantonId: string;
  distritoId: string;
  distrito: string;
  total: number;
}

export interface PublicDataSectorAgg {
  ciiuCodigo: string;
  ciiuDescripcion: string;
  total: number;
}

export interface PublicDataset {
  meta: PublicDataMeta;
  empresas: MeicEmpresa[];
  /** Código CIIU -> descripción. Evita repetir el texto en cada una de las 25 mil filas. */
  ciiuCatalogo: Record<string, string>;
  provincias: PublicDataProvinciaAgg[];
  cantones: PublicDataCantonAgg[];
  distritos: PublicDataDistritoAgg[];
  /** Top de sectores CIIU a nivel nacional, usado como catálogo para el desglose por territorio. */
  sectoresNacional: PublicDataSectorAgg[];
}

/* ------------------------------------------------------------------ */
/* Estado de la vista                                                  */
/* ------------------------------------------------------------------ */

/** Filtro de tamaño de empresa: reactivo, afecta KPIs, gráficos y tabla a la vez. */
export type PublicDataSizeFilter = 'todas' | EmpresaTamano;

export type PublicDataSort = 'nombre' | 'tamano';

export interface PublicDataFilterState {
  searchQuery: string;
  sizeFilter: PublicDataSizeFilter;
  sortBy: PublicDataSort;
}

/** Nivel territorial al que se pudo resolver la selección global. */
export type PublicDataScopeLevel = 'nacional' | 'provincia' | 'canton' | 'distrito';

export interface PublicDataScope {
  level: PublicDataScopeLevel;
  label: string;
  provinciaId: string | null;
  cantonId: string | null;
  distritoId: string | null;
  /** Mensaje cuando el distrito elegido no concilia y se muestra el cantón completo. */
  degradedNotice: string | null;
}

export interface PublicDataIndicator {
  key: string;
  label: string;
  value: string;
  helper: string;
}

export interface PublicDataRankingItem {
  id: string;
  label: string;
  total: number;
  share: number;
  isSelected: boolean;
}

export interface PublicDataSectorItem {
  codigo: string;
  descripcion: string;
  total: number;
  share: number;
}

export interface PublicDataTableRow {
  id: string;
  nombre: string;
  identificacion: string;
  tamano: EmpresaTamano;
  ubicacion: string;
  actividad: string;
}

/** Resultado completo del análisis para el territorio y filtros activos. */
export interface PublicDataAnalysis {
  scope: PublicDataScope;
  indicators: PublicDataIndicator[];
  /** Composición Micro/Pequeña/Mediana del territorio activo (sin filtro de tamaño aplicado). */
  tamanoBreakdown: TamanoBreakdown;
  /** Empresas por cantón (o por distrito si el alcance ya está a nivel de cantón). */
  ranking: PublicDataRankingItem[];
  rankingTitle: string;
  sectores: PublicDataSectorItem[];
  table: PublicDataTableRow[];
  totalEmpresas: number;
}
