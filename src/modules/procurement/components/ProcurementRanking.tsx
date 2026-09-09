import React, { useState } from 'react';
import { formatCrc, formatCrcCompact, formatInteger, formatPercent } from '../services/procurementAnalytics';
import type { RankingItem } from '../types/procurement.types';

interface ProcurementRankingProps {
  items: RankingItem[];
  /** Cómo llamar a las entidades contadas: "instituciones" o "empresas". */
  entityLabel: string;
}

/**
 * Ranking territorial en barras horizontales.
 *
 * Una sola serie (magnitud), por lo que no lleva leyenda: el color verde marca
 * únicamente el territorio activo del observatorio y esa distinción se refuerza
 * con la etiqueta "el que elegiste", nunca solo con el color.
 */
export const ProcurementRanking: React.FC<ProcurementRankingProps> = ({ items, entityLabel }) => {
  const [hovered, setHovered] = useState<string | null>(null);
  const max = items.reduce((peak, item) => Math.max(peak, item.monto), 0);

  if (items.length === 0) {
    return <p className="chart-empty">No hay territorios con compras registradas.</p>;
  }

  return (
    <ul className="ranking" role="list">
      {items.map((item) => {
        const width = max > 0 ? Math.max((item.monto / max) * 100, item.monto > 0 ? 1.5 : 0) : 0;
        const isHovered = hovered === item.id;

        return (
          <li
            key={item.id}
            className={`ranking__row${item.isSelected ? ' ranking__row--selected' : ''}`}
            onMouseEnter={() => setHovered(item.id)}
            onMouseLeave={() => setHovered(null)}
            onFocus={() => setHovered(item.id)}
            onBlur={() => setHovered(null)}
            tabIndex={0}
          >
            <div className="ranking__head">
              <span className="ranking__label">
                {item.label}
                {item.isSelected && <span className="ranking__tag">el que elegiste</span>}
              </span>
              <span className="ranking__value">{formatCrcCompact(item.monto)}</span>
            </div>

            <div className="ranking__track">
              <div className="ranking__bar" style={{ width: `${width}%` }} />
            </div>

            <span className="ranking__meta">
              {formatPercent(item.share)} del total · {formatInteger(item.lineas)} compras ·{' '}
              {formatInteger(item.entidades)} {entityLabel}
            </span>

            {isHovered && (
              <div className="chart-tooltip" role="tooltip">
                <strong>{item.label}</strong>
                <span>{formatCrc(item.monto)} en total</span>
                <span>{formatInteger(item.lineas)} compras adjudicadas</span>
                <span>
                  {formatInteger(item.entidades)} {entityLabel}
                </span>
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
};

export default ProcurementRanking;
