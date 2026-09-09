import React, { useMemo } from 'react';
import { Users, MapPin, TrendingUp, AlertCircle, Calendar } from 'lucide-react';
import { useElectoralData } from '../hooks/useElectoralData';
import { useTerritoryContext } from '../../../context/TerritoryContext';
import { ElectoralDistrictsChart } from './ElectoralDistrictsChart';
import { ElectoralDistrictsTable } from './ElectoralDistrictsTable';

export const ElectoralOverview: React.FC = () => {
  const { data, loading, error } = useElectoralData();
  const { selection } = useTerritoryContext();
  const { province: selectedProvince, canton: selectedCanton, district: selectedDistrict } = selection;

  // Helper to normalize strings for comparison (remove accents)
  const normalize = (str: string) => 
    str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();

  // Filter data based on selected territory
  const filteredData = useMemo(() => {
    if (!data || !selectedProvince || !selectedCanton) return [];
    
    return data.territories.filter(
      (t) => 
        normalize(t.province) === normalize(selectedProvince.name) &&
        normalize(t.canton) === normalize(selectedCanton.name)
    );
  }, [data, selectedProvince, selectedCanton]);

  if (loading) {
    return (
      <div className="electoral-loader">
        <div className="electoral-spinner"></div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="electoral-error">
        <AlertCircle size={24} />
        <p>Error al cargar los datos del padrón electoral.</p>
      </div>
    );
  }

  // Si no hay cantón seleccionado, pedirle al usuario que seleccione uno
  if (!selectedProvince || !selectedCanton) {
    return (
      <div className="electoral-empty-state">
        <MapPin className="electoral-empty-icon" />
        <h3 className="electoral-empty-title">
          Seleccione un territorio
        </h3>
        <p className="electoral-empty-text">
          Por favor seleccione una provincia y un cantón en el selector superior para ver los datos electorales.
        </p>
      </div>
    );
  }

  // Si no hay datos procesados para el territorio seleccionado
  if (filteredData.length === 0) {
    return (
      <div className="electoral-empty-state">
        <AlertCircle className="electoral-empty-icon" />
        <h3 className="electoral-empty-title">
          Actualmente no hay datos procesados para este territorio.
        </h3>
        <p className="electoral-empty-text">
          Los resultados mostrados son estadísticas agregadas extraídas de los archivos oficiales. 
          Si no ve datos aquí, es probable que no se haya procesado el archivo ZIP correspondiente a esta región.
        </p>
      </div>
    );
  }

  // Calculate aggregates for the Canton
  const totalVoters = filteredData.reduce((acc, curr) => acc + curr.registeredVoters, 0);
  const districtCount = filteredData.length;
  
  // District with max voters
  const maxDistrict = [...filteredData].sort((a, b) => b.registeredVoters - a.registeredVoters)[0];

  // Selected district info (if any)
  const selectedDistrictData = selectedDistrict 
    ? filteredData.find(d => normalize(d.district) === normalize(selectedDistrict.name))
    : null;

  return (
    <div className="electoral-container">
      
      {/* Resumen Principal */}
      <div className="electoral-summary-grid">
        {/* Card 1: Total Electores */}
        <div className="electoral-card">
          <div className="electoral-card-header">
            <Users className="electoral-card-icon blue" />
            <span>Electores registrados</span>
          </div>
          <p className="electoral-card-value">
            {totalVoters.toLocaleString('es-CR')}
          </p>
          
          <div className="electoral-tooltip">
            Cantidad de personas inscritas en el Padrón Nacional Electoral para el territorio mostrado.
          </div>
        </div>

        {/* Card 2: Distritos Electorales */}
        <div className="electoral-card">
          <div className="electoral-card-header">
            <MapPin className="electoral-card-icon emerald" />
            <span>Distritos Electorales</span>
          </div>
          <p className="electoral-card-value">
            {districtCount}
          </p>
          
          <div className="electoral-tooltip">
            Cantidad de distritos electorales habilitados en este cantón.
          </div>
        </div>

        {/* Card 3: Distrito con mayor padrón */}
        <div className="electoral-card">
          <div className="electoral-card-header">
            <TrendingUp className="electoral-card-icon amber" />
            <span>Mayor Padrón</span>
          </div>
          <p className="electoral-card-value truncate" title={maxDistrict.district}>
            {maxDistrict.district}
          </p>
          <p className="electoral-card-subtitle">
            {maxDistrict.cantonPercentage}% del cantón
          </p>
          
          <div className="electoral-tooltip">
            Distrito electoral con la mayor cantidad de personas inscritas para votar dentro del cantón.
          </div>
        </div>

        {/* Card 4: Distrito Seleccionado */}
        {selectedDistrictData ? (
          <div className="electoral-card selected">
            <div className="electoral-card-header">
              <MapPin className="electoral-card-icon" />
              <span className="truncate" title={selectedDistrictData.district}>{selectedDistrictData.district}</span>
            </div>
            <p className="electoral-card-value">
              {selectedDistrictData.registeredVoters.toLocaleString('es-CR')}
            </p>
            <p className="electoral-card-subtitle">
              {selectedDistrictData.cantonPercentage}% del cantón
            </p>
            
            <div className="electoral-tooltip">
              Indica qué proporción del padrón total del cantón corresponde a este distrito electoral.
            </div>
          </div>
        ) : (
          <div className="electoral-empty-state" style={{ minHeight: 'auto', padding: '1.5rem' }}>
            <p className="electoral-empty-text" style={{ fontSize: '0.75rem' }}>
              Seleccione un distrito para ver su detalle específico
            </p>
          </div>
        )}
      </div>

      <div className="electoral-content-grid">
        <ElectoralDistrictsChart data={filteredData} />
        <ElectoralDistrictsTable data={filteredData} />
      </div>

      {/* Metadata Section */}
      <div className="electoral-metadata">
        <div className="electoral-metadata-grid">
          <div className="electoral-metadata-info">
            <p><strong>Fuente:</strong> {data.metadata.source}</p>
            <p><strong>Conjunto de datos:</strong> {data.metadata.dataset}</p>
            <p><strong>Método:</strong> Procesamiento ETL de archivos oficiales ZIP/TXT</p>
          </div>
          
          <div className="electoral-metadata-stats">
            <p className="electoral-metadata-date">
              <Calendar size={16} />
              <span>
                <strong>Procesado:</strong>{' '}
                {new Date(data.metadata.processedAt).toLocaleDateString('es-CR')}
              </span>
            </p>
            <p><strong>Registros procesados:</strong> {data.metadata.recordsProcessed.toLocaleString('es-CR')}</p>
          </div>
        </div>
        
        <div className="electoral-privacy-notice">
          <AlertCircle className="electoral-privacy-icon" />
          <p>
            Los resultados mostrados son estadísticas agregadas. El sistema no almacena ni presenta datos personales del padrón.
          </p>
        </div>
      </div>

    </div>
  );
};
