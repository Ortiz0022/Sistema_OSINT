import { LENS_LABELS } from '../constants/sicopSource';
import type {
  EntityRow,
  FlowItem,
  ProcurementAnalysis,
  ProcurementFilterState,
  ProcurementIndicator,
  ProcurementScope,
  RankingItem,
  SicopCanton,
  SicopDataset,
  SicopProvincia,
  TrendPoint,
  TypeItem,
} from '../types/procurement.types';

/**
 * Analítica del módulo de Contratación Pública.
 *
 * Todo el procesamiento ocurre en el navegador sobre el dataset normalizado:
 * se recorta al territorio activo del observatorio, se recalculan indicadores
 * propios (participación nacional, ticket promedio, retención local) y se
 * arman las series y rankings que consumen los componentes.
 *
 * Son funciones puras a propósito: no tocan estado ni red, así que la vista
 * puede memoizarlas y son fáciles de revisar durante la exposición.
 */

const CRC = new Intl.NumberFormat('es-CR', {
  style: 'currency',
  currency: 'CRC',
  maximumFractionDigits: 0,
});
const INTEGER = new Intl.NumberFormat('es-CR', { maximumFractionDigits: 0 });

/**
 * Formatea colones en palabras completas ("₡414,3 mil millones").
 *
 * Se evitan las abreviaturas tipo "mil M" o "₡1,2 B": obligan a quien lee a
 * traducir mentalmente y son la principal fuente de confusión al comparar
 * territorios de tamaños muy distintos.
 */
export function formatCrcCompact(value: number): string {
  const abs = Math.abs(value);
  const decimal = (divisor: number, digits: number): string =>
    (value / divisor).toLocaleString('es-CR', { maximumFractionDigits: digits });

  if (abs >= 1_000_000_000_000) return `₡${decimal(1_000_000_000_000, 2)} billones`;
  if (abs >= 1_000_000_000) return `₡${decimal(1_000_000_000, 1)} mil millones`;
  if (abs >= 1_000_000) return `₡${decimal(1_000_000, 1)} millones`;
  if (abs >= 1_000) return `₡${decimal(1_000, 0)} mil`;
  return CRC.format(value);
}

export const formatCrc = (value: number): string => CRC.format(value);
export const formatInteger = (value: number): string => INTEGER.format(value);
export const formatPercent = (value: number): string => {
  // Un territorio pequeño con datos reales no debe leerse como "0 %".
  if (value > 0 && value < 0.05) return 'menos de 0,1 %';
  return `${value.toLocaleString('es-CR', { maximumFractionDigits: 1 })} %`;
};

/** Devuelve la forma singular o plural según la cantidad. */
const plural = (count: number, singular: string, many: string): string =>
  count === 1 ? singular : many;

/** Convierte `2026-08` en `ago 2026`. */
export function formatMonth(mes: string): string {
  const [year, month] = mes.split('-');
  const names = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  const index = Number(month) - 1;
  return `${names[index] ?? month} ${year}`;
}

const share = (part: number, total: number): number => (total > 0 ? (part / total) * 100 : 0);

const normalize = (value: string): string =>
  value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim();

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
 * Resuelve hasta qué nivel territorial hay datos en SICOP.
 *
 * SICOP georreferencia por el domicilio registrado, así que muchos distritos
 * (y algunos cantones) no tienen ninguna entidad. En vez de mostrar el módulo
 * vacío se degrada al nivel superior y se avisa explícitamente.
 */
export function resolveScope(dataset: SicopDataset, selection: TerritorySelection): ProcurementScope {
  const { provinciaId, cantonId, distritoId } = selection;

  if (!provinciaId) {
    return {
      level: 'nacional',
      label: 'Todo Costa Rica',
      provinciaId: null,
      cantonId: null,
      distritoId: null,
      degradedNotice: null,
    };
  }

  const provinciaLabel = selection.provinciaNombre ?? 'Provincia seleccionada';

  if (cantonId) {
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
        } no hay ninguna institución ni empresa con dirección registrada en SICOP, así que no hay nada que mostrar a ese nivel. Abajo se muestran los datos de toda la provincia de ${provinciaLabel}.`,
      };
    }

    if (distritoId) {
      const distritoTieneDatos = dataset.distritos.some(
        (distrito) =>
          distrito.provinciaId === provinciaId &&
          distrito.cantonId === cantonId &&
          distrito.distritoId === distritoId
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
        } no hay compras registradas en SICOP. Abajo se muestran los datos de todo el cantón.`,
      };
    }

    return {
      level: 'canton',
      label: `${provinciaLabel} › ${selection.cantonNombre ?? ''}`,
      provinciaId,
      cantonId,
      distritoId: null,
      degradedNotice: null,
    };
  }

  return {
    level: 'provincia',
    label: provinciaLabel,
    provinciaId,
    cantonId: null,
    distritoId: null,
    degradedNotice: null,
  };
}

