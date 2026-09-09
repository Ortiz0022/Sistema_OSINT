import React, { useState } from 'react';
import { formatInteger, formatPercent } from '../services/publicDataAnalytics';
import type { PublicDataRankingItem } from '../types/publicData.types';

interface PublicDataRankingProps {
  items: PublicDataRankingItem[];
}

/**
 * Ranking territorial en barras horizontales (cantidad de empresas).
 *
 * Una sola serie (conteo), por lo que no lleva leyenda: el color verde marca
 * únicamente el territorio activo del observatorio, reforzado además con la
 * etiqueta "el que elegiste" para no depender solo del color.
 */
export const PublicDataRanking: React.FC<PublicDataRankingProps> = ({ items }) => {
  const [hovered, setHovered] = useState<string | null>(null);
  const max = items.reduce((peak, item) => Math.max(peak, item.total), 0);

  if (items.length === 0) {
    return <p className="chart-empty">No hay territorios con Pymes activas registradas.</p>;
  }

  return (
    <ul className="ranking" role="list">
      {items.map((item) => {
        const width = max > 0 ? Math.max((item.total / max) * 100, item.total > 0 ? 1.5 : 0) : 0;
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
              <span className="ranking__value">{formatInteger(item.total)}</span>
            </div>

            <div className="ranking__track">
              <div className="ranking__bar" style={{ width: `${width}%` }} />
            </div>

            <span className="ranking__meta">{formatPercent(item.share)} del total</span>

            {isHovered && (
              <div className="chart-tooltip" role="tooltip">
                <strong>{item.label}</strong>
                <span>{formatInteger(item.total)} empresas activas</span>
                <span>{formatPercent(item.share)} del total comparado</span>
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
};

export default PublicDataRanking;
