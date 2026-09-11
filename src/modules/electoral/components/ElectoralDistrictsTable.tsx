import React, { useState, useMemo, useEffect } from 'react';
import { Search, ChevronDown, List } from 'lucide-react';
import type { ElectoralDistrictAggregate } from '../types';
import { useTerritoryContext } from '../../../context/TerritoryContext';
import { Card } from '../../../components/common/Card';
import { formatInteger } from '../../publicData/services/publicDataAnalytics';

interface ElectoralDistrictsTableProps {
  data: ElectoralDistrictAggregate[];
}

type SortField = 'name' | 'voters' | 'percentage';

export const ElectoralDistrictsTable: React.FC<ElectoralDistrictsTableProps> = ({ data }) => {
  const { selection } = useTerritoryContext();
  const selectedDistrict = selection.district;
  
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<SortField>('voters');
  const [visibleCount, setVisibleCount] = useState(15);

  // Reset pagination when data or search/sort changes
  useEffect(() => {
    setVisibleCount(15);
  }, [data, search, sortBy]);

  const normalize = (str: string) => 
    str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();

  const filteredAndSortedData = useMemo(() => {
    if (data.length === 0) return [];

    let processed = [...data];

    if (search) {
      const normalizedSearch = normalize(search);
      processed = processed.filter(d => normalize(d.district).includes(normalizedSearch));
    }

    processed.sort((a, b) => {
      if (sortBy === 'name') {
        return a.district.localeCompare(b.district);
      } else if (sortBy === 'voters') {
        return b.registeredVoters - a.registeredVoters;
      } else if (sortBy === 'percentage') {
        return b.cantonPercentage - a.cantonPercentage;
      }
      return 0;
    });

    return processed;
  }, [data, search, sortBy]);

  if (data.length === 0) return null;

  const displayData = filteredAndSortedData.slice(0, visibleCount);
  const remaining = filteredAndSortedData.length - visibleCount;
  const hasMore = remaining > 0;

  return (
    <Card
      header={
        <div className="area-header">
          <h3 className="area-title">Tabla de Detalle por Distrito Electoral</h3>
          <span className="area-tag">
            <List className="area-tag__icon" /> {formatInteger(filteredAndSortedData.length)} en la lista
          </span>
        </div>
      }
    >
      <div className="filter-bar mb-4">
        <div className="filter-control filter-control--search">
          <label className="filter-control__label" htmlFor="electoral-search">
            Buscar:
          </label>
          <div className="filter-search">
            <Search className="filter-search__icon" />
            <input
              id="electoral-search"
              type="text"
              placeholder="Nombre del distrito..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="filter-search__input"
            />
          </div>
        </div>

        <div className="filter-control filter-control--sort">
          <label className="filter-control__label" htmlFor="electoral-sort">
            Ordenar por:
          </label>
          <select
            id="electoral-sort"
            className="filter-select"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortField)}
          >
            <option value="voters">Electores (Mayor a menor)</option>
            <option value="percentage">% del Cantón (Mayor a menor)</option>
            <option value="name">Nombre (A-Z)</option>
          </select>
        </div>
      </div>

      <div className="entity-table__scroll">
        <div className="entity-table">
          <table>
            <thead>
              <tr>
                <th scope="col">Distrito Electoral</th>
                <th scope="col" className="right">Electores Registrados</th>
                <th scope="col" className="right">% del Cantón</th>
              </tr>
            </thead>
            <tbody>
              {displayData.map((district) => {
                const isSelected = selectedDistrict && normalize(selectedDistrict.name) === normalize(district.district);
                
                return (
                  <tr 
                    key={district.district} 
                    className={isSelected ? 'ranking__row--selected' : ''}
                    style={isSelected ? { backgroundColor: 'var(--bg-surface-alt)' } : undefined}
                  >
                    <td>
                      <span className="entity-table__name">
                        {district.district}
                        {isSelected && <span className="ranking__tag" style={{ marginLeft: '8px' }}>el que elegiste</span>}
                      </span>
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
              {displayData.length === 0 && (
                <tr>
                  <td colSpan={3} className="text-center py-4 text-slate-500">
                    No se encontraron distritos que coincidan con la búsqueda.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {hasMore && (
        <div style={{ display: 'flex', marginTop: '1rem' }}>
          <button 
            className="entity-table__more"
            onClick={() => setVisibleCount(v => v + 15)}
          >
            <ChevronDown className="entity-table__more-icon" />
            Ver 15 más (faltan {remaining})
          </button>
        </div>
      )}
    </Card>
  );
};