/* ------------------------------------------------------------------ */
/* Análisis                                                            */
/* ------------------------------------------------------------------ */

function aggregateForLens(
  aggregate: SicopProvincia | SicopCanton,
  lens: ProcurementFilterState['lens']
): { monto: number; lineas: number; entidades: number } {
  return lens === 'comprador'
    ? {
        monto: aggregate.compradorMonto,
        lineas: aggregate.compradorLineas,
        entidades: aggregate.compradorEntidades,
      }
    : {
        monto: aggregate.proveedorMonto,
        lineas: aggregate.proveedorLineas,
        entidades: aggregate.proveedorEntidades,
      };
}

function buildRanking(
  dataset: SicopDataset,
  scope: ProcurementScope,
  lens: ProcurementFilterState['lens']
): RankingItem[] {
  // A nivel nacional o de provincia se comparan provincias; dentro de una
  // provincia con cantón activo se comparan los cantones de esa provincia.
  const comparingCantons = scope.level === 'canton' || scope.level === 'distrito';

  const rows = comparingCantons
    ? dataset.cantones
        .filter((canton) => canton.provinciaId === scope.provinciaId)
        .map((canton) => ({
          id: canton.cantonId ?? `sin-dta-${canton.canton}`,
          label: canton.canton,
          ...aggregateForLens(canton, lens),
          isSelected: canton.cantonId === scope.cantonId,
        }))
    : dataset.provincias.map((provincia) => ({
        id: provincia.provinciaId,
        label: provincia.provincia,
        ...aggregateForLens(provincia, lens),
        isSelected: provincia.provinciaId === scope.provinciaId,
      }));

  const total = rows.reduce((sum, row) => sum + row.monto, 0);
  return rows
    .map((row) => ({ ...row, share: share(row.monto, total) }))
    .sort((a, b) => b.monto - a.monto);
}

function buildTrend(
  dataset: SicopDataset,
  scope: ProcurementScope
): { trend: TrendPoint[]; isPartial: boolean } {
  const relevant = dataset.serieMensual.filter(
    (point) => !scope.provinciaId || point.provinciaId === scope.provinciaId
  );

  const byMonth = new Map<string, TrendPoint>();
  let discardedPartial = false;

  for (const point of relevant) {
    // Los meses fuera de la ventana descargada solo traen arrastre y
    // distorsionarían la tendencia, así que no se grafican.
    if (!point.ventanaCompleta) {
      discardedPartial = true;
      continue;
    }
    const current = byMonth.get(point.mes) ?? { mes: point.mes, monto: 0, lineas: 0 };
    current.monto += point.monto;
    current.lineas += point.lineas;
    byMonth.set(point.mes, current);
  }

  // Red de seguridad: si un mes del que SICOP publicó el archivo vacío tampoco
  // fue cubierto por publicaciones posteriores, se dibuja en ₡0 en vez de
  // desaparecer del eje y aparentar continuidad.
  for (const periodo of dataset.meta.periodosSinDatos) {
    const mes = `${periodo.slice(0, 4)}-${periodo.slice(4)}`;
    if (!byMonth.has(mes)) byMonth.set(mes, { mes, monto: 0, lineas: 0 });
  }

  return {
    trend: [...byMonth.values()].sort((a, b) => a.mes.localeCompare(b.mes)),
    isPartial: discardedPartial,
  };
}

function buildFlows(
  dataset: SicopDataset,
  scope: ProcurementScope
): { flows: FlowItem[]; title: string } {
  if (!scope.provinciaId) {
    const total = dataset.flujos.reduce((sum, flujo) => sum + flujo.monto, 0);
    return {
      title: '¿De qué provincia sale el egreso y a cuál llega?',
      flows: dataset.flujos.slice(0, 12).map((flujo) => ({
        destinoId: flujo.destinoId,
        destino: `${flujo.origen} → ${flujo.destino}`,
        monto: flujo.monto,
        lineas: flujo.lineas,
        share: share(flujo.monto, total),
        esLocal: flujo.origenId !== null && flujo.origenId === flujo.destinoId,
      })),
    };
  }

  const salientes = dataset.flujos.filter((flujo) => flujo.origenId === scope.provinciaId);
  const total = salientes.reduce((sum, flujo) => sum + flujo.monto, 0);
  const provinciaNombre =
    dataset.provincias.find((item) => item.provinciaId === scope.provinciaId)?.provincia ??
    'esta provincia';

  return {
    title: `¿A qué provincias les llega el egreso de las instituciones de ${provinciaNombre}?`,
    flows: salientes
      .map((flujo) => ({
        destinoId: flujo.destinoId,
        destino: flujo.destino,
        monto: flujo.monto,
        lineas: flujo.lineas,
        share: share(flujo.monto, total),
        esLocal: flujo.destinoId === scope.provinciaId,
      }))
      .sort((a, b) => b.monto - a.monto),
  };
}

