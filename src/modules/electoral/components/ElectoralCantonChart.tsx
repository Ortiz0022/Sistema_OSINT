import React from 'react';
import { useTerritoryContext } from '../../../context/TerritoryContext';

export interface CantonAggregate {
  name: string;
  voters: number;
}

interface ElectoralCantonChartProps {
  data: CantonAggregate[];
}

export const ElectoralCantonChart: React.FC<ElectoralCantonChartProps> = ({ data }) => {
  const { selection } = useTerritoryContext();
  const selectedCanton = selection.canton;
  
  if (data.length === 0) return null;

  // Find max voters for scaling
  const maxVoters = Math.max(...data.map(c => c.voters));

  const normalize = (str: string) => 
    str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();

  return (
    <div className="electoral-section">
      <h3 className="electoral-section-title mb-1">
        Padrón electoral por cantón de la provincia
      </h3>
      <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
        Permite comparar la cantidad de electores registrados del cantón seleccionado con los demás cantones de su provincia.
      </p>
      
      <div className="electoral-chart-list">
        {data.map(canton => {
          const isSelected = selectedCanton && normalize(selectedCanton.name) === normalize(canton.name);
          const percentageOfMax = (canton.voters / maxVoters) * 100;
          
          return (
            <div key={canton.name} className={`electoral-chart-item ${isSelected ? 'active' : ''}`}>
              <div className="electoral-chart-header">
                <span className="electoral-chart-label">
                  {canton.name}
                </span>
                <span className="electoral-chart-value">
                  {canton.voters.toLocaleString('es-CR')} electores
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
