import React, { useState } from 'react';
import { Layers } from 'lucide-react';
import { useTerritoryContext } from '../../../context/TerritoryContext';
import { Card } from '../../../components/common/Card';

export interface CantonAggregate {
  name: string;
  voters: number;
}

interface ElectoralCantonChartProps {
  data: CantonAggregate[];
  isExpanded?: boolean;
  onToggleExpand?: (expanded: boolean) => void;
}

export const ElectoralCantonChart: React.FC<ElectoralCantonChartProps> = ({ 
  data,
  isExpanded = false,
  onToggleExpand 
}) => {
  const { selection } = useTerritoryContext();
  const selectedCanton = selection.canton;
  const [hovered, setHovered] = useState<string | null>(null);
  
  if (data.length === 0) return null;

  const totalVoters = data.reduce((acc, c) => acc + c.voters, 0);
  const maxVoters = Math.max(...data.map(c => c.voters));

  const normalize = (str: string) => 
    str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();

  // Top 10 logic
  let displayData = data;
  if (!isExpanded && data.length > 10) {
    displayData = data.slice(0, 10);
    // Ensure selected canton is in the list
    if (selectedCanton) {
      const selectedNormalized = normalize(selectedCanton.name);
      const isIncluded = displayData.some(c => normalize(c.name) === selectedNormalized);
      if (!isIncluded) {
        const selectedObj = data.find(c => normalize(c.name) === selectedNormalized);
        if (selectedObj) {
          displayData.push(selectedObj);
        }
      }
    }
  }

  return (
    <Card
      header={
        <div className="area-header">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
            <h3 className="area-title">Padrón Electoral por Cantón</h3>
            <span className="area-tag" style={{ width: 'fit-content' }}>
              <Layers className="area-tag__icon" /> Comparación provincial
            </span>
          </div>
          {data.length > 10 && (
            <button 
              className="electoral-toggle-btn" 
              onClick={() => onToggleExpand?.(!isExpanded)}
            >
              {isExpanded ? 'Ver menos' : 'Ver todos'}
            </button>
          )}
        </div>
      }
    >
      <ul className="ranking" role="list">
        {displayData.map(canton => {
          const isSelected = selectedCanton && normalize(selectedCanton.name) === normalize(canton.name);
          const percentageOfMax = (canton.voters / maxVoters) * 100;
          const share = totalVoters > 0 ? (canton.voters / totalVoters) * 100 : 0;
          const isHovered = hovered === canton.name;
          
          return (
            <li
              key={canton.name}
              className={`ranking__row${isSelected ? ' ranking__row--selected' : ''}`}
              onMouseEnter={() => setHovered(canton.name)}
              onMouseLeave={() => setHovered(null)}
              onFocus={() => setHovered(canton.name)}
              onBlur={() => setHovered(null)}
              tabIndex={0}
            >
              <div className="ranking__head">
                <span className="ranking__label">
                  {canton.name}
                  {isSelected && <span className="ranking__tag">el que elegiste</span>}
                </span>
                <span className="ranking__value">{canton.voters.toLocaleString('es-CR')}</span>
              </div>

              <div className="ranking__track">
                <div className="ranking__bar" style={{ width: `${percentageOfMax}%` }} />
              </div>

              <span className="ranking__meta">{share.toFixed(1)}% del total provincial</span>

              {isHovered && (
                <div className="chart-tooltip" role="tooltip">
                  <strong>{canton.name}</strong>
                  <span>{canton.voters.toLocaleString('es-CR')} electores registrados</span>
                  <span>{share.toFixed(1)}% de la provincia</span>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </Card>
  );
};
