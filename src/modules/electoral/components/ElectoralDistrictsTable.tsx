import React from 'react';
import type { ElectoralDistrictAggregate } from '../types';
import { useTerritoryContext } from '../../../context/TerritoryContext';

interface ElectoralDistrictsTableProps {
  data: ElectoralDistrictAggregate[];
}

export const ElectoralDistrictsTable: React.FC<ElectoralDistrictsTableProps> = ({ data }) => {
  const { selection } = useTerritoryContext();
  const selectedDistrict = selection.district;

  if (data.length === 0) return null;

  // Sort by registered voters descending
  const sortedData = [...data].sort((a, b) => b.registeredVoters - a.registeredVoters);

  const normalize = (str: string) => 
    str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();

  return (
    <div className="electoral-table-container">
      <table className="electoral-table">
        <thead>
          <tr>
            <th scope="col">Distrito Electoral</th>
            <th scope="col" className="right">Electores Registrados</th>
            <th scope="col" className="right">% del Cantón</th>
          </tr>
        </thead>
        <tbody>
          {sortedData.map((district) => {
            const isSelected = selectedDistrict && normalize(selectedDistrict.name) === normalize(district.district);
            
            return (
              <tr 
                key={district.district} 
                className={isSelected ? 'active' : ''}
              >
                <td>
                  {district.district}
                </td>
                <td className="right mono">
                  {district.registeredVoters.toLocaleString('es-CR')}
                </td>
                <td className="right mono">
                  {district.cantonPercentage}%
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};
