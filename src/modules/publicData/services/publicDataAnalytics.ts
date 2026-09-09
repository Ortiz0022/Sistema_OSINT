import type {
  MeicEmpresa,
  PublicDataAnalysis,
  PublicDataFilterState,
  PublicDataIndicator,
  PublicDataRankingItem,
  PublicDataScope,
  PublicDataSectorItem,
  PublicDataTableRow,
  PublicDataset,
  TamanoBreakdown,
} from '../types/publicData.types';

/**
 * Analítica del módulo de Datos Públicos.
 *
 * Todo el procesamiento ocurre en el navegador sobre el dataset normalizado:
 * se recorta al territorio activo del observatorio, se recalculan los
 * indicadores propios y se arman el ranking, el desglose por sector y la
 * tabla que consumen los componentes. Son funciones puras a propósito: no
 * tocan estado ni red, así que la vista puede memoizarlas.
 */

const INTEGER = new Intl.NumberFormat('es-CR', { maximumFractionDigits: 0 });

export const formatInteger = (value: number): string => INTEGER.format(value);
export const formatPercent = (value: number): string => {
  if (value > 0 && value < 0.05) return 'menos de 0,1 %';
  return `${value.toLocaleString('es-CR', { maximumFractionDigits: 1 })} %`;
};

const share = (part: number, total: number): number => (total > 0 ? (part / total) * 100 : 0);

const normalize = (value: string): string =>
  value
    .normalize('NFD')
    .replace(new RegExp('[\\u0300-\\u036f]', 'g'), '')
    .toLowerCase()
    .trim();

const TOP_SECTORS_SHOWN = 8;

/* ------------------------------------------------------------------ */
/* Alcance territorial                                                 */
/* ------------------------------------------------------------------ */

interface TerritorySelection {
  provinciaId: string | null;
  cantonId: string | null;
  distritoId: string | null;
  provinciaNombre: string | null;
  cantonNombre: string | null;
  distritoNombre: string | null;
}

/**
 * Resuelve hasta qué nivel territorial hay empresas registradas en el padrón.
 *
 * El padrón cubre los 7 provincias y prácticamente todos los cantones del
 * país, pero un cantón puntual puede no tener ninguna Pyme activa, y una
 * fracción de los distritos no concilia contra la DTA (ver advertencias del
 * dataset). En vez de mostrar el módulo vacío se degrada al nivel superior y
 * se avisa explícitamente.
 */
export function resolveScope(dataset: PublicDataset, selection: TerritorySelection): PublicDataScope {
  const { provinciaId, cantonId, distritoId } = selection;

  if (!provinciaId) {
    return { level: 'nacional', label: 'Todo Costa Rica', provinciaId: null, cantonId: null, distritoId: null, degradedNotice: null };
  }

  const provinciaLabel = selection.provinciaNombre ?? 'Provincia seleccionada';

  if (!cantonId) {
    return { level: 'provincia', label: provinciaLabel, provinciaId, cantonId: null, distritoId: null, degradedNotice: null };
  }

  const cantonTieneDatos = dataset.cantones.some(
    (canton) => canton.provinciaId === provinciaId && canton.cantonId === cantonId
  );
  if (!cantonTieneDatos) {
    return {
      level: 'provincia',
      label: provinciaLabel,
      provinciaId,
      cantonId: null,
      distritoId: null,
      degradedNotice: `En ${
        selection.cantonNombre ?? 'el cantón que seleccionaste'
      } no hay ninguna Pyme activa registrada en este padrón, así que no hay nada que mostrar a ese nivel. Abajo se muestran los datos de toda la provincia de ${provinciaLabel}.`,
    };
  }

  if (!distritoId) {
    return {
      level: 'canton',
      label: `${provinciaLabel} › ${selection.cantonNombre ?? ''}`,
      provinciaId,
      cantonId,
      distritoId: null,
      degradedNotice: null,
    };
  }

  const distritoTieneDatos = dataset.distritos.some(
    (distrito) => distrito.provinciaId === provinciaId && distrito.cantonId === cantonId && distrito.distritoId === distritoId
  );
  if (distritoTieneDatos) {
    return {
      level: 'distrito',
      label: `${provinciaLabel} › ${selection.cantonNombre ?? ''} › ${selection.distritoNombre ?? ''}`,
      provinciaId,
      cantonId,
      distritoId,
      degradedNotice: null,
    };
  }

  return {
    level: 'canton',
    label: `${provinciaLabel} › ${selection.cantonNombre ?? ''}`,
    provinciaId,
    cantonId,
    distritoId: null,
    degradedNotice: `En el distrito ${
      selection.distritoNombre ?? 'que seleccionaste'
    } no hay Pymes activas con ese nombre exacto de distrito en el padrón del MEIC (puede deberse a un nombre histórico o alternativo). Abajo se muestran los datos de todo el cantón.`,
  };
}

