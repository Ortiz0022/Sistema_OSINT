/**
 * Tipos del módulo de Contratación Pública (fuente OSINT: SICOP).
 *
 * El dataset lo produce `src/modules/procurement/etl/fetchSicop.mjs` a partir
 * de los ZIP mensuales de datos abiertos de SICOP y queda publicado como
 * `public/sicop/sicop-territorial.json`. Estos tipos describen ese contrato.
 */

/* ------------------------------------------------------------------ */
/* Dataset normalizado                                                 */
/* ------------------------------------------------------------------ */

export interface SicopDownloadStats {
  bytesDescargados: number;
  bytesZipTotales: number;
  ahorroPorcentaje: number;
}

export interface SicopCounters {
  lineasLeidas: number;
  lineasUsadas: number;
  duplicadosDescartados: number;
  sinMonto: number;
  sinGeoInstitucion: number;
  sinGeoProveedor: number;
  cantonNoConciliado: number;
  lineasFueraDeVentana: number;
  institucionesCatalogadas: number;
  proveedoresCatalogados: number;
  proveedoresPublicados: number;
}

export interface SicopMeta {
  fuente: string;
  /** Sistema del que salen los datos originalmente. */
  sistemaOrigen: string;
  /** Entidad que publica los archivos descargables. */
  entidad: string;
  portalOficial: string;
  moduloDatosAbiertos: string;
  /** Con qué frecuencia se republican los archivos. */
  actualizacion: string;
  urlDatos: string;
  mecanismo: string;
  formato: string;
  archivos: string[];
  referenciaTerritorial: string;
  /** Fecha ISO en que el ETL descargó y normalizó la fuente. */
  generadoEn: string;
  periodos: string[];
  periodoInicial: string;
  periodoFinal: string;
  ventana: { desde: string; hasta: string };
  /** Meses publicados por SICOP sin ninguna fila de datos. */
  periodosSinDatos: string[];
  montoTotalCrc: number;
  conteos: SicopCounters;
  descarga: SicopDownloadStats;
  advertencias: string[];
}

/** Agregado con doble lente: territorio de la institución y del proveedor. */
export interface SicopTerritorialAggregate {
  compradorMonto: number;
  compradorLineas: number;
  compradorEntidades: number;
  proveedorMonto: number;
  proveedorLineas: number;
  proveedorEntidades: number;
}

export interface SicopProvincia extends SicopTerritorialAggregate {
  provinciaId: string;
  provincia: string;
}

export interface SicopCanton extends SicopTerritorialAggregate {
  provinciaId: string;
  provincia: string;
  /** `null` cuando SICOP reporta un cantón sin equivalencia en la DTA oficial. */
  cantonId: string | null;
  canton: string;
}

export interface SicopDistrito {
  provinciaId: string;
  cantonId: string;
  distritoId: string;
  monto: number;
  lineas: number;
  entidades: number;
}

export interface SicopSeriePoint {
  mes: string;
  provinciaId: string;
  monto: number;
  lineas: number;
  /** `false` = mes con arrastre parcial, no comparable con el resto. */
  ventanaCompleta: boolean;
}

export interface SicopFlujo {
  origenId: string | null;
  origen: string;
  destinoId: string | null;
  destino: string;
  monto: number;
  lineas: number;
}

export interface SicopTipoProcedimiento {
  provinciaId: string;
  tipo: string;
  monto: number;
  lineas: number;
}

export interface SicopInstitucion {
  cedula: string;
  nombre: string;
  provinciaId: string | null;
  provincia: string;
  cantonId: string | null;
  canton: string;
  distritoId: string | null;
  distrito: string | null;
  monto: number;
  lineas: number;
}

export interface SicopProveedor {
  cedula: string;
  nombre: string;
  tamano: string;
  provinciaId: string | null;
  provincia: string;
  cantonId: string | null;
  canton: string;
  monto: number;
  lineas: number;
}

export interface SicopDataset {
  meta: SicopMeta;
  provincias: SicopProvincia[];
  cantones: SicopCanton[];
  distritos: SicopDistrito[];
  serieMensual: SicopSeriePoint[];
  flujos: SicopFlujo[];
  tiposProcedimiento: SicopTipoProcedimiento[];
  instituciones: SicopInstitucion[];
  proveedores: SicopProveedor[];
}

/* ------------------------------------------------------------------ */
/* Estado de la vista                                                  */
/* ------------------------------------------------------------------ */

/** Lente de atribución territorial del monto adjudicado. */
export type ProcurementLens = 'comprador' | 'proveedor';

export type ProcurementSort = 'monto' | 'lineas';

export interface ProcurementFilterState {
  searchQuery: string;
  lens: ProcurementLens;
  sortBy: ProcurementSort;
}

/** Nivel territorial al que se pudo resolver la selección global. */
export type ProcurementScopeLevel = 'nacional' | 'provincia' | 'canton' | 'distrito';

export interface ProcurementScope {
  level: ProcurementScopeLevel;
  label: string;
  provinciaId: string | null;
  cantonId: string | null;
  distritoId: string | null;
  /**
   * Mensaje cuando la granularidad pedida no existe en SICOP y se muestra el
   * nivel inmediatamente superior (por ejemplo, distrito sin adjudicaciones).
   */
  degradedNotice: string | null;
}

export interface ProcurementIndicator {
  key: string;
  label: string;
  value: string;
  helper: string;
}

export interface RankingItem {
  id: string;
  label: string;
  monto: number;
  lineas: number;
  entidades: number;
  share: number;
  isSelected: boolean;
}

export interface TrendPoint {
  mes: string;
  monto: number;
  lineas: number;
}

export interface FlowItem {
  destinoId: string | null;
  destino: string;
  monto: number;
  lineas: number;
  share: number;
  esLocal: boolean;
}

export interface TypeItem {
  tipo: string;
  monto: number;
  lineas: number;
  share: number;
}

export interface EntityRow {
  id: string;
  nombre: string;
  detalle: string;
  ubicacion: string;
  monto: number;
  lineas: number;
}

/** Resultado completo del análisis para el territorio y filtros activos. */
export interface ProcurementAnalysis {
  scope: ProcurementScope;
  indicators: ProcurementIndicator[];
  ranking: RankingItem[];
  trend: TrendPoint[];
  trendIsPartial: boolean;
  flows: FlowItem[];
  flowsTitle: string;
  types: TypeItem[];
  entities: EntityRow[];
  entitiesTitle: string;
  totalMonto: number;
  totalLineas: number;
  retencionLocal: number | null;
  /** Provincia a la que corresponde `retencionLocal`, si hay una activa. */
  retencionProvincia: string | null;
}