function buildTypes(dataset: SicopDataset, scope: ProcurementScope): TypeItem[] {
  const relevant = dataset.tiposProcedimiento.filter(
    (item) => !scope.provinciaId || item.provinciaId === scope.provinciaId
  );

  const byType = new Map<string, { monto: number; lineas: number }>();
  for (const item of relevant) {
    const current = byType.get(item.tipo) ?? { monto: 0, lineas: 0 };
    current.monto += item.monto;
    current.lineas += item.lineas;
    byType.set(item.tipo, current);
  }

  const total = [...byType.values()].reduce((sum, item) => sum + item.monto, 0);
  return [...byType.entries()]
    .map(([tipo, item]) => ({ tipo, monto: item.monto, lineas: item.lineas, share: share(item.monto, total) }))
    .sort((a, b) => b.monto - a.monto);
}

function buildEntities(
  dataset: SicopDataset,
  scope: ProcurementScope,
  filters: ProcurementFilterState
): { entities: EntityRow[]; title: string } {
  const query = normalize(filters.searchQuery);
  const matches = (text: string, cedula: string): boolean =>
    query.length === 0 || normalize(text).includes(query) || cedula.includes(query);

  if (filters.lens === 'comprador') {
    const rows = dataset.instituciones
      .filter((institucion) => {
        if (scope.provinciaId && institucion.provinciaId !== scope.provinciaId) return false;
        if (scope.cantonId && institucion.cantonId !== scope.cantonId) return false;
        if (scope.distritoId && institucion.distritoId !== scope.distritoId) return false;
        return matches(institucion.nombre, institucion.cedula);
      })
      .map((institucion) => ({
        id: institucion.cedula,
        nombre: institucion.nombre,
        detalle: `Cédula jurídica ${institucion.cedula}`,
        ubicacion: [institucion.provincia, institucion.canton, institucion.distrito]
          .filter(Boolean)
          .join(' › '),
        monto: institucion.monto,
        lineas: institucion.lineas,
      }));
    return { entities: rows, title: 'Instituciones que compran' };
  }

  const rows = dataset.proveedores
    .filter((proveedor) => {
      if (scope.provinciaId && proveedor.provinciaId !== scope.provinciaId) return false;
      if (scope.cantonId && proveedor.cantonId !== scope.cantonId) return false;
      return matches(proveedor.nombre, proveedor.cedula);
    })
    .map((proveedor) => ({
      id: proveedor.cedula,
      nombre: proveedor.nombre,
      detalle: [proveedor.tamano, `Cédula ${proveedor.cedula}`].filter(Boolean).join(' · '),
      ubicacion: [proveedor.provincia, proveedor.canton].filter(Boolean).join(' › '),
      monto: proveedor.monto,
      lineas: proveedor.lineas,
    }));

  return {
    entities: rows,
    title: `Empresas que le venden al Estado (las ${dataset.meta.conteos.proveedoresPublicados} más grandes del país)`,
  };
}

/**
 * Porcentaje del egreso de las instituciones de una provincia que termina en
 * empresas de esa misma provincia.
 */
function computeRetencionLocal(dataset: SicopDataset, provinciaId: string | null): number | null {
  if (!provinciaId) return null;
  const salientes = dataset.flujos.filter((flujo) => flujo.origenId === provinciaId);
  const total = salientes.reduce((sum, flujo) => sum + flujo.monto, 0);
  if (total <= 0) return null;
  const local = salientes
    .filter((flujo) => flujo.destinoId === provinciaId)
    .reduce((sum, flujo) => sum + flujo.monto, 0);
  return share(local, total);
}

/**
 * Punto de entrada: convierte el dataset + territorio + filtros en todo lo que
 * la vista necesita renderizar.
 */
