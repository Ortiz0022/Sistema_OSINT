import React from 'react';
import type { ElectoralDistrictAggregate } from '../types';
import { useTerritoryContext } from '../../../context/TerritoryContext';

interface ElectoralDistrictsChartProps {
  data: ElectoralDistrictAggregate[];
}

export const ElectoralDistrictsChart: React.FC<ElectoralDistrictsChartProps> = ({ data }) => {
  const { selection } = useTerritoryContext();
  const selectedDistrict = selection.district;
  
  if (data.length === 0) return null;

  // Find max voters for scaling
  const maxVoters = Math.max(...data.map(d => d.registeredVoters));

  // Sort data descending for the chart
  const sortedData = [...data].sort((a, b) => b.registeredVoters - a.registeredVoters);

  const normalize = (str: string) => 
    str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();

  return (
    <div className="electoral-section">
      <h3 className="electoral-section-title">
        Distribución de electores por Distrito Electoral
      </h3>
      
      <div className="electoral-chart-list">
        {sortedData.map(district => {
          const isSelected = selectedDistrict && normalize(selectedDistrict.name) === normalize(district.district);
          const percentageOfMax = (district.registeredVoters / maxVoters) * 100;
          
          return (
            <div key={district.district} className={`electoral-chart-item ${isSelected ? 'active' : ''}`}>
              <div className="electoral-chart-header">
                <span className="electoral-chart-label">
                  {district.district}
                </span>
                <span className="electoral-chart-value">
                  {district.registeredVoters.toLocaleString('es-CR')} electores
                </span>
              </div>
              <div className="electoral-chart-bar-bg">
                <div 
                  className="electoral-chart-bar-fill"
                  style={{ width: `${percentageOfMax}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
