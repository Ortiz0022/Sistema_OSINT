import React, { useMemo, useState } from 'react';
import { formatCrc, formatCrcCompact, formatInteger, formatMonth } from '../services/procurementAnalytics';
import type { TrendPoint } from '../types/procurement.types';

interface ProcurementTrendProps {
  points: TrendPoint[];
  /** Meses cuyo archivo SICOP publicó vacío. */
  emptyPeriods: string[];
}

const WIDTH = 760;
const HEIGHT = 240;
// El eje muestra montos escritos completos ("₡57 mil millones"), por eso el
// margen izquierdo es amplio.
const PADDING = { top: 16, right: 16, bottom: 30, left: 118 };

/**
 * Serie mensual del monto adjudicado (una sola serie, por eso sin leyenda).
 *
 * Los meses cuyo archivo mensual SICOP publicó vacío quedan marcados en el
 * gráfico: sus adjudicaciones sí aparecen, pero llegaron en publicaciones
 * posteriores, y esa diferencia de procedencia debe ser visible.
 */
export const ProcurementTrend: React.FC<ProcurementTrendProps> = ({ points, emptyPeriods }) => {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const emptyMonths = useMemo(
    () => new Set(emptyPeriods.map((period) => `${period.slice(0, 4)}-${period.slice(4)}`)),
    [emptyPeriods]
  );

  const geometry = useMemo(() => {
    if (points.length === 0) return null;

    const innerWidth = WIDTH - PADDING.left - PADDING.right;
    const innerHeight = HEIGHT - PADDING.top - PADDING.bottom;
    const max = Math.max(...points.map((point) => point.monto), 1);

    const x = (index: number): number =>
      points.length === 1
        ? PADDING.left + innerWidth / 2
        : PADDING.left + (index / (points.length - 1)) * innerWidth;
    const y = (value: number): number => PADDING.top + innerHeight - (value / max) * innerHeight;

    const coords = points.map((point, index) => ({ ...point, cx: x(index), cy: y(point.monto) }));
    const line = coords.map((point, index) => `${index === 0 ? 'M' : 'L'}${point.cx} ${point.cy}`).join(' ');
    const area = `${line} L${coords[coords.length - 1].cx} ${PADDING.top + innerHeight} L${coords[0].cx} ${
      PADDING.top + innerHeight
    } Z`;

    const ticks = [0, 0.5, 1].map((ratio) => ({ value: max * ratio, y: y(max * ratio) }));

    return { coords, line, area, max, ticks, innerWidth };
  }, [points]);

  if (!geometry) {
    return <p className="chart-empty">No hay meses completos para graficar en este territorio.</p>;
  }

  const { coords, line, area, ticks } = geometry;
  const active = activeIndex !== null ? coords[activeIndex] : null;
  const labelStep = Math.max(1, Math.ceil(coords.length / 8));

  const handleMove = (event: React.MouseEvent<SVGSVGElement>): void => {
    const bounds = event.currentTarget.getBoundingClientRect();
    const ratio = (event.clientX - bounds.left) / bounds.width;
    const svgX = ratio * WIDTH;
    let nearest = 0;
    let best = Number.POSITIVE_INFINITY;
    coords.forEach((point, index) => {
      const distance = Math.abs(point.cx - svgX);
      if (distance < best) {
        best = distance;
        nearest = index;
      }
    });
    setActiveIndex(nearest);
  };

  return (
    <div className="trend">
      <svg
        className="trend__svg"
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        role="img"
        aria-label={`Dinero comprometido en compras del Estado, mes a mes, de ${formatMonth(
          points[0].mes
        )} a ${formatMonth(points[points.length - 1].mes)}`}
        onMouseMove={handleMove}
        onMouseLeave={() => setActiveIndex(null)}
      >
        {ticks.map((tick) => (
          <g key={tick.y}>
            <line
              className="trend__grid"
              x1={PADDING.left}
              x2={WIDTH - PADDING.right}
              y1={tick.y}
              y2={tick.y}
            />
            <text className="trend__tick" x={PADDING.left - 10} y={tick.y + 4} textAnchor="end">
              {formatCrcCompact(tick.value)}
            </text>
          </g>
        ))}

        <path className="trend__area" d={area} />
        <path className="trend__line" d={line} />

        {coords.map((point, index) =>
          emptyMonths.has(point.mes) ? (
            <circle key={point.mes} className="trend__gap" cx={point.cx} cy={point.cy} r={4.5} />
          ) : index % labelStep === 0 || index === coords.length - 1 ? (
            <circle key={point.mes} className="trend__dot" cx={point.cx} cy={point.cy} r={4.5} />
          ) : null
        )}

        {active && (
          <>
            <line
              className="trend__crosshair"
              x1={active.cx}
              x2={active.cx}
              y1={PADDING.top}
              y2={HEIGHT - PADDING.bottom}
            />
            <circle className="trend__dot trend__dot--active" cx={active.cx} cy={active.cy} r={6} />
          </>
        )}

        {coords.map((point, index) =>
          index % labelStep === 0 || index === coords.length - 1 ? (
            <text
              key={`label-${point.mes}`}
              className="trend__tick"
              x={point.cx}
              y={HEIGHT - PADDING.bottom + 18}
              textAnchor="middle"
            >
              {formatMonth(point.mes)}
            </text>
          ) : null
        )}
      </svg>

      {active && (
        <div
          className="chart-tooltip chart-tooltip--floating"
          style={{ left: `${(active.cx / WIDTH) * 100}%` }}
          role="tooltip"
        >
          <strong>{formatMonth(active.mes)}</strong>
          <span>{formatCrc(active.monto)}</span>
          <span>{formatInteger(active.lineas)} compras adjudicadas</span>
          {emptyMonths.has(active.mes) && (
            <span className="chart-tooltip__warn">
              SICOP publicó el archivo de este mes vacío: estas compras aparecieron después
            </span>
          )}
        </div>
      )}
    </div>
  );
};

export default ProcurementTrend;