/** Empresas del dataset que caen dentro del alcance territorial activo. */
function companiesInScope(dataset: PublicDataset, scope: PublicDataScope): MeicEmpresa[] {
  return dataset.empresas.filter((empresa) => {
    if (scope.provinciaId && empresa.provinciaId !== scope.provinciaId) return false;
    if (scope.cantonId && empresa.cantonId !== scope.cantonId) return false;
    if (scope.distritoId && empresa.distritoId !== scope.distritoId) return false;
    return true;
  });
}

/* ------------------------------------------------------------------ */
/* Indicadores                                                         */
/* ------------------------------------------------------------------ */

/** Cuenta cuántas empresas de `scoped` caen en cada tamaño. */
function computeTamanoBreakdown(scoped: MeicEmpresa[]): TamanoBreakdown {
  return {
    micro: scoped.filter((e) => e.tamano === 'Micro').length,
    pequena: scoped.filter((e) => e.tamano === 'Pequeña').length,
    mediana: scoped.filter((e) => e.tamano === 'Mediana').length,
  };
}

function buildIndicators(
  dataset: PublicDataset,
  scope: PublicDataScope,
  scoped: MeicEmpresa[],
  tamanoBreakdown: TamanoBreakdown
): PublicDataIndicator[] {
  const totalNacional = dataset.meta.conteos.empresasUsadas;
  const sectoresDistintos = new Set(scoped.map((e) => e.ciiuCodigo).filter(Boolean)).size;

  const indicators: PublicDataIndicator[] = [
    {
      key: 'total',
      label: 'Empresas activas',
      value: formatInteger(scoped.length),
      helper:
        scope.level === 'nacional'
          ? `En todo el país, según el padrón del MEIC`
          : `${formatPercent(share(scoped.length, totalNacional))} del total del país (${formatInteger(totalNacional)})`,
    },
    {
      key: 'micro',
      label: 'Son empresas Micro',
      value: scoped.length > 0 ? formatPercent(share(tamanoBreakdown.micro, scoped.length)) : '—',
      helper: `${formatInteger(tamanoBreakdown.pequena)} pequeñas y ${formatInteger(tamanoBreakdown.mediana)} medianas`,
    },
    {
      key: 'sectores',
      label: 'Sectores económicos distintos',
      value: formatInteger(sectoresDistintos),
      helper: 'Según la Actividad CIIU con la que cada empresa está inscrita ante el MEIC',
    },
  ];

  const comparingCantons = scope.level === 'canton' || scope.level === 'distrito';
  const zonas = comparingCantons
    ? dataset.distritos.filter((d) => d.provinciaId === scope.provinciaId && d.cantonId === scope.cantonId)
    : scope.level === 'provincia'
      ? dataset.cantones.filter((c) => c.provinciaId === scope.provinciaId)
      : dataset.cantones;
  const topZona = [...zonas].sort((a, b) => b.total - a.total)[0];
  if (topZona) {
    const nombre = 'distrito' in topZona ? topZona.distrito : topZona.canton;
    indicators.push({
      key: 'top-zona',
      label: comparingCantons ? 'Distrito con más empresas' : 'Cantón con más empresas',
      value: nombre,
      helper: `${formatInteger(topZona.total)} empresas registradas ahí`,
    });
  }

  return indicators;
}

/* ------------------------------------------------------------------ */
/* Ranking territorial                                                 */
/* ------------------------------------------------------------------ */

