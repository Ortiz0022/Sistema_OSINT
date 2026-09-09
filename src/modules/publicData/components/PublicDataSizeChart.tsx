import React, { useMemo, useState } from 'react';
import { formatInteger, formatPercent } from '../services/publicDataAnalytics';
import type { TamanoBreakdown } from '../types/publicData.types';

interface PublicDataSizeChartProps {
  breakdown: TamanoBreakdown;
}

type SliceKey = 'micro' | 'pequena' | 'mediana';

const SIZE = 200;
const CENTER = SIZE / 2;
const OUTER_R = 88;
const INNER_R = 56;

const SLICES: { key: SliceKey; label: string; className: string }[] = [
  { key: 'micro', label: 'Micro', className: 'donut__slice--micro' },
  { key: 'pequena', label: 'Pequeña', className: 'donut__slice--pequena' },
  { key: 'mediana', label: 'Mediana', className: 'donut__slice--mediana' },
];

/** Punto sobre una circunferencia, con 0° arriba (como un reloj). */
function polarPoint(radius: number, angleDeg: number): { x: number; y: number } {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: CENTER + radius * Math.cos(rad), y: CENTER + radius * Math.sin(rad) };
}

/** Path de un gajo de dona entre dos ángulos (en grados, 0-360). */
function donutSlicePath(startAngle: number, endAngle: number): string {
  const largeArc = endAngle - startAngle > 180 ? 1 : 0;
  const outerStart = polarPoint(OUTER_R, startAngle);
  const outerEnd = polarPoint(OUTER_R, endAngle);
  const innerEnd = polarPoint(INNER_R, endAngle);
  const innerStart = polarPoint(INNER_R, startAngle);
  return [
    `M ${outerStart.x} ${outerStart.y}`,
    `A ${OUTER_R} ${OUTER_R} 0 ${largeArc} 1 ${outerEnd.x} ${outerEnd.y}`,
    `L ${innerEnd.x} ${innerEnd.y}`,
    `A ${INNER_R} ${INNER_R} 0 ${largeArc} 0 ${innerStart.x} ${innerStart.y}`,
    'Z',
  ].join(' ');
}

/**
 * Gráfico de dona: composición Micro / Pequeña / Mediana del territorio activo.
 *
 * Es el único dato de esta página con exactamente tres categorías que suman
 * el 100 %, por lo que se presta mejor a una dona que a una barra: la forma
 * comunica de un vistazo qué tan repartido (o concentrado) está el territorio,
 * algo que una lista de barras no transmite igual de rápido.
 */
export const PublicDataSizeChart: React.FC<PublicDataSizeChartProps> = ({ breakdown }) => {
  const [hovered, setHovered] = useState<SliceKey | null>(null);
  const total = breakdown.micro + breakdown.pequena + breakdown.mediana;

  const geometry = useMemo(() => {
    if (total === 0) return [];
    let angle = 0;
    return SLICES.map((slice) => {
      const value = breakdown[slice.key];
      const sweep = (value / total) * 360;
      const path = value > 0 ? donutSlicePath(angle, angle + sweep) : null;
      angle += sweep;
      return { ...slice, value, path };
    });
  }, [breakdown, total]);

  if (total === 0) {
    return <p className="chart-empty">No hay empresas registradas en este territorio.</p>;
  }

  const active = hovered ? geometry.find((slice) => slice.key === hovered) : null;

  return (
    <div className="donut">
      <svg
        className="donut__svg"
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        role="img"
        aria-label={`Composición por tamaño: ${geometry
          .map((slice) => `${slice.label} ${formatPercent((slice.value / total) * 100)}`)
          .join(', ')}`}
      >
        {geometry.map(
          (slice) =>
            slice.path && (
              <path
                key={slice.key}
                d={slice.path}
                className={`donut__slice ${slice.className}${hovered === slice.key ? ' donut__slice--active' : ''}`}
                onMouseEnter={() => setHovered(slice.key)}
                onMouseLeave={() => setHovered(null)}
              />
            )
        )}
        <text x={CENTER} y={CENTER - 6} textAnchor="middle" className="donut__center-value">
          {active ? formatInteger(active.value) : formatInteger(total)}
        </text>
        <text x={CENTER} y={CENTER + 16} textAnchor="middle" className="donut__center-label">
          {active ? active.label : 'empresas'}
        </text>
      </svg>

      <ul className="donut__legend" role="list">
        {geometry.map((slice) => (
          <li
            key={slice.key}
            className={`donut__legend-item${hovered === slice.key ? ' donut__legend-item--active' : ''}`}
            onMouseEnter={() => setHovered(slice.key)}
            onMouseLeave={() => setHovered(null)}
          >
            <span className={`donut__swatch ${slice.className}`} />
            <span className="donut__legend-label">{slice.label}</span>
            <span className="donut__legend-value">
              {formatInteger(slice.value)} · {formatPercent((slice.value / total) * 100)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default PublicDataSizeChart;
