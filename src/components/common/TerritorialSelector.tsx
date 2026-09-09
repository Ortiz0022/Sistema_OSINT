import React from 'react';
import { MapPin, X, Loader2, RotateCcw } from 'lucide-react';
import { useLocation } from '../../hooks/useLocation';
import './TerritorialSelector.css';

interface TerritorialSelectorProps {
  compact?: boolean;
  className?: string;
}

export const TerritorialSelector: React.FC<TerritorialSelectorProps> = ({
  compact = false,
  className = '',
}) => {
  const {
    selectedProvince,
    selectedCanton,
    selectedDistrict,
    provinces,
    cantons,
    districts,
    isLoadingProvinces,
    isLoadingCantons,
    isLoadingDistricts,
    error,
    selectProvince,
    selectCanton,
    selectDistrict,
    clearTerritory,
    retryProvinces,
  } = useLocation();

  const handleProvinceChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    void selectProvince(val === '' ? null : val);
  };

  const handleCantonChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    void selectCanton(val === '' ? null : val);
  };

  const handleDistrictChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    selectDistrict(val === '' ? null : val);
  };

  const hasSelection = Boolean(selectedProvince || selectedCanton || selectedDistrict);

  if (error) {
    return (
      <div className={`territorial-selector territorial-selector--error ${className}`}>
        <span className="selector-error__text">{error}</span>
        <button
          type="button"
          onClick={() => { void retryProvinces(); }}
          className="selector-error__retry"
          title="Reintentar cargar provincias"
        >
          <RotateCcw className="selector-error__retry-icon" />
          <span>Reintentar</span>
        </button>
      </div>
    );
  }

  return (
    <div
      className={`territorial-selector ${compact ? 'territorial-selector--compact' : ''} ${className}`}
      role="region"
      aria-label="Selector Territorial Global de Costa Rica"
    >
      <div className="territorial-selector__badge" title="Filtro Territorial Activo">
        <MapPin className="territorial-selector__icon" />
        <span className="territorial-selector__tag">Territorio:</span>
      </div>

      <div className="territorial-selector__fields">
        {/* Selector de Provincia */}
        <div className="select-wrapper">
          <select
            id="global-province-select"
            value={selectedProvince ? selectedProvince.id : ''}
            onChange={handleProvinceChange}
            disabled={isLoadingProvinces}
            aria-label="Seleccionar Provincia"
            className="selector-input"
          >
            <option value="">
              {isLoadingProvinces ? 'Cargando provincias...' : '— Toda Costa Rica —'}
            </option>
            {provinces.map((prov) => (
              <option key={prov.id} value={prov.id}>
                {prov.name}
              </option>
            ))}
          </select>
          {isLoadingProvinces && <Loader2 className="select-spinner" />}
        </div>

        {/* Selector de Cantón */}
        <div className="select-wrapper">
          <select
            id="global-canton-select"
            value={selectedCanton ? selectedCanton.id : ''}
            onChange={handleCantonChange}
            disabled={!selectedProvince || isLoadingCantons}
            aria-label="Seleccionar Cantón"
            className="selector-input"
          >
            <option value="">
              {!selectedProvince
                ? 'Cantón (seleccione provincia)'
                : isLoadingCantons
                ? 'Cargando cantones...'
                : '— Todos los cantones —'}
            </option>
            {cantons.map((cant) => (
              <option key={cant.id} value={cant.id}>
                {cant.name}
              </option>
            ))}
          </select>
          {isLoadingCantons && <Loader2 className="select-spinner" />}
        </div>

        {/* Selector de Distrito */}
        <div className="select-wrapper">
          <select
            id="global-district-select"
            value={selectedDistrict ? selectedDistrict.id : ''}
            onChange={handleDistrictChange}
            disabled={!selectedCanton || isLoadingDistricts}
            aria-label="Seleccionar Distrito"
            className="selector-input"
          >
            <option value="">
              {!selectedCanton
                ? 'Distrito (seleccione cantón)'
                : isLoadingDistricts
                ? 'Cargando distritos...'
                : '— Todos los distritos —'}
            </option>
            {districts.map((dist) => (
              <option key={dist.id} value={dist.id}>
                {dist.name}
              </option>
            ))}
          </select>
          {isLoadingDistricts && <Loader2 className="select-spinner" />}
        </div>

        {/* Botón de limpiar selección */}
        {hasSelection && (
          <button
            type="button"
            onClick={clearTerritory}
            className="selector-clear-btn"
            title="Restablecer filtro a nivel nacional"
            aria-label="Restablecer a nivel nacional"
          >
            <X className="selector-clear-icon" />
            <span className="selector-clear-text">Limpiar</span>
          </button>
        )}
      </div>
    </div>
  );
};

export default TerritorialSelector;