export function analyzeProcurement(
  dataset: SicopDataset,
  selection: TerritorySelection,
  filters: ProcurementFilterState
): ProcurementAnalysis {
  const scope = resolveScope(dataset, selection);
  const lensLabel = LENS_LABELS[filters.lens];

  // Totales del territorio activo según la lente elegida.
  let monto = 0;
  let lineas = 0;
  let entidades = 0;

  if (scope.level === 'nacional') {
    for (const provincia of dataset.provincias) {
      const values = aggregateForLens(provincia, filters.lens);
      monto += values.monto;
      lineas += values.lineas;
      entidades += values.entidades;
    }
  } else if (scope.level === 'provincia') {
    const provincia = dataset.provincias.find((item) => item.provinciaId === scope.provinciaId);
    if (provincia) ({ monto, lineas, entidades } = aggregateForLens(provincia, filters.lens));
  } else {
    const canton = dataset.cantones.find(
      (item) => item.provinciaId === scope.provinciaId && item.cantonId === scope.cantonId
    );
    if (canton) ({ monto, lineas, entidades } = aggregateForLens(canton, filters.lens));

    if (scope.level === 'distrito' && filters.lens === 'comprador') {
      const distrito = dataset.distritos.find(
        (item) =>
          item.provinciaId === scope.provinciaId &&
          item.cantonId === scope.cantonId &&
          item.distritoId === scope.distritoId
      );
      if (distrito) {
        monto = distrito.monto;
        lineas = distrito.lineas;
        entidades = distrito.entidades;
      }
    }
  }

  const nacional = dataset.provincias.reduce(
    (sum, provincia) => sum + aggregateForLens(provincia, filters.lens).monto,
    0
  );
  const retencionLocal = computeRetencionLocal(dataset, scope.provinciaId);

  const indicators: ProcurementIndicator[] = [
    {
      key: 'monto',
      label: 'Dinero comprometido',
      value: formatCrcCompact(monto),
      helper: `${formatCrc(monto)} · contado según ${lensLabel.short.toLowerCase()}`,
    },
    {
      key: 'lineas',
      label: 'Compras adjudicadas',
      value: formatInteger(lineas),
      helper: `Repartidas entre ${formatInteger(entidades)} ${
        filters.lens === 'comprador'
          ? plural(entidades, 'institución', 'instituciones')
          : plural(entidades, 'empresa', 'empresas')
      }`,
    },
    {
      key: 'participacion',
      label: 'Parte del total del país',
      value: formatPercent(share(monto, nacional)),
      helper:
        filters.lens === 'comprador'
          ? `El país entero suma ${formatCrcCompact(nacional)}`
          : `Contando solo empresas con dirección registrada, el país suma ${formatCrcCompact(nacional)}`,
    },
    {
      key: 'ticket',
      label: 'Promedio por compra',
      value: formatCrcCompact(lineas > 0 ? monto / lineas : 0),
      helper: 'Cuánto cuesta en promedio cada compra adjudicada',
    },
  ];

  // Este dato solo se puede calcular a nivel de provincia, así que se nombra la
  // provincia de forma explícita para no dar a entender que es del cantón o del
  // distrito que el usuario tenga seleccionado.
  const provinciaDelAlcance = dataset.provincias.find(
    (item) => item.provinciaId === scope.provinciaId
  )?.provincia;

  if (retencionLocal !== null && provinciaDelAlcance && filters.lens === 'comprador') {
    indicators.push({
      key: 'retencion',
      label: `Se queda en ${provinciaDelAlcance}`,
      value: formatPercent(retencionLocal),
      helper: `De todo el egreso de las instituciones de ${provinciaDelAlcance}, cuánto va a empresas de ${provinciaDelAlcance}`,
    });
  }

  const { trend, isPartial } = buildTrend(dataset, scope);
  const { flows, title: flowsTitle } = buildFlows(dataset, scope);
  const { entities, title: entitiesTitle } = buildEntities(dataset, scope, filters);

  const sorted = [...entities].sort((a, b) =>
    filters.sortBy === 'lineas' ? b.lineas - a.lineas : b.monto - a.monto
  );

  return {
    scope,
    indicators,
    ranking: buildRanking(dataset, scope, filters.lens),
    trend,
    trendIsPartial: isPartial,
    flows,
    flowsTitle,
    types: buildTypes(dataset, scope),
    entities: sorted,
    entitiesTitle,
    totalMonto: monto,
    totalLineas: lineas,
    retencionLocal,
    retencionProvincia: provinciaDelAlcance ?? null,
  };
}
