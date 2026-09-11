import React, { useState } from 'react';
import { Layers } from 'lucide-react';
import type { ElectoralDistrictAggregate } from '../types';
import { useTerritoryContext } from '../../../context/TerritoryContext';
import { Card } from '../../../components/common/Card';

interface ElectoralDistrictsChartProps {
  data: ElectoralDistrictAggregate[];
  isExpanded?: boolean;
  onToggleExpand?: (expanded: boolean) => void;
}

export const ElectoralDistrictsChart: React.FC<ElectoralDistrictsChartProps> = ({ 
  data,
  isExpanded = false,
  onToggleExpand 
}) => {
  const { selection } = useTerritoryContext();
  const selectedDistrict = selection.district;
  const [hovered, setHovered] = useState<string | null>(null);
  
  if (data.length === 0) return null;

  const totalVoters = data.reduce((acc, curr) => acc + curr.registeredVoters, 0);
  const maxVoters = Math.max(...data.map(d => d.registeredVoters));

  // Sort data descending for the chart
  const sortedData = [...data].sort((a, b) => b.registeredVoters - a.registeredVoters);

  const normalize = (str: string) => 
    str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();

  // Top 10 logic
  let displayData = sortedData;
  if (!isExpanded && sortedData.length > 10) {
    displayData = sortedData.slice(0, 10);
    // Ensure selected district is in the list
    if (selectedDistrict) {
      const selectedNormalized = normalize(selectedDistrict.name);
      const isIncluded = displayData.some(d => normalize(d.district) === selectedNormalized);
      if (!isIncluded) {
        const selectedObj = sortedData.find(d => normalize(d.district) === selectedNormalized);
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
            <h3 className="area-title">Distribución por Distrito Electoral</h3>
            <span className="area-tag" style={{ width: 'fit-content' }}>
              <Layers className="area-tag__icon" /> Cantidad de electores
            </span>
          </div>
          {sortedData.length > 10 && (
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
        {displayData.map(district => {
          const isSelected = selectedDistrict && normalize(selectedDistrict.name) === normalize(district.district);
          const percentageOfMax = (district.registeredVoters / maxVoters) * 100;
          const isHovered = hovered === district.district;
          
          return (
            <li
              key={district.district}
              className={`ranking__row${isSelected ? ' ranking__row--selected' : ''}`}
              onMouseEnter={() => setHovered(district.district)}
              onMouseLeave={() => setHovered(null)}
              onFocus={() => setHovered(district.district)}
              onBlur={() => setHovered(null)}
              tabIndex={0}
            >
              <div className="ranking__head">
                <span className="ranking__label">
                  {district.district}
                  {isSelected && <span className="ranking__tag">el que elegiste</span>}
                </span>
                <span className="ranking__value">{district.registeredVoters.toLocaleString('es-CR')}</span>
              </div>

              <div className="ranking__track">
                <div className="ranking__bar" style={{ width: `${percentageOfMax}%` }} />
              </div>

              <span className="ranking__meta">{district.cantonPercentage}% del cantón</span>

              {isHovered && (
                <div className="chart-tooltip" role="tooltip">
                  <strong>{district.district}</strong>
                  <span>{district.registeredVoters.toLocaleString('es-CR')} electores registrados</span>
                  <span>{district.cantonPercentage}% del total cantonal</span>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </Card>
  );
};
