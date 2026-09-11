import React from 'react';
import { MapPin, X, RotateCcw } from 'lucide-react';
import { useLocation } from '../../hooks/useLocation';
import { Dropdown } from './Dropdown';
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

  const handleProvinceChange = (val: string) => {
    void selectProvince(val === '' ? null : val);
  };

  const handleCantonChange = (val: string) => {
    void selectCanton(val === '' ? null : val);
  };

  const handleDistrictChange = (val: string) => {
    selectDistrict(val === '' ? null : val);
  };

  const provinceOptions = [
    { value: '', label: '— Toda Costa Rica —' },
    ...provinces.map((prov) => ({ value: prov.id, label: prov.name })),
  ];

  const cantonOptions = [
    { value: '', label: '— Todos los cantones —' },
    ...cantons.map((cant) => ({ value: cant.id, label: cant.name })),
  ];

  const districtOptions = [
    { value: '', label: '— Todos los distritos —' },
    ...districts.map((dist) => ({ value: dist.id, label: dist.name })),
  ];

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
        <Dropdown
          id="global-province-select"
          value={selectedProvince ? selectedProvince.id : ''}
          onChange={handleProvinceChange}
          options={provinceOptions}
          placeholder={isLoadingProvinces ? 'Cargando provincias...' : '— Toda Costa Rica —'}
          disabled={isLoadingProvinces}
          isLoading={isLoadingProvinces}
          ariaLabel="Seleccionar Provincia"
          enableSearchThreshold={5}
        />

        {/* Selector de Cantón */}
        <Dropdown
          id="global-canton-select"
          value={selectedCanton ? selectedCanton.id : ''}
          onChange={handleCantonChange}
          options={cantonOptions}
          placeholder={
            !selectedProvince
              ? 'Cantón (seleccione provincia)'
              : isLoadingCantons
              ? 'Cargando cantones...'
              : '— Todos los cantones —'
          }
          disabled={!selectedProvince || isLoadingCantons}
          isLoading={isLoadingCantons}
          ariaLabel="Seleccionar Cantón"
          enableSearchThreshold={8}
        />

        {/* Selector de Distrito */}
        <Dropdown
          id="global-district-select"
          value={selectedDistrict ? selectedDistrict.id : ''}
          onChange={handleDistrictChange}
          options={districtOptions}
          placeholder={
            !selectedCanton
              ? 'Distrito (seleccione cantón)'
              : isLoadingDistricts
              ? 'Cargando distritos...'
              : '— Todos los distritos —'
          }
          disabled={!selectedCanton || isLoadingDistricts}
          isLoading={isLoadingDistricts}
          ariaLabel="Seleccionar Distrito"
          enableSearchThreshold={8}
        />

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