function buildRanking(dataset: PublicDataset, scope: PublicDataScope): { ranking: PublicDataRankingItem[]; title: string } {
  const comparingCantons = scope.level === 'canton' || scope.level === 'distrito';

  const rows = comparingCantons
    ? dataset.cantones
        .filter((canton) => canton.provinciaId === scope.provinciaId)
        .map((canton) => ({ id: canton.cantonId, label: canton.canton, total: canton.total, isSelected: canton.cantonId === scope.cantonId }))
    : dataset.provincias.map((provincia) => ({
        id: provincia.provinciaId,
        label: provincia.provincia,
        total: provincia.total,
        isSelected: provincia.provinciaId === scope.provinciaId,
      }));

  const total = rows.reduce((sum, row) => sum + row.total, 0);
  const ranking = rows.map((row) => ({ ...row, share: share(row.total, total) })).sort((a, b) => b.total - a.total);

  const title = comparingCantons ? '¿Qué cantón de esta provincia tiene más Pymes activas?' : '¿Qué provincia tiene más Pymes activas?';
  return { ranking, title };
}

/* ------------------------------------------------------------------ */
/* Sectores (Actividad CIIU)                                           */
/* ------------------------------------------------------------------ */

function buildSectors(dataset: PublicDataset, scoped: MeicEmpresa[]): PublicDataSectorItem[] {
  const counts = new Map<string, number>();
  for (const empresa of scoped) {
    if (!empresa.ciiuCodigo) continue;
    counts.set(empresa.ciiuCodigo, (counts.get(empresa.ciiuCodigo) ?? 0) + 1);
  }

  const total = scoped.length;
  const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1]);
  const top = sorted.slice(0, TOP_SECTORS_SHOWN).map(([codigo, count]) => ({
    codigo,
    descripcion: dataset.ciiuCatalogo[codigo] ?? codigo,
    total: count,
    share: share(count, total),
  }));

  const restoTotal = sorted.slice(TOP_SECTORS_SHOWN).reduce((sum, [, count]) => sum + count, 0);
  if (restoTotal > 0) {
    top.push({ codigo: '', descripcion: `Otros ${sorted.length - TOP_SECTORS_SHOWN} sectores`, total: restoTotal, share: share(restoTotal, total) });
  }

  return top;
}

/* ------------------------------------------------------------------ */
/* Tabla de detalle                                                    */
/* ------------------------------------------------------------------ */

const TAMANO_ORDEN: Record<string, number> = { Mediana: 0, 'Pequeña': 1, Micro: 2 };

function buildTable(dataset: PublicDataset, scoped: MeicEmpresa[], filters: PublicDataFilterState): PublicDataTableRow[] {
  const query = normalize(filters.searchQuery);

  const filtered = scoped.filter((empresa) => {
    if (filters.sizeFilter !== 'todas' && empresa.tamano !== filters.sizeFilter) return false;
    if (query.length === 0) return true;
    return normalize(empresa.nombre).includes(query) || empresa.identificacion.includes(query);
  });

  const sorted = [...filtered].sort((a, b) => {
    if (filters.sortBy === 'tamano') {
      const diff = TAMANO_ORDEN[a.tamano] - TAMANO_ORDEN[b.tamano];
      return diff !== 0 ? diff : a.nombre.localeCompare(b.nombre, 'es');
    }
    return a.nombre.localeCompare(b.nombre, 'es');
  });

  return sorted.map((empresa) => ({
    id: empresa.identificacion,
    nombre: empresa.nombre,
    identificacion: empresa.identificacion,
    tamano: empresa.tamano,
    ubicacion: [empresa.provincia, empresa.canton, empresa.distrito].filter(Boolean).join(' › '),
    actividad: empresa.ciiuCodigo
      ? `${empresa.ciiuCodigo} - ${dataset.ciiuCatalogo[empresa.ciiuCodigo] ?? ''}`
      : 'Sin actividad CIIU registrada',
  }));
}

/* ------------------------------------------------------------------ */
/* Punto de entrada                                                    */
/* ------------------------------------------------------------------ */

export function analyzePublicData(
  dataset: PublicDataset,
  selection: TerritorySelection,
  filters: PublicDataFilterState
): PublicDataAnalysis {
  const scope = resolveScope(dataset, selection);
  const scoped = companiesInScope(dataset, scope);
  const tamanoBreakdown = computeTamanoBreakdown(scoped);

  const { ranking, title: rankingTitle } = buildRanking(dataset, scope);

  return {
    scope,
    indicators: buildIndicators(dataset, scope, scoped, tamanoBreakdown),
    tamanoBreakdown,
    ranking,
    rankingTitle,
    sectores: buildSectors(dataset, scoped),
    table: buildTable(dataset, scoped, filters),
    totalEmpresas: scoped.length,
  };
}
